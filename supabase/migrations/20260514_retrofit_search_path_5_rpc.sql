-- ════════════════════════════════════════════════════════════════════════════
-- 20260514 — Retrofit SET search_path = public sur 5 RPC (BATCH 43)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Probleme
-- ────────
-- Audit Phase 6 + Supabase advisors `function_search_path_mutable` (5 WARN) :
--
--   - public.claim_beta_access_key has a role mutable search_path
--   - public.release_beta_access_key has a role mutable search_path
--   - public.increment_beta_user_count has a role mutable search_path
--   - public.generate_beta_keys has a role mutable search_path
--   - public.prevent_admin_audit_log_modification has a role mutable search_path
--
-- Risque
-- ──────
-- Une fonction SECURITY DEFINER sans search_path fige peut etre exploitee si
-- un attaquant cree un schema "shadow" + change le search_path session :
-- ses propres tables/fonctions peuvent intercepter les requetes internes.
--
-- Fix (BATCH 43)
-- ──────────────
-- ALTER FUNCTION ... SET search_path = public sur chacune des 5 fonctions.
-- Approche `ALTER` (vs `CREATE OR REPLACE`) :
--   - Pas de risque de drift sur le corps des fonctions
--   - Coherent avec la convention BATCH 37 (is_admin SET search_path + row_security)
--
-- Refs : audit Phase 6 (Section 6.3) + BATCH 43 hardening.

ALTER FUNCTION public.claim_beta_access_key(p_code text) SET search_path = public;
ALTER FUNCTION public.release_beta_access_key(p_key_id uuid) SET search_path = public;
ALTER FUNCTION public.increment_beta_user_count() SET search_path = public;
ALTER FUNCTION public.prevent_admin_audit_log_modification() SET search_path = public;
ALTER FUNCTION public.generate_beta_keys(
  p_batch_number integer,
  p_count integer,
  p_max_uses integer,
  p_expires_days integer,
  p_notes text
) SET search_path = public;

-- Verification
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'claim_beta_access_key',
      'release_beta_access_key',
      'increment_beta_user_count',
      'prevent_admin_audit_log_modification',
      'generate_beta_keys'
    )
    AND p.proconfig::text LIKE '%search_path=public%';

  IF v_count < 5 THEN
    RAISE EXCEPTION 'BATCH 43 fail : seulement % fonctions retrofitted (attendu 5)', v_count;
  END IF;

  RAISE NOTICE 'BATCH 43 OK : 5 fonctions retrofitted avec search_path = public';
END $$;
