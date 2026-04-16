-- ============================================================
-- Naturegraph — TAXREF cache : optimisations recherche
-- ============================================================
-- Extensions, colonnes normalisées, search_vector tsvector,
-- index GIN + trigram, RLS read-only public.
--
-- À appliquer sur : naturegraph-dev, puis naturegraph-prod
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────

-- Recherche insensible aux accents (é → e, etc.)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Similarité trigram pour le fallback fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Colonnes supplémentaires sur taxref_cache ───────────────

-- Noms normalisés (minuscules + sans accents) pour recherche rapide
ALTER TABLE public.taxref_cache
  ADD COLUMN IF NOT EXISTS normalized_common_name  TEXT GENERATED ALWAYS AS (
    lower(unaccent(coalesce(common_name_fr, '')))
  ) STORED,
  ADD COLUMN IF NOT EXISTS normalized_scientific_name TEXT GENERATED ALWAYS AS (
    lower(unaccent(coalesce(scientific_name, '')))
  ) STORED,
  -- Synonymes — array de noms alternatifs (peuplé lors de l'import enrichi Phase 2)
  ADD COLUMN IF NOT EXISTS synonyms TEXT[] DEFAULT '{}',
  -- Vecteur de recherche full-text (FR + latin scientifique)
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- ─── Trigger : mise à jour automatique de search_vector ──────

CREATE OR REPLACE FUNCTION taxref_cache_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    -- Nom commun FR : poids A (le plus important)
    setweight(to_tsvector('french', coalesce(NEW.common_name_fr, '')), 'A') ||
    -- Nom scientifique : poids B
    setweight(to_tsvector('simple',  coalesce(NEW.scientific_name, '')), 'B') ||
    -- Synonymes : poids C
    setweight(to_tsvector('french',  array_to_string(coalesce(NEW.synonyms, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS taxref_cache_search_vector_trigger ON public.taxref_cache;
CREATE TRIGGER taxref_cache_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.taxref_cache
  FOR EACH ROW EXECUTE FUNCTION taxref_cache_update_search_vector();

-- ─── Index performance ────────────────────────────────────────

-- Index GIN full-text (recherche @@ to_tsquery)
CREATE INDEX IF NOT EXISTS idx_taxref_search_vector
  ON public.taxref_cache USING GIN (search_vector);

-- Index trigram sur noms normalisés (fallback fuzzy / ILIKE)
CREATE INDEX IF NOT EXISTS idx_taxref_common_name_trgm
  ON public.taxref_cache USING GIN (normalized_common_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_taxref_scientific_name_trgm
  ON public.taxref_cache USING GIN (normalized_scientific_name gin_trgm_ops);

-- Index btree sur le groupe taxonomique (filtrage par groupe)
CREATE INDEX IF NOT EXISTS idx_taxref_group
  ON public.taxref_cache ("group");

-- Index btree sur expires_at (TTL refresh)
CREATE INDEX IF NOT EXISTS idx_taxref_expires_at
  ON public.taxref_cache (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── RLS — Row Level Security ─────────────────────────────────

ALTER TABLE public.taxref_cache ENABLE ROW LEVEL SECURITY;

-- Lecture publique (même visiteurs non connectés)
CREATE POLICY "taxref_cache_select_public"
  ON public.taxref_cache
  FOR SELECT
  USING (true);

-- Écriture réservée au rôle service_role (import scripts, backend)
-- Aucune policy INSERT/UPDATE/DELETE pour authenticated ou anon
-- → par défaut RLS bloque tout ce qui n'est pas explicitement autorisé

-- ─── Mise à jour des search_vector existants ─────────────────
-- À exécuter après l'import initial pour peupler le vecteur
-- sur les lignes déjà présentes (si import avant trigger).
--
-- UPDATE public.taxref_cache SET search_vector = (
--   setweight(to_tsvector('french', coalesce(common_name_fr, '')), 'A') ||
--   setweight(to_tsvector('simple',  coalesce(scientific_name, '')),  'B')
-- );
--
-- (Décommentez et exécutez manuellement dans Supabase SQL Editor
--  après le premier import CSV.)
