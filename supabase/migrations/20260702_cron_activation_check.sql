-- Migration: 20260702_cron_activation_check
-- Planification du job quotidien E5 (activation premier partage) via pg_cron.
--
-- Déclenche l'edge function `check-activation-emails` tous les jours à 8h UTC
-- (décalé du digest espèces hebdo à 9h UTC pour ne pas cumuler la charge sur
-- le même créneau).
--
-- IMPORTANT (2026-07-02) : la première version de cette migration reprenait
-- le pattern `current_setting('app.settings.supabase_url/cron_secret')` de
-- 20260417_cron_species_digest.sql. Audit fait avant application : ces
-- settings ne sont PAS configurés en prod (aucune ligne dans
-- pg_db_role_setting), et le cron job weekly_species_digest lui-meme
-- n'existe pas dans cron.job malgre la migration listee comme appliquee.
-- Ce pattern n'a donc jamais fonctionne. On reprend a la place le pattern
-- PROUVE fonctionnel du trigger waitlist (20260515_waitlist_send_confirmation_trigger.sql,
-- confirme operationnel) : URL du projet en dur (valeur publique, pas un
-- secret) + secret d'auth stocke dans Supabase Vault et resolu a l'execution.
--
-- Le secret 'cron_secret' a ete cree dans Vault via vault.create_secret()
-- avant cette migration. Sa valeur doit AUSSI etre posee comme secret Edge
-- Function CRON_SECRET (Dashboard -> Edge Functions -> Secrets) pour que
-- check-activation-emails / send-notification-email valident le header
-- x-cron-secret correctement.

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
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-activation-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
