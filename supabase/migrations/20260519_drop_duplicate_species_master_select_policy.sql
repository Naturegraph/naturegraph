-- ============================================================================
-- Migration : drop duplicate SELECT policy on species_master
-- ============================================================================
-- Date     : 2026-05-19
-- Auteur   : Nicolas + Claude (audit Supabase advisors)
--
-- Contexte :
--   L'audit Supabase (`get_advisors performance`) a remonté
--   "multiple_permissive_policies" sur species_master pour le rôle public
--   (anon + authenticated + dashboard_user + supabase_privileged_role).
--
--   Cause : 2 policies SELECT identiques (predicate `is_active = TRUE`) :
--     - `species_master_select_public` créée par 20260416_species_master
--     - `species_master_public_read` créée par 20260519_species_master_seed_v2
--
--   Impact perf : chaque SELECT sur species_master évalue les 2 predicates
--   au lieu d'un (overhead négligeable mais signalé par le linter).
--
-- Fix : on garde `species_master_public_read` (nommée dans la migration
-- de référence Phase 1) et on drop l'ancienne.
-- ============================================================================

DROP POLICY IF EXISTS species_master_select_public ON public.species_master;

-- Vérification : il doit rester exactement 1 policy SELECT sur species_master.
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'species_master' AND cmd = 'SELECT';

  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 SELECT policy on species_master, found %', policy_count;
  END IF;
END $$;
