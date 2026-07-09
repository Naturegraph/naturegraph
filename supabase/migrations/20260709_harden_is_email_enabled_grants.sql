-- Migration: 20260709_harden_is_email_enabled_grants
-- Durcissement post-audit (Supabase advisor : anon/authenticated pouvaient
-- executer is_email_enabled, une fonction SECURITY DEFINER). Seul le dispatcher
-- (service_role) a besoin de l'appeler. On revoque donc l'EXECUTE des roles
-- exposes a l'API et on le reserve au service_role.
--
-- Applique en prod le 2026-07-09 (via SQL direct au go-live NG-045) ; ce fichier
-- le trace pour la coherence repo/prod.
--
-- GRANT avant REVOKE : evite toute fenetre ou le dispatcher live perdrait
-- l'acces.

GRANT EXECUTE ON FUNCTION public.is_email_enabled(uuid, character varying) TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_email_enabled(uuid, character varying) FROM public, anon, authenticated;
