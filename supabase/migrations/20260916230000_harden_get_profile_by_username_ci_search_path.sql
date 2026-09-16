-- ============================================================================
-- HARDENING : search_path fixe sur get_profile_by_username_ci
-- ============================================================================
--
-- Advisor Supabase (WARN 0011 function_search_path_mutable) : la fonction
-- get_profile_by_username_ci n avait pas de search_path fixe. Bonne pratique
-- de securite (evite qu un search_path attaquant redirige la resolution des
-- objets non qualifies). La fonction reference deja public.profiles de facon
-- qualifiee ; on epingle simplement le search_path, sans changer la logique.
--
-- Rollback : ALTER FUNCTION public.get_profile_by_username_ci(text) RESET search_path;
-- ============================================================================

ALTER FUNCTION public.get_profile_by_username_ci(text)
  SET search_path = public, pg_temp;
