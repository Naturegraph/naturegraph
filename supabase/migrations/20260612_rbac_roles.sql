-- RBAC roles Naturegraph (feat/rbac-roles)
--
-- Objectif : professionnaliser la gestion des roles admin.
--   Ajoute deux roles : equipe_produit (staff lecture seule) et developpeur (tag technique sans acces panneau).
--   Rend l'enforcement role-aware au niveau RLS (pas seulement dans l'UI) :
--     - is_admin(u)        -> acces au panneau /admin : roles staff, EXCLUT developpeur
--     - can_moderate(u)    -> ecritures de moderation/beta : super_admin + moderator
--     - is_super_admin(u)  -> gestion des roles, suppression, taxonomie
--   Les lectures restent ouvertes a tout le staff (is_admin), les ecritures destructives
--   sont restreintes (can_moderate / is_super_admin).
--
-- Sans danger : seul super_admin est actif aujourd'hui (dev = 0 admin, prod = 1 super_admin),
-- donc aucun verrouillage possible. Reversible (re-pointer les policies sur is_admin).

-- 1) Etendre la contrainte de role -------------------------------------------------
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_role_check
  CHECK ((role)::text = ANY ((ARRAY[
    'super_admin','moderator','support','equipe_produit','developpeur'
  ])::text[]));

-- 2) Helpers de role (SECURITY DEFINER, search_path fixe, RLS off) ------------------
CREATE OR REPLACE FUNCTION public.current_admin_role(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' SET row_security TO 'off'
AS $$
  SELECT role::text FROM public.admin_users
  WHERE user_id = p_user_id AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' SET row_security TO 'off'
AS $$ SELECT COALESCE(public.current_admin_role(p_user_id) = 'super_admin', FALSE); $$;

CREATE OR REPLACE FUNCTION public.can_moderate(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' SET row_security TO 'off'
AS $$ SELECT COALESCE(public.current_admin_role(p_user_id) IN ('super_admin','moderator'), FALSE); $$;

-- 3) is_admin = acces panneau : staff, mais PAS developpeur -------------------------
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' SET row_security TO 'off'
AS $$
  SELECT COALESCE(
    public.current_admin_role(p_user_id) IN ('super_admin','moderator','support','equipe_produit'),
    FALSE);
$$;

-- 4) Le staff peut lire tout le roster admin (badges de role dans /admin/users) -----
DROP POLICY IF EXISTS admins_read_all_admin_users ON public.admin_users;
CREATE POLICY admins_read_all_admin_users ON public.admin_users
  FOR SELECT USING (public.is_admin(( SELECT auth.uid() )));

-- 5) Le staff peut lire tous les profils dans /admin (sinon les comptes internes -----
--    comme l'admin ou les developpeurs sont invisibles dans la liste utilisateurs).
--    Politique additive : les autres policies de lecture publique restent en place.
DROP POLICY IF EXISTS admins_read_all_profiles ON public.profiles;
CREATE POLICY admins_read_all_profiles ON public.profiles
  FOR SELECT USING (public.is_admin(( SELECT auth.uid() )));

-- 6) Resserrage des ecritures destructives (lectures restent is_admin) --------------

-- moderation_reports : ecritures -> can_moderate (lecture inchangee = is_admin)
DROP POLICY IF EXISTS moderation_reports_admin_update ON public.moderation_reports;
CREATE POLICY moderation_reports_admin_update ON public.moderation_reports
  FOR UPDATE USING (public.can_moderate(( SELECT auth.uid() )));
DROP POLICY IF EXISTS moderation_reports_admin_delete ON public.moderation_reports;
CREATE POLICY moderation_reports_admin_delete ON public.moderation_reports
  FOR DELETE USING (public.can_moderate(( SELECT auth.uid() )));

-- admin_actions : etait ALL=is_admin. Lecture=is_admin, ecritures=can_moderate.
DROP POLICY IF EXISTS admins_manage_admin_actions ON public.admin_actions;
CREATE POLICY admin_actions_read ON public.admin_actions
  FOR SELECT USING (public.is_admin(( SELECT auth.uid() )));
CREATE POLICY admin_actions_insert ON public.admin_actions
  FOR INSERT WITH CHECK (public.can_moderate(( SELECT auth.uid() )));
