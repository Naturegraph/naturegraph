-- RBAC roles, durcissement securite (hotfix V1.2.14)
--
-- Contexte : la migration 20260612_rbac_roles.sql a cree deux policies de lecture
-- (admins_read_all_profiles, admins_read_all_admin_users) en role `public`, qui appellent
-- is_admin(). Or is_admin() n'est pas executable par `anon`. Resultat : un visiteur
-- anonyme recevait "permission denied for function is_admin" en lisant la table profiles
-- (feed public et profils publics casses pour les invites).
--
-- Correctif :
--   1) Restreindre toutes les policies admin au role `authenticated`. anon n'evalue plus
--      aucun helper RBAC -> plus d'erreur de permission. Les lectures publiques (profils
--      publics, catalogue d'especes, quota, insertion waitlist) restent intactes via leurs
--      propres policies, qui ne dependent pas de ces fonctions.
--   2) Reduire la surface RPC : anon ne peut plus appeler les helpers (il n'en evalue
--      plus aucun), et current_admin_role (qui renvoie le role en clair) n'est plus
--      expose du tout, car il n'est appele qu'en interne par les helpers SECURITY DEFINER.
--
-- Sans impact fonctionnel cote staff : un admin authentifie continue d'evaluer is_admin /
-- can_moderate / is_super_admin normalement (defense en profondeur cote RLS conservee).

-- 1) Restreindre les policies admin au role authenticated -----------------------------
ALTER POLICY admins_read_all_profiles ON public.profiles TO authenticated;
ALTER POLICY admins_read_all_admin_users ON public.admin_users TO authenticated;

ALTER POLICY admin_actions_read ON public.admin_actions TO authenticated;
ALTER POLICY admin_actions_insert ON public.admin_actions TO authenticated;
ALTER POLICY admin_actions_update ON public.admin_actions TO authenticated;
ALTER POLICY admin_actions_delete ON public.admin_actions TO authenticated;

ALTER POLICY beta_keys_read ON public.beta_access_keys TO authenticated;
ALTER POLICY beta_keys_insert ON public.beta_access_keys TO authenticated;
ALTER POLICY beta_keys_update ON public.beta_access_keys TO authenticated;
ALTER POLICY beta_keys_delete ON public.beta_access_keys TO authenticated;

ALTER POLICY admin_write_quota ON public.beta_quota_config TO authenticated;

ALTER POLICY admin_read_waitlist ON public.beta_waitlist TO authenticated;
ALTER POLICY admin_update_waitlist ON public.beta_waitlist TO authenticated;
ALTER POLICY admin_delete_waitlist ON public.beta_waitlist TO authenticated;

ALTER POLICY moderation_reports_read ON public.moderation_reports TO authenticated;
ALTER POLICY moderation_reports_admin_update ON public.moderation_reports TO authenticated;
ALTER POLICY moderation_reports_admin_delete ON public.moderation_reports TO authenticated;

ALTER POLICY admin_write_taxonomy ON public.taxonomy_nodes TO authenticated;

-- 2) Reduction de surface RPC ---------------------------------------------------------
-- current_admin_role : appele uniquement en interne par les helpers, plus aucune exposition.
REVOKE EXECUTE ON FUNCTION public.current_admin_role(uuid) FROM anon, authenticated;
-- anon n'evalue plus aucun helper dans les policies : on lui retire l'execution.
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_moderate(uuid) FROM anon;
-- is_admin etait deja non executable par anon ; authenticated conserve is_admin /
-- can_moderate / is_super_admin (necessaires a l'evaluation des policies cote staff).
