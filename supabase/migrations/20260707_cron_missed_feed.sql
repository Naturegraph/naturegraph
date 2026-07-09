-- Migration: 20260707_cron_missed_feed
-- Planification de E2 (ce que tu as manque) : quotidien 12h UTC.
-- Cible les users absents >= 5 jours quand la communaute a ete active. Le
-- quota weekly_marketing garantit au plus 1 email marketing/semaine (donc
-- couvre aussi la regle "pas si E1 dans les 48h"). En pratique : un user
-- absent recoit E2 ; un user actif recoit E1 le dimanche. Le systeme se trie
-- de lui-meme selon last_active_at.
--
-- Cree INACTIF (go-live groupe). Meme pattern Vault que les autres crons NG-045.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily_missed_feed')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_missed_feed');

SELECT cron.schedule(
  'daily_missed_feed',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-missed-feed',
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
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'daily_missed_feed'),
  active => false
);
