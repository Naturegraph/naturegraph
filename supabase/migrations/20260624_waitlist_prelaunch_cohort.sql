-- ============================================================================
-- NG-009 (2026-06-24) — Cohorte prelancement sur la waitlist
-- ============================================================================
-- Le prelancement (80-100 invites) se gere comme une "liste specifique" sans
-- creer de table parallele : on tague les entrees beta_waitlist.
--
-- - source : 'organic' (inscription spontanee via le formulaire) ou 'prelaunch'
--   (cohorte cible importee par l'admin). Permet une vue filtree dans l'admin
--   sans melanger les deux flux.
-- - wave   : numero de vague d'envoi (NULL tant que pas invite). Affecte au
--   moment de l'invitation par lot (ex: 20 emails tous les 2 jours), pour
--   faciliter le suivi des connexions.
--
-- Reutilise tout l'outillage existant (send-beta-invite, suivi invited_at /
-- email_status, detection "a deja un compte", contrainte d'unicite email).
--
-- Application : dev/staging (ce projet) puis naturegraph-prod. Additive et
-- idempotente.
-- ============================================================================

ALTER TABLE public.beta_waitlist
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS wave smallint;

-- Contrainte de domaine sur source (ajout idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_waitlist_source_check'
  ) THEN
    ALTER TABLE public.beta_waitlist
      ADD CONSTRAINT beta_waitlist_source_check
      CHECK (source IN ('organic', 'prelaunch'));
  END IF;
END $$;

COMMENT ON COLUMN public.beta_waitlist.source IS
  'Origine de l entree : organic (formulaire public) ou prelaunch (cohorte cible importee par l admin pour le prelancement).';
COMMENT ON COLUMN public.beta_waitlist.wave IS
  'Numero de vague d envoi pour la cohorte prelancement (NULL tant que pas invite). Affecte au moment de l invitation par lot.';

-- Index partiel : la vue admin filtre frequemment sur la cohorte prelancement.
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_prelaunch
  ON public.beta_waitlist (created_at)
  WHERE source = 'prelaunch';
