-- ════════════════════════════════════════════════════════════════════════════
-- 20260503 — Cron J+30 : anonymisation des security_audit_log orphelines
-- ════════════════════════════════════════════════════════════════════════════
--
-- Contexte
-- ────────
-- La migration `20260502_settings_phase2_complete.sql` (ligne 109) crée la
-- table `security_audit_log` avec un commentaire explicite :
--   *"Toutes les valeurs PII ici sont anonymisées au cron J+30 si suppression."*
--
-- Mais aucun cron n'avait été créé → promesse RGPD cassée. Cette migration
-- répare ce manquement en planifiant un cron quotidien qui anonymise les
-- rows orphelines (user_id IS NULL, = compte supprimé) après 30 jours.
--
-- Stratégie : ANONYMISATION (UPDATE), pas suppression (DELETE).
-- ─────────────────────────────────────────────────────────────
-- L'anonymisation au sens RGPD = données qui ne peuvent plus être rattachées
-- à une personne identifiable. Effet équivalent à la suppression pour la PII,
-- mais permet de conserver `event_type + created_at` comme **preuve d'audit
-- minimale** (statistiques d'attaques, conformité Art 5(2) responsabilité).
--
-- Données effacées (PII) :
--   - ip_address (PII selon CNIL/RGPD)
--   - user_agent (fingerprint navigateur)
--   - metadata JSONB (peut contenir old_email, new_email, etc.)
--
-- Données conservées (justifiées) :
--   - id (interne)
--   - event_type (enum, non PII)
--   - created_at (timestamp d'événement)
--   - metadata après anonymisation : {"anonymized": true, "anonymized_at": ...}
--
-- Quand l'anonymisation se déclenche :
--   user_id IS NULL                                  -- compte supprimé (FK SET NULL)
--   AND created_at < NOW() - INTERVAL '30 days'      -- > 30 jours
--   AND (metadata IS NULL OR NOT (metadata ? 'anonymized'))  -- pas déjà anonymisé
--
-- Conformité
-- ──────────
--   - RGPD Art 5(1)(c) minimisation
--   - RGPD Art 5(1)(e) limitation de conservation
--   - RGPD Art 17 droit à l'effacement
--   - RGPD Art 32 sécurité (mesure technique)
--   - Loi 25 Art 1.1 minimisation
--   - Loi 25 Art 9 sécurité raisonnable
--
-- Refs : docs/AUDIT_LEGAL.md RL-8, docs/AUDIT_SUPABASE.md P-5,
--        docs/SYNTHESE_AUDITS.md RC-C, Fix #4.
--
-- Prérequis OBLIGATOIRE
-- ─────────────────────
-- La migration `20260502_settings_phase2_complete.sql` DOIT être appliquée
-- AVANT celle-ci (création de la table `security_audit_log`). L'ordre
-- alphabétique des fichiers garantit cela si Supabase CLI applique en série.
--
-- À appliquer dans l'ordre sur :
--   - naturegraph-dev   (avant merge develop → staging)
--   - naturegraph-prod  (au merge staging → main)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Extensions requises
-- ────────────────────────────────────────────────────────────────────────────
-- pg_cron est déjà active sur Supabase managed (cf. migration
-- `20260417_cron_species_digest.sql`). Re-déclaration idempotente.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Fonction d'anonymisation
-- ────────────────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER : la fonction s'exécute avec les droits du créateur
-- (postgres role) afin de bypasser la RLS owner-only de `security_audit_log`.
-- Sans ça, le cron job tournerait avec le rôle anon ou postgres et la RLS
-- bloquerait les UPDATE.
--
-- SET search_path = public : sécurité contre les attaques de type
-- "search_path injection" sur les fonctions SECURITY DEFINER.
--
-- Retourne le nombre de rows anonymisées dans cette exécution (utile pour
-- monitoring via cron.job_run_details).

CREATE OR REPLACE FUNCTION public.anonymize_orphan_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.security_audit_log
       SET ip_address = NULL,
           user_agent = NULL,
           metadata = jsonb_build_object(
             'anonymized', true,
             'anonymized_at', NOW()
           )
     WHERE user_id IS NULL
       AND created_at < NOW() - INTERVAL '30 days'
       AND (metadata IS NULL OR NOT (metadata ? 'anonymized'))
     RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO affected_count FROM updated;

  -- Trace optionnelle dans les logs Postgres (visible via Supabase Dashboard)
  RAISE NOTICE 'anonymize_orphan_audit_logs: % rows anonymized', affected_count;

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION public.anonymize_orphan_audit_logs() IS
  'Anonymise les rows security_audit_log dont l''utilisateur a été supprimé '
  '(user_id IS NULL) et qui datent de plus de 30 jours. Effacement des '
  'colonnes PII (ip_address, user_agent, metadata). Conservation de '
  'event_type + created_at comme preuve d''audit minimale. Idempotente.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Planification cron
-- ────────────────────────────────────────────────────────────────────────────
--
-- Quotidien à 03:00 UTC (heures creuses, hors pic d'activité utilisateurs).
-- Idempotence : on supprime l'ancienne planif si elle existe avant de
-- recréer, pour pouvoir rejouer la migration sans erreur.

SELECT cron.unschedule('anonymize_orphan_audit_logs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'anonymize_orphan_audit_logs'
);

SELECT cron.schedule(
  'anonymize_orphan_audit_logs',
  '0 3 * * *',  -- minute hour day-of-month month day-of-week
  $$ SELECT public.anonymize_orphan_audit_logs(); $$
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Permissions
-- ────────────────────────────────────────────────────────────────────────────
--
-- La fonction est SECURITY DEFINER, mais on restreint son EXECUTE pour
-- éviter qu'un client authentifié puisse la déclencher manuellement (le
-- cron est censé être seul à l'invoquer).

REVOKE EXECUTE ON FUNCTION public.anonymize_orphan_audit_logs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonymize_orphan_audit_logs() FROM anon, authenticated;

-- Les rôles `postgres` (cron) et `service_role` conservent l'accès par défaut.

-- ────────────────────────────────────────────────────────────────────────────
-- Fin de la migration
-- ────────────────────────────────────────────────────────────────────────────
--
-- Vérifications post-application :
--
-- 1. Extension pg_cron active :
--    SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
--
-- 2. Fonction créée avec SECURITY DEFINER :
--    SELECT proname, prosecdef, prosrc
--      FROM pg_proc
--     WHERE proname = 'anonymize_orphan_audit_logs';
--    → prosecdef = true
--
-- 3. Cron job planifié :
--    SELECT jobid, jobname, schedule, active
--      FROM cron.job
--     WHERE jobname = 'anonymize_orphan_audit_logs';
--    → schedule = '0 3 * * *', active = true
--
-- 4. Test data lifecycle (à exécuter sur dev avec données de test) :
--    -- a. Row à anonymiser (orpheline > 30 jours)
--    INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, metadata, created_at)
--    VALUES (NULL, 'account_deletion_completed', '192.168.1.1'::inet, 'Mozilla/5.0',
--            '{"old_email": "test@example.com"}'::jsonb, NOW() - INTERVAL '31 days');
--
--    -- b. Lancer manuellement
--    SELECT public.anonymize_orphan_audit_logs();
--    → 1 (1 row anonymisée)
--
--    -- c. Re-lancer (idempotence)
--    SELECT public.anonymize_orphan_audit_logs();
--    → 0
--
--    -- d. Vérifier l'état
--    SELECT ip_address, user_agent, metadata FROM security_audit_log
--      WHERE created_at < NOW() - INTERVAL '30 days' AND user_id IS NULL;
--    → ip_address = NULL, user_agent = NULL, metadata = {"anonymized": true, ...}
--
-- 5. Logs d'exécution cron après 24h :
--    SELECT * FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'anonymize_orphan_audit_logs')
--     ORDER BY start_time DESC LIMIT 5;
--    → status = 'succeeded'
