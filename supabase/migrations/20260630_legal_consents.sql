-- ============================================================================
-- NG-038 (2026-06-30) — Tracabilite du consentement legal au signup
-- ============================================================================
-- En acces ouvert, la mention "En creant ton compte, tu acceptes nos CGU + la
-- politique de confidentialite" est affichee au signup, mais aucune preuve
-- n'etait conservee. Protection juridique (RGPD / Loi 25) : on trace QUI a
-- accepte QUOI et QUAND.
--
-- Table d'audit immuable (pas d'UPDATE/DELETE via RLS) : une ligne par
-- (utilisateur, document, version). "document = signup" represente l'acceptation
-- groupee CGU + confidentialite affichee au formulaire d'inscription. "version"
-- est la version du texte legal en vigueur (constante LEGAL_VERSION cote front,
-- a bumper quand les documents changent, cf. NG-010).
--
-- RLS guest-safe (NG-032) : policies en role `authenticated` uniquement, un anon
-- (auth.uid() = NULL) ne peut donc ni lire ni ecrire.
--
-- Application : dev/staging (ce projet) ET naturegraph-prod.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul enregistrement par (utilisateur, document, version) : idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS user_legal_consents_unique
  ON public.user_legal_consents (user_id, document, version);

CREATE INDEX IF NOT EXISTS idx_user_legal_consents_user
  ON public.user_legal_consents (user_id);

ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;

-- Lecture : l'utilisateur voit uniquement ses propres consentements.
CREATE POLICY "Users read own legal consents"
  ON public.user_legal_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insertion : l'utilisateur enregistre uniquement son propre consentement.
CREATE POLICY "Users insert own legal consents"
  ON public.user_legal_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Pas de policy UPDATE ni DELETE : la trace de consentement est immuable (audit).

COMMENT ON TABLE public.user_legal_consents IS
  'NG-038 : trace immuable du consentement legal au signup (CGU + confidentialite). Une ligne par (user, document, version). RLS authenticated only (guest-safe).';
