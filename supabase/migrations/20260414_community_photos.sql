-- ============================================================================
-- Migration: community_photos — photos héro auth page
-- Date: 2026-04-14
-- Description:
--   Table pour les photos communautaires affichées sur les pages auth.
--   Un seul enregistrement actif à la fois (is_active = true).
--   Lecture publique, écriture service_role uniquement.
--   Inclut consentement explicite du photographe (consent_verified).
-- ============================================================================

CREATE TABLE public.community_photos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  src              TEXT        NOT NULL,
  alt              TEXT        NOT NULL,
  photographer_name TEXT,
  instagram_url    TEXT,
  tagline          TEXT        NOT NULL DEFAULT 'Partageons nos émotions',
  is_active        BOOLEAN     NOT NULL DEFAULT false,
  consent_verified BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.community_photos IS
  'Photos communautaires affichées sur les écrans auth. Un seul is_active=true à la fois.';
COMMENT ON COLUMN public.community_photos.consent_verified IS
  'Ne jamais afficher sans le consentement explicite du photographe.';

-- Index pour fetch rapide de la photo active
CREATE INDEX idx_community_photos_active ON public.community_photos (is_active)
  WHERE is_active = true;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.community_photos ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pages auth non authentifiées)
CREATE POLICY "community_photos_select_public"
  ON public.community_photos
  FOR SELECT
  USING (true);

-- Écriture réservée au service_role (admin via dashboard ou migration)

-- ── Photo par défaut ─────────────────────────────────────────────────────────
-- src vide = fallback sur l'asset local (cta-kingfisher.png) côté frontend.
-- À remplacer par une URL Supabase Storage lors du premier upload communautaire.
INSERT INTO public.community_photos (src, alt, tagline, is_active, consent_verified)
VALUES (
  '',
  'Martin-pêcheur — Naturegraph',
  'Partageons nos émotions',
  true,
  true
);
