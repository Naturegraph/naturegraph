-- ============================================================================
-- NG-009 (2026-06-23) — Consentement marketing RGPD sur la waitlist
-- ============================================================================
-- Ajoute le consentement marketing explicite (opt-in) a beta_waitlist, condition
-- prealable RGPD (art. 6 + art. 7) avant d'importer un email dans l'outil
-- d'emailing (MailerLite). L'email de cle d'acces reste transactionnel (necessaire
-- a l'execution de l'inscription), il ne depend pas de ce consentement.
--
-- - marketing_consent     : opt-in explicite, FALSE par defaut (pas de pre-coche).
-- - marketing_consent_at  : horodatage = preuve du consentement (art. 7.1 RGPD).
--                           Fixe cote serveur par trigger, jamais par le client,
--                           pour garantir l'integrite de la preuve.
--
-- Application : dev/staging (ce projet) puis naturegraph-prod avant l'envoi du
-- mail de prelancement. Additive et idempotente (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE public.beta_waitlist
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

COMMENT ON COLUMN public.beta_waitlist.marketing_consent IS
  'RGPD : opt-in explicite pour les communications marketing (newsletter / campagne). FALSE par defaut. Seuls les emails TRUE peuvent etre importes dans l outil d emailing.';
COMMENT ON COLUMN public.beta_waitlist.marketing_consent_at IS
  'Horodatage du consentement marketing (preuve RGPD art. 7.1). NULL si pas de consentement. Fixe cote serveur par trigger.';

-- Trigger : horodatage du consentement cote serveur (anti-falsification).
-- Le client ne peut pas mentir sur la date : on l'ecrase systematiquement.
CREATE OR REPLACE FUNCTION public.set_waitlist_marketing_consent_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.marketing_consent IS TRUE THEN
    -- Sur UPDATE, ne pas reinitialiser une date de consentement deja posee.
    IF TG_OP = 'INSERT' OR OLD.marketing_consent IS DISTINCT FROM TRUE THEN
      NEW.marketing_consent_at := now();
    END IF;
  ELSE
    NEW.marketing_consent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waitlist_set_consent_at ON public.beta_waitlist;

CREATE TRIGGER waitlist_set_consent_at
  BEFORE INSERT OR UPDATE OF marketing_consent ON public.beta_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.set_waitlist_marketing_consent_at();
