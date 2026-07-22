-- Migration: 20260721_cleanup_old_notifications
-- =============================================================================
-- Purge automatique des notifications de plus de 30 jours.
--
-- Pourquoi : personne ne consulte une notification vieille de plusieurs
-- semaines (decision Nicolas 2026-07-21). Les garder ne fait que gonfler la
-- table et allonger le centre de notifications. 30 jours couvre largement le
-- temps de reaction d'un utilisateur.
--
-- Portee : TOUS les types, y compris system. Une annonce produit reste visible
-- un mois, ce qui suffit ; au-dela elle n'a plus de valeur d'information.
--
-- Suppression definitive (hard delete), comme le fait deja le centre de
-- notifications pour une suppression manuelle. Aligne sur les crons de
-- nettoyage existants (cleanup_security_audit_log_180d, cleanup_beta_signup_log_90d).
--
-- 3h30 UTC : creneau calme, apres les autres nettoyages (3h00 et 3h15) pour ne
-- pas les faire tourner en meme temps.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cleanup_notifications_30d')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_notifications_30d');

SELECT cron.schedule(
  'cleanup_notifications_30d',
  '30 3 * * *',
  $$ DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '30 days' $$
);

-- Rollback (reference) :
--   SELECT cron.unschedule('cleanup_notifications_30d');
