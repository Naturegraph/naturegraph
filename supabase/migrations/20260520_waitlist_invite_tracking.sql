-- ============================================================================
-- Migration : Suivi avancé des invitations waitlist (2026-05-20)
-- ============================================================================
--
-- Contexte (demande Nicolas) :
--   Avant cette migration, une entrée waitlist disparaissait de l'admin dès
--   qu'elle était invitée (le front filtrait `invited_at IS NULL`). Impossible
--   de suivre ce qui se passe entre l'invitation et la création de compte.
--
-- Cette migration ajoute le suivi de l'ENVOI de l'invitation. Colonnes
-- purement additives, toutes nullable ou avec DEFAULT → aucun risque sur les
-- données existantes, aucune réécriture de table.
--
--   - invite_count  : nb d'emails d'invitation réellement envoyés (resend inclus)
--   - email_status  : résultat du dernier envoi — 'sent' | 'failed'
--   - email_error   : détail de l'échec du dernier envoi (NULL si OK)
--
-- Le statut "Inscrit" N'EST PAS stocké ici : il est dérivé côté admin par
-- jointure `profiles.email = beta_waitlist.email` (source de vérité unique =
-- l'existence du compte). On évite ainsi un trigger et tout risque de donnée
-- de suivi désynchronisée de la réalité.
--
-- Application :
--   - naturegraph-dev  : appliquée via MCP le 2026-05-20 (beta = staging)
--   - naturegraph-prod : à appliquer avant la prochaine ouverture prod
-- ============================================================================

ALTER TABLE public.beta_waitlist
  ADD COLUMN IF NOT EXISTS invite_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_status TEXT,
  ADD COLUMN IF NOT EXISTS email_error  TEXT;

-- Contrainte de domaine sur email_status (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'beta_waitlist_email_status_check'
  ) THEN
    ALTER TABLE public.beta_waitlist
      ADD CONSTRAINT beta_waitlist_email_status_check
      CHECK (email_status IS NULL OR email_status IN ('sent', 'failed'));
  END IF;
END $$;

COMMENT ON COLUMN public.beta_waitlist.invite_count IS
  'Nombre d''emails d''invitation envoyés à cette entrée (resend inclus).';
COMMENT ON COLUMN public.beta_waitlist.email_status IS
  'Résultat du dernier envoi d''invitation : sent | failed | NULL (jamais invité).';
COMMENT ON COLUMN public.beta_waitlist.email_error IS
  'Détail de l''échec du dernier envoi d''invitation (NULL si succès).';

-- ============================================================================
-- FIN MIGRATION
-- ============================================================================
