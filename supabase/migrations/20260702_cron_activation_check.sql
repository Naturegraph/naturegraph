-- Migration: 20260702_cron_activation_check
-- Planification du job quotidien E5 (activation premier partage) via pg_cron.
--
-- Déclenche l'edge function `check-activation-emails` tous les jours à 8h UTC
-- (décalé du digest espèces hebdo à 9h UTC pour ne pas cumuler la charge sur
-- le même créneau). Requiert pg_cron/pg_net, déjà actives (cf.
-- 20260417_cron_species_digest.sql).
--
-- Réutilise les mêmes settings que le digest espèces :
--   app.settings.supabase_url, app.settings.cron_secret (Vault, déjà en place).
--
-- NOTE déploiement : cette migration planifie l'appel côté Postgres, mais
-- l'Edge Function elle-même (check-activation-emails) doit être déployée
-- séparément via `supabase functions deploy check-activation-emails`, de
-- même que send-notification-email et email-unsubscribe dont elle dépend.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily_activation_check')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_activation_check'
);

-- Tous les jours 8h UTC
SELECT cron.schedule(
  'daily_activation_check',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/check-activation-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
