-- ============================================================
-- Naturegraph — Table species_master (Phase 2 ready)
-- ============================================================
-- Couche produit unifiée au-dessus de taxref_cache.
-- Créée vide en Phase 1 pour poser les FK dès maintenant.
-- Peuplée en Phase 2 (mapping TAXREF + autres sources).
--
-- À appliquer sur : naturegraph-dev, puis naturegraph-prod
-- ============================================================

-- ─── Table species_master ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.species_master (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants sources
  taxref_id        VARCHAR(50) REFERENCES public.taxref_cache(cd_nom) ON DELETE SET NULL,
  gbif_id          VARCHAR(50),   -- Phase 3 — GBIF (global)

  -- Noms (snapshot dénormalisé pour affichage rapide)
  common_name_fr   VARCHAR(255) NOT NULL,
  common_name_en   VARCHAR(255),
  scientific_name  VARCHAR(255) NOT NULL,

  -- Synonymes et variantes orthographiques (recherche robuste)
  synonyms         TEXT[] DEFAULT '{}',

  -- Classification
  taxonomic_group  VARCHAR(20) NOT NULL
    CHECK (taxonomic_group IN ('birds','mammals','insects','amphibians','reptiles','other')),

  -- Source de la donnée
  source           VARCHAR(20) DEFAULT 'taxref'
    CHECK (source IN ('taxref','gbif','internal')),

  -- Popularité (nombre d'observations sur Naturegraph — mis à jour par trigger Phase 2)
  popularity       INTEGER DEFAULT 0,

  -- Médias
  image_url        VARCHAR(500),

  -- Statut
  is_active        BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_species_master_taxref_id
  ON public.species_master (taxref_id);

CREATE INDEX IF NOT EXISTS idx_species_master_group
  ON public.species_master (taxonomic_group);

CREATE INDEX IF NOT EXISTS idx_species_master_popularity
  ON public.species_master (popularity DESC)
  WHERE is_active = TRUE;

-- Trigger updated_at
CREATE TRIGGER update_species_master_updated_at
  BEFORE UPDATE ON public.species_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS species_master ───────────────────────────────────────

ALTER TABLE public.species_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "species_master_select_public"
  ON public.species_master
  FOR SELECT
  USING (is_active = TRUE);

-- ─── Ajout species_id sur posts ───────────────────────────────
-- FK nullable : un post peut exister sans espèce liée (species_identified = false).
-- Quand l'utilisateur sélectionne une espèce → species_id + taxref_id remplis.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES public.species_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_species_id
  ON public.posts (species_id)
  WHERE species_id IS NOT NULL;

-- ─── Vue publique pour les fiches espèces (Phase 2) ──────────
-- Jointure species_master ← taxref_cache pour enrichissement.
-- Créée vide maintenant, utilisée dès que species_master est peuplée.

CREATE OR REPLACE VIEW public.species_full AS
  SELECT
    sm.id,
    sm.taxref_id,
    sm.common_name_fr,
    sm.common_name_en,
    sm.scientific_name,
    sm.synonyms,
    sm.taxonomic_group,
    sm.source,
    sm.popularity,
    sm.image_url,
    -- Données enrichies depuis taxref_cache
    tc.common_name_en  AS taxref_common_name_en,
    tc.author          AS taxref_author,
    tc.family          AS taxref_family,
    tc.genus           AS taxref_genus,
    tc."order"         AS taxref_order,
    tc.conservation_status,
    tc.taxref_version
  FROM public.species_master sm
  LEFT JOIN public.taxref_cache tc ON tc.cd_nom = sm.taxref_id
  WHERE sm.is_active = TRUE;
