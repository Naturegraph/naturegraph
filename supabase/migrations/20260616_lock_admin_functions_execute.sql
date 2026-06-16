-- Audit securite global (2026-06-16) : verrouillage de l'execution des fonctions admin.
--
-- Constat : un REVOKE EXECUTE ... FROM anon est inefficace tant que le grant PUBLIC
-- (par defaut) ou un grant explicite anon (ajoute par Supabase a la creation) subsiste.
-- Resultat : is_super_admin / can_moderate / current_admin_role / admin_set_user_role
-- restaient appelables par anon via /rest/v1/rpc/... (enumeration "qui est admin",
-- et fonction d'attribution de role joignable -- bien que protegee en interne).
--
-- Correctif : retirer le grant PUBLIC (cause racine) + le grant explicite anon, puis
-- ne re-accorder qu'aux roles legitimes. Toutes les policies RLS qui referencent ces
-- helpers sont deja `TO authenticated`, donc anon n'en evalue aucune -> aucun impact
-- sur les lectures invite (verifie : feed / especes lus normalement en role anon).

-- is_super_admin / can_moderate : evaluees par authenticated dans les policies RLS.
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_moderate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO authenticated, service_role;

-- current_admin_role : appelee uniquement en interne par les helpers SECURITY DEFINER
-- (qui s'executent en tant qu'owner). Aucun acces direct anon/authenticated requis.
REVOKE EXECUTE ON FUNCTION public.current_admin_role(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_admin_role(uuid) TO service_role;

-- admin_set_user_role : reservee au super_admin (garde interne). Joignable seulement
-- par authenticated (le super_admin), plus jamais par anon.
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated, service_role;
