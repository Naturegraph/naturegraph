-- ============================================================
-- Future-proof : metadata JSONB + versioning sources (V1.1.0 prep)
-- Date : 2026-05-26
-- ============================================================
-- Permet d ajouter sans migration cassante :
--   - statuts conservation (IUCN, COSEWIC/COSEPAC, SARA)
--   - statuts protection (LRR France, Article L411-1, ZNIEFF)
--   - patterns migration (resident, breeding_visitor, hivernant)
--   - habitats, biologie, etc.
-- Documentation complete : docs/backend/TAXONOMY_DATABASE_DESIGN.md
-- ============================================================

ALTER TABLE public.taxonomy_nodes
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS data_version TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT;

CREATE INDEX IF NOT EXISTS idx_taxonomy_metadata_gin
  ON public.taxonomy_nodes USING GIN (metadata);

COMMENT ON COLUMN public.taxonomy_nodes.metadata IS
  'JSONB extensible pour donnees evolutives (statuts conservation, regulation, migration, habitats). Voir docs/backend/TAXONOMY_DATABASE_DESIGN.md.';
COMMENT ON COLUMN public.taxonomy_nodes.data_version IS
  'Version source (ex: TAXREF_v17, iNat_2026-05). Permet retrocompat lors de re-seed.';
COMMENT ON COLUMN public.taxonomy_nodes.data_source IS
  'Source originale (TAXREF, iNaturalist, GBIF, manual). Trace pour audit.';
