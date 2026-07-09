-- Migration: 20260707_cron_weekly_summary
-- Planification de E1 (resume hebdomadaire) : dimanche 18h UTC.
-- Cree INACTIF (go-live groupe). Meme pattern Vault que les autres crons NG-045.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('weekly_summary')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_summary');

SELECT cron.schedule(
  'weekly_summary',
  '0 18 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-weekly-summary',
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
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'weekly_summary'),
  active => false
);
