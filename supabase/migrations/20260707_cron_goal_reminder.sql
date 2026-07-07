-- Migration: 20260707_cron_goal_reminder
-- Planification de E3 (rappel objectif hebdo) : jeudi 16h UTC.
-- Laisse le week-end a l'utilisateur pour rattraper son objectif.
-- Cree INACTIF (go-live groupe). Meme pattern Vault que les autres crons NG-045.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('weekly_goal_reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_goal_reminder');

SELECT cron.schedule(
  'weekly_goal_reminder',
  '0 16 * * 4',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-goal-reminder',
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
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'weekly_goal_reminder'),
  active => false
);
