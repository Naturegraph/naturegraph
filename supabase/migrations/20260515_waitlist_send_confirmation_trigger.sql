-- ============================================================================
-- BATCH 77 (2026-05-15) — Email auto de confirmation après INSERT beta_waitlist
-- ============================================================================
-- Trigger AFTER INSERT qui appelle l'edge function `send-waitlist-confirmation`
-- via pg_net (HTTP async fire-and-forget).
--
-- Avantages vs Database Webhook configuré dans Dashboard :
--   - Versionné dans le repo (pas de config manuelle à refaire sur prod)
--   - Reproductible et testable
--   - Aucun risque d'oubli au merge main
--
-- Si l'edge function échoue ou n'est pas dispo, l'INSERT réussit quand même
-- (pg_net est async — ne bloque pas l'INSERT initial).
--
-- Application sur naturegraph-prod :
--   À appliquer manuellement avant le 1er INSERT en prod. Ne pas oublier de
--   mettre à jour les constantes v_url et v_anon_key dans la fonction trigger
--   pour pointer sur le project prod (cf. instructions plus bas).
-- ============================================================================

-- 1. Installer pg_net (HTTP client async pour PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Fonction trigger : POST le record vers l'edge function
CREATE OR REPLACE FUNCTION public.trigger_send_waitlist_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- URL du project Supabase (dev). Pour prod, modifier cette constante avant déploiement.
  v_url CONSTANT TEXT := 'https://hrxgduvworofnrjmgpcj.supabase.co';
  -- Anon key (publique — utilisée par le frontend en clair, pas de risque de fuite).
  -- Pour prod, remplacer par l'anon key du project prod.
  v_anon_key CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeGdkdXZ3b3JvZm5yam1ncGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjk5MTQsImV4cCI6MjA5MDgwNTkxNH0.qjJWz_dff9L1Bph2tSbfhGvEJe1pmrU6jya-Vg6HY-A';
BEGIN
  -- Appel async fire-and-forget (n'attend pas la réponse)
  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-waitlist-confirmation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'beta_waitlist',
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_send_waitlist_email() IS
  'BATCH 77 : envoie un email de confirmation via send-waitlist-confirmation edge function après INSERT sur beta_waitlist. Nécessite (1) edge function déployée, (2) RESEND_API_KEY configuré dans Secrets.';

-- 3. Trigger AFTER INSERT
DROP TRIGGER IF EXISTS waitlist_send_confirmation ON public.beta_waitlist;

CREATE TRIGGER waitlist_send_confirmation
  AFTER INSERT ON public.beta_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_waitlist_email();
