-- ════════════════════════════════════════════════════════════════════════════
-- 20260514 — Cron J+30 : anonymisation de beta_signup_log (RGPD)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Contexte
-- ────────
-- La migration `20260514_beta_admin_system.sql` crée la table
-- `beta_signup_log` qui logue les tentatives de validation des cles beta.
-- Pour chaque tentative on stocke :
--   - attempted_code (code essaye, peut etre invalide)
--   - outcome (success / invalid_code / quota_full / etc)
--   - ip_address (PII selon CNIL/RGPD)
--   - user_agent (fingerprint navigateur — PII)
--
-- La strategie `BETA_CLOSED_ACCESS_STRATEGY.md` ligne 242-244 promettait
-- "IP anonymisee J+30 par cron T-067 existant". Or le cron T-067 cible
-- uniquement `security_audit_log` (cf. `20260503_audit_log_anonymization_cron.sql`).
-- Cette migration repare le manquement RGPD pour beta_signup_log.
--
-- Stratégie : ANONYMISATION (UPDATE), pas suppression (DELETE).
-- ─────────────────────────────────────────────────────────────
-- Donnees effacees apres J+30 :
--   - ip_address (PII)
--   - user_agent (fingerprint)
--   - attempted_code (peut leak un pattern d'attaque mais aussi etre lie a un user)
--
-- Donnees conservees (justifiees) :
--   - id (interne)
--   - outcome (enum, non PII — utile pour stats)
--   - created_at (timestamp d'evenement)
--   - user_id (peut etre supprime via FK SET NULL automatiquement)
--
-- Conformite RGPD
-- ───────────────
--   - Art 5(1)(c) minimisation : ne garder que stats outcome
--   - Art 5(1)(e) limitation conservation : 30j max pour PII
--   - Art 17 droit a l'effacement
--   - Art 32 mesure technique de securite
--   - Loi 25 Quebec : Art 1.1 + Art 9
--
-- Refs : BATCH 36 fix RGPD pre-launch beta + BETA_CLOSED_ACCESS_STRATEGY.md
--        ligne 242-244 promesse a tenir.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fonction d'anonymisation
-- ────────────────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER : execute avec droits postgres (bypass RLS admin-only).
-- SET search_path = public : protection injection.

CREATE OR REPLACE FUNCTION public.anonymize_beta_signup_log()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.beta_signup_log
       SET ip_address     = NULL,
           user_agent     = NULL,
           attempted_code = NULL
     WHERE created_at < NOW() - INTERVAL '30 days'
       AND (ip_address IS NOT NULL OR user_agent IS NOT NULL OR attempted_code IS NOT NULL)
     RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO affected_count FROM updated;

  RAISE NOTICE 'anonymize_beta_signup_log: % rows anonymized', affected_count;

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION public.anonymize_beta_signup_log() IS
  'Anonymise les rows beta_signup_log apres 30 jours : efface ip_address, '
  'user_agent, attempted_code (PII). Conserve outcome + created_at pour '
  'statistiques anonymes. Idempotente.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Planification cron
-- ────────────────────────────────────────────────────────────────────────────
--
-- Quotidien a 03:15 UTC (15 min apres anonymize_orphan_audit_logs pour
-- eviter de surcharger la DB en heures creuses).
-- Idempotence : unschedule avant schedule.

SELECT cron.unschedule('anonymize_beta_signup_log')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'anonymize_beta_signup_log'
);

SELECT cron.schedule(
  'anonymize_beta_signup_log',
  '15 3 * * *',  -- 03:15 UTC quotidien
  $$ SELECT public.anonymize_beta_signup_log(); $$
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Verification (run-once a l'apply)
-- ────────────────────────────────────────────────────────────────────────────
-- Anonymise immediatement les rows deja > 30j si existantes (catch-up).

SELECT public.anonymize_beta_signup_log();
