-- Migration: 20260707_cron_social_digest
-- Planification du digest social quotidien E7 (reactions + nouveaux migrateurs).
--
-- Declenche l'edge function `check-social-digest` tous les jours a 18h UTC
-- (fin de journee, moment propice a un rappel "ce que tu as manque"). Meme
-- pattern Vault que les autres crons NG-045.
--
-- Pas de backfill necessaire : E7 ne regarde que les notifs read=false ET
-- emailed_at IS NULL. Le backfill emailed_at de la Phase 0
-- (20260702_notifications_emailed_at.sql) a deja marque toutes les notifs
-- existantes -> aucun envoi retroactif possible.
--
-- Cree INACTIF : sera active au go-live apres validation Nicolas, en meme
-- temps que les autres crons.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily_social_digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_social_digest'
);

SELECT cron.schedule(
  'daily_social_digest',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-social-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.alter_job(
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'daily_social_digest'),
  active => false
);