CREATE POLICY admin_actions_update ON public.admin_actions
  FOR UPDATE USING (public.can_moderate(( SELECT auth.uid() )));
CREATE POLICY admin_actions_delete ON public.admin_actions
  FOR DELETE USING (public.can_moderate(( SELECT auth.uid() )));

-- beta_access_keys : etait ALL=is_admin. Lecture=is_admin, ecritures=can_moderate.
DROP POLICY IF EXISTS admin_only_access_keys ON public.beta_access_keys;
CREATE POLICY beta_keys_read ON public.beta_access_keys
  FOR SELECT USING (public.is_admin(( SELECT auth.uid() )));
CREATE POLICY beta_keys_insert ON public.beta_access_keys
  FOR INSERT WITH CHECK (public.can_moderate(( SELECT auth.uid() )));
CREATE POLICY beta_keys_update ON public.beta_access_keys
  FOR UPDATE USING (public.can_moderate(( SELECT auth.uid() )));
CREATE POLICY beta_keys_delete ON public.beta_access_keys
  FOR DELETE USING (public.can_moderate(( SELECT auth.uid() )));

-- beta_quota_config : ecriture -> can_moderate
DROP POLICY IF EXISTS admin_write_quota ON public.beta_quota_config;
CREATE POLICY admin_write_quota ON public.beta_quota_config
  FOR UPDATE USING (public.can_moderate(( SELECT auth.uid() )));

-- beta_waitlist : ecritures -> can_moderate (lecture inchangee = is_admin)
DROP POLICY IF EXISTS admin_update_waitlist ON public.beta_waitlist;
CREATE POLICY admin_update_waitlist ON public.beta_waitlist
  FOR UPDATE USING (public.can_moderate(( SELECT auth.uid() )));
DROP POLICY IF EXISTS admin_delete_waitlist ON public.beta_waitlist;
CREATE POLICY admin_delete_waitlist ON public.beta_waitlist
  FOR DELETE USING (public.can_moderate(( SELECT auth.uid() )));

-- taxonomy_nodes : ecriture admin -> super_admin uniquement (les seeds passent par service_role)
DROP POLICY IF EXISTS admin_write_taxonomy ON public.taxonomy_nodes;
CREATE POLICY admin_write_taxonomy ON public.taxonomy_nodes
  FOR ALL USING (public.is_super_admin(( SELECT auth.uid() )))
  WITH CHECK (public.is_super_admin(( SELECT auth.uid() )));

-- 7) Attribution directe de role par le super_admin (RPC atomique + audit) ----------

-- Un seul role admin par utilisateur (permet un vrai UPSERT, evite les rows en double).
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_key;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);

-- admin_set_user_role : assigne / change / retire le role d'un utilisateur.
--   p_role IN (...roles...) pour assigner, ou 'none' pour retirer (is_active=false).
--   Seul un super_admin actif peut l'appeler ; un super_admin ne peut pas se retirer
--   son propre super_admin (anti-lockout). SECURITY DEFINER : la logique d'autorisation
--   est dans la fonction, pas seulement dans la RLS.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_target uuid, p_role text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := ( SELECT auth.uid() );
BEGIN
  IF NOT public.is_super_admin(v_actor) THEN
    RAISE EXCEPTION 'forbidden: role super_admin requis';
  END IF;

  IF p_target = v_actor AND p_role <> 'super_admin' THEN
    RAISE EXCEPTION 'interdit: un super_admin ne peut pas retirer son propre acces';
  END IF;

  IF p_role = 'none' THEN
    UPDATE public.admin_users SET is_active = FALSE WHERE user_id = p_target;
    RETURN 'none';
  ELSIF p_role IN ('super_admin','moderator','support','equipe_produit','developpeur') THEN
    INSERT INTO public.admin_users (user_id, role, is_active, created_by)
    VALUES (p_target, p_role, TRUE, v_actor)
    ON CONFLICT (user_id) DO UPDATE
      SET role = EXCLUDED.role, is_active = TRUE;
    RETURN p_role;
  ELSE
    RAISE EXCEPTION 'role invalide: %', p_role;
  END IF;
END;
$$;

-- Note : les helpers (current_admin_role / is_super_admin / can_moderate / is_admin)
-- restent executables par authenticated, car les policies RLS les appellent dans le
-- contexte de l'utilisateur. Ils sont SECURITY DEFINER + search_path fixe (surface reduite).
