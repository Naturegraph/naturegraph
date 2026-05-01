-- Migration: 20260417_cron_species_digest
-- Planification du digest hebdomadaire "Actualité espèces" via pg_cron.
--
-- Déclenche l'edge function `weekly-species-digest` tous les lundis 9h UTC.
-- Requiert les extensions `pg_cron` et `pg_net` (déjà actives sur Supabase managed).
--
-- NOTE : la variable `vault.species_digest_cron_secret` doit être définie via
--        Supabase Dashboard → Settings → Vault (ou via `supabase.vault.create_secret`).
--        Cette valeur doit correspondre à CRON_SECRET côté edge function.

-- Extensions (idempotent — pas d'erreur si déjà créées)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprime l'ancienne planif si elle existait (rejoue propre)
SELECT cron.unschedule('weekly_species_digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly_species_digest'
);

-- Lundi 9h UTC (soit 10h/11h France selon DST)
SELECT cron.schedule(
  'weekly_species_digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/weekly-species-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Planification cron côté Postgres — utilisé pour le digest species hebdo';
