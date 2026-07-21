-- Migration: 20260707_cron_followed_digest
-- Planification du digest quotidien E8 (publications des profils suivis).
--
-- Declenche l'edge function `check-followed-digest` tous les jours a 19h UTC
-- (apres E7 a 18h, pour ne pas envoyer les deux au meme instant). Meme pattern
-- Vault que les autres crons NG-045.
--
-- Pas de backfill necessaire (le backfill emailed_at de la Phase 0 protege deja
-- des envois retroactifs, comme pour E7).
--
-- Cree INACTIF : active au go-live groupe apres validation Nicolas.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily_followed_digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_followed_digest'
);

SELECT cron.schedule(
  'daily_followed_digest',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-followed-digest',
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
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'daily_followed_digest'),
  active => false
);
