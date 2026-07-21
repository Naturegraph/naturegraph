-- Migration: 20260717_report_alerts (NG-036)
-- =============================================================================
-- Alerte email immediate a chaque nouveau signalement + signal urgent si plus
-- de 3 signalements sur le meme contenu en 1 heure.
--
-- Trigger DB sur moderation_reports AFTER INSERT : compte les signalements du
-- meme (target_type, target_id) sur la derniere heure, puis appelle l'Edge
-- Function notify-new-report (email via Resend). urgent = true au-dela de 3.
--
-- Robustesse : corps enveloppe dans EXCEPTION (RETURN NEW) : une erreur d'alerte
-- ne doit jamais empecher l'enregistrement d'un signalement.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_same_count integer;
  v_secret     text;
BEGIN
  -- Nombre de signalements sur le MEME contenu dans la derniere heure
  -- (inclut celui qu'on vient d'inserer).
  SELECT count(*) INTO v_same_count
  FROM public.moderation_reports
  WHERE target_type = new.target_type
    AND target_id = new.target_id
    AND created_at > now() - interval '1 hour';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  PERFORM net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/notify-new-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object(
      'report_id', new.id,
      'target_type', new.target_type,
      'target_id', new.target_id,
      'reason', new.reason,
      'reporter_id', new.reporter_id,
      'same_content_count', v_same_count,
      'urgent', (v_same_count > 3)
    ),
    timeout_milliseconds := 20000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_new_report a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_report() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_report() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_report() FROM authenticated;

DROP TRIGGER IF EXISTS trg_notify_new_report ON public.moderation_reports;
CREATE TRIGGER trg_notify_new_report
AFTER INSERT ON public.moderation_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_report();

-- Rollback (reference) :
--   DROP TRIGGER IF EXISTS trg_notify_new_report ON public.moderation_reports;
--   DROP FUNCTION IF EXISTS public.notify_new_report();
