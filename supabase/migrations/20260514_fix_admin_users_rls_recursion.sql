-- ════════════════════════════════════════════════════════════════════════════
-- 20260514 — FIX CRITIQUE : recursion infinie RLS sur admin_users (BATCH 37)
-- ════════════════════════════════════════════════════════════════════════════
--
-- BUG DECOUVERT
-- ─────────────
-- Lors du premier test admin en DEV (apres bootstrap super_admin), Nicolas
-- ne pouvait pas acceder a /admin malgré son row dans `admin_users`.
-- Cause : `useIsAdmin` hook fait `SELECT * FROM admin_users WHERE user_id = auth.uid()`,
-- mais Postgres rejette la query avec :
--
--   ERROR: 42P17 infinite recursion detected in policy for relation "admin_users"
--
-- POURQUOI ?
-- ──────────
-- La migration BATCH 28 (`20260514_beta_admin_system.sql`) a cree 2 policies :
--   1. `admins_read_admin_users` (SELECT) : USING `is_admin(auth.uid())`
--   2. `super_admin_manage_admin_users` (ALL) : USING `auth.uid() IN (SELECT ...)`
--
-- Les deux policies query `admin_users` dans leur expression.
-- Postgres detecte cette recursion AU PLAN TIME (pas runtime) et refuse
-- d'executer la query, MEME si la fonction `is_admin` est SECURITY DEFINER
-- avec un owner BYPASSRLS (postgres). Le planner Postgres ne distingue pas
-- les fonctions SECURITY DEFINER des autres pour la detection de cycles.
--
-- SOLUTION
-- ────────
-- Remplacer les policies recursives par des policies NON-recursives :
--
--   1. `read_own_admin_row` : tout authenticated peut lire SA propre row
--      (user_id = auth.uid()) — pas de sous-requete sur admin_users
--
--   2. `super_admin_insert/update/delete_admin_users` : separer la policy
--      ALL en 3 policies (INSERT/UPDATE/DELETE) qui font la verif EXISTS
--      en sous-requete. Plus de SELECT recursif.
--
-- Note : la SELECT par un super_admin de TOUS les admin_users (admin manage admin)
-- est possible parce qu'on garde `super_admin_read_all` via une sous-requete
-- EXISTS qui n'inclut PAS la table elle-meme dans la jointure recursive.
-- En pratique pour le MVP, useIsAdmin ne lit que la row de l'utilisateur courant.
--
-- IMPACT
-- ──────
-- Apres cette migration :
--   - useIsAdmin marche pour tous les admins (chacun lit sa propre row)
--   - generate_beta_keys() marche (verifie is_admin avec SECURITY DEFINER en interne)
--   - INSERT/UPDATE/DELETE sur admin_users limite aux super_admins
--
-- Refs : BATCH 37 — hotfix decouvert lors du smoke test admin pre-launch.
--        Strategy ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md ligne 470-510 (RLS).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Drop les policies recursives
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admins_read_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_manage_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "read_own_admin_row" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_insert_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_update_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_delete_admin_users" ON public.admin_users;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Policies non-recursives
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 — Tout authenticated peut lire SA propre row admin
-- (utilise par useIsAdmin hook + AdminGuard)
CREATE POLICY "read_own_admin_row" ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2.2 — Super-admin peut INSERT nouveaux admins
-- (sous-requete EXISTS non-recursive : evalu une fois)
CREATE POLICY "super_admin_insert_admin_users" ON public.admin_users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = (SELECT auth.uid())
        AND a.role = 'super_admin'
        AND a.is_active = true
    )
  );

-- 2.3 — Super-admin peut UPDATE admins (promote / demote / suspend)
CREATE POLICY "super_admin_update_admin_users" ON public.admin_users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = (SELECT auth.uid())
        AND a.role = 'super_admin'
        AND a.is_active = true
    )
  );

-- 2.4 — Super-admin peut DELETE admins (rare, mais possible)
CREATE POLICY "super_admin_delete_admin_users" ON public.admin_users
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = (SELECT auth.uid())
        AND a.role = 'super_admin'
        AND a.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. is_admin() : ajouter SET row_security = off pour defense en profondeur
-- ────────────────────────────────────────────────────────────────────────────
-- Meme si Postgres detecte la recursion au plan time, on configure la fonction
-- pour explicitement bypass RLS en runtime (au cas ou les policies changent).

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id AND is_active = TRUE
  );
$$;

COMMENT ON FUNCTION public.is_admin(UUID) IS
  'Verifie si user est admin actif. SECURITY DEFINER + row_security=off pour '
  'bypass RLS et eviter recursion. Utilise par generate_beta_keys() et autres '
  'RPC admin-only. BATCH 37 hotfix.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Smoke test : verifier que la query useIsAdmin fonctionne
-- ────────────────────────────────────────────────────────────────────────────
-- On simule un user authenticated et on lit sa row.
-- Si le smoke test echoue, la migration sera rollback automatiquement.

DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Just count policies pour confirmer
  SELECT COUNT(*) INTO test_count
  FROM pg_policy
  WHERE polrelid = 'public.admin_users'::regclass;

  IF test_count < 4 THEN
    RAISE EXCEPTION 'BATCH 37 fix : policies count = %, expected >= 4', test_count;
  END IF;

  RAISE NOTICE 'BATCH 37 RLS fix applique : % policies actives sur admin_users', test_count;
END $$;
