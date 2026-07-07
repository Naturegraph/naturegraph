-- Migration: 20260707_cron_streak_risk
-- Planification de E4 (serie en danger) : samedi 16h UTC.
-- Dernier moment utile avant la fin de semaine pour preserver la serie.
-- Cree INACTIF (go-live groupe). Meme pattern Vault que les autres crons NG-045.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('weekly_streak_risk')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_streak_risk');

SELECT cron.schedule(
  'weekly_streak_risk',
  '0 16 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-streak-risk',
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
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'weekly_streak_risk'),
  active => false
);
