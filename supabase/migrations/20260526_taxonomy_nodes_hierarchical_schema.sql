-- ============================================================
-- V1.1.0 prep : Schema hierarchique taxonomy_nodes
-- Date : 2026-05-26
-- Applique sur prod via MCP, archive ici pour traceabilite migrations
-- ============================================================
-- Objectif : structure scalable pour 50k+ especes + familles + ordres
-- Permet aux users de tagguer un post a n importe quel rang :
--   - espece precise (Calopteryx virgo)
--   - famille seule (Calopterygidae) si pas trouve l espece
--   - ordre (Odonata) en dernier recours
-- ============================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank TEXT NOT NULL CHECK (rank IN (
    'kingdom','phylum','class','order','family','genus','species','subspecies'
  )),
  scientific_name TEXT NOT NULL,
  common_name_fr TEXT,
  common_name_en TEXT,
  parent_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE SET NULL,
  kingdom TEXT, phylum TEXT, class TEXT, "order" TEXT, family TEXT, genus TEXT,
  gbif_taxon_key BIGINT,
  inpn_taxref_id TEXT,
  inaturalist_id INTEGER,
  available_in_fr BOOLEAN DEFAULT FALSE,
  available_in_ca BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  description_fr TEXT,
  description_en TEXT,
  synonyms TEXT[] DEFAULT '{}',
  popularity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_scientific_per_rank UNIQUE (rank, scientific_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_taxonomy_gbif_key_uniq
  ON public.taxonomy_nodes(gbif_taxon_key) WHERE gbif_taxon_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_rank ON public.taxonomy_nodes(rank);
CREATE INDEX IF NOT EXISTS idx_taxonomy_parent ON public.taxonomy_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_class ON public.taxonomy_nodes(class) WHERE class IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_order ON public.taxonomy_nodes("order") WHERE "order" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_family ON public.taxonomy_nodes(family) WHERE family IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_fr ON public.taxonomy_nodes(available_in_fr) WHERE available_in_fr = TRUE;
CREATE INDEX IF NOT EXISTS idx_taxonomy_ca ON public.taxonomy_nodes(available_in_ca) WHERE available_in_ca = TRUE;
CREATE INDEX IF NOT EXISTS idx_taxonomy_inpn ON public.taxonomy_nodes(inpn_taxref_id) WHERE inpn_taxref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_sci_trgm ON public.taxonomy_nodes USING gin (scientific_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_taxonomy_fr_trgm ON public.taxonomy_nodes USING gin (common_name_fr gin_trgm_ops) WHERE common_name_fr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_en_trgm ON public.taxonomy_nodes USING gin (common_name_en gin_trgm_ops) WHERE common_name_en IS NOT NULL;

ALTER TABLE public.taxonomy_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_taxonomy" ON public.taxonomy_nodes FOR SELECT USING (true);
CREATE POLICY "admin_write_taxonomy" ON public.taxonomy_nodes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_taxonomy_nodes_updated_at
  BEFORE UPDATE ON public.taxonomy_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS taxonomy_node_id UUID
  REFERENCES public.taxonomy_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_taxonomy_node
  ON public.posts(taxonomy_node_id) WHERE taxonomy_node_id IS NOT NULL;
