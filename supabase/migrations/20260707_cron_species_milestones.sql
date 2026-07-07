-- Migration: 20260707_cron_species_milestones
-- Planification du job quotidien E6 (milestone especes) via pg_cron.
--
-- Declenche l'edge function `check-species-milestones` tous les jours a 10h UTC
-- (decale de daily_activation_check 8h et du species digest 9h pour etaler la
-- charge). Meme pattern Vault eprouve que 20260702_cron_activation_check.sql.
--
-- ============================================================================
-- ATTENTION GO-LIVE : BACKFILL OBLIGATOIRE AVANT D'ACTIVER CE CRON
-- ============================================================================
-- Au premier passage, TOUS les users existants ont deja franchi des paliers
-- (10/25/50/100 especes). Sans precaution, ce job leur enverrait un email
-- retroactif en masse. AVANT d'activer ce cron, lancer le backfill qui marque
-- les paliers deja atteints comme "deja envoyes" (SANS emailer) :
--
--   INSERT INTO public.email_send_log (user_id, email_type, category, reference_key)
--   SELECT s.user_id, 'e6_milestone', 'event', m.threshold::text
--   FROM (
--     SELECT p.user_id,
--            (public.get_user_observation_stats(p.user_id)->>'species_total')::int AS species_total
--     FROM (SELECT DISTINCT user_id FROM public.posts WHERE status = 'published') p
--   ) s
--   CROSS JOIN (VALUES (10),(25),(50),(100)) AS m(threshold)
--   WHERE s.species_total >= m.threshold
--     AND NOT EXISTS (
--       SELECT 1 FROM public.email_send_log e
--       WHERE e.user_id = s.user_id AND e.email_type = 'e6_milestone'
--         AND e.reference_key = m.threshold::text
--     );
--
-- Ce backfill est idempotent (NOT EXISTS). Une fois lance, activer le cron :
--   SELECT cron.alter_job(job_id => (SELECT jobid FROM cron.job
--     WHERE jobname = 'daily_species_milestones'), active => true);
-- ============================================================================
--
-- Cette migration cree le job en position INACTIVE (active => false) pour
-- respecter cette contrainte : rien ne part tant que le backfill + validation
-- Nicolas ne sont pas faits.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily_species_milestones')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_species_milestones'
);

SELECT cron.schedule(
  'daily_species_milestones',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/check-species-milestones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Cree inactif : sera active manuellement au go-live, APRES le backfill.
SELECT cron.alter_job(
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'daily_species_milestones'),
  active => false
);
