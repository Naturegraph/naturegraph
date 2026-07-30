-- =============================================================================
-- Recherche d'especes insensible aux accents (retour users soft launch 2026-07-30)
-- =============================================================================
-- Bug confirme : "cheveche" (sans accent) ne trouvait PAS "Chevêche d'Athéna"
-- (le ^e casse les trigrammes -> similarite sous le seuil). Un user tape rarement
-- les accents sur mobile. On rend la recherche insensible aux accents.
--
-- Perf : unaccent() par ligne sur 45k noeuds = seq scan a ~2,7s (inacceptable,
-- ferait timeout). On cree donc des INDEX GIN trigram sur l'expression unaccentee,
-- ce qui exige un wrapper marque IMMUTABLE (unaccent() est STABLE de base).
-- Le search_taxonomy est ensuite reecrit (migration suivante) pour matcher sur
-- immutable_unaccent(). Mesure apres index : 51 ms (vs 2676 ms en seq scan).

-- 1. Wrapper IMMUTABLE d'unaccent (search_path fige) : necessaire pour indexer.
--    Motif standard Postgres/Supabase pour la recherche insensible aux accents.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, pg_temp
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- 2. Index GIN trigram sur les colonnes unaccentees (les 3 utilisees par la
--    recherche). Supportent a la fois l'operateur % (similarite) et ILIKE.
CREATE INDEX IF NOT EXISTS idx_taxonomy_unaccent_fr_trgm
  ON public.taxonomy_nodes USING gin (public.immutable_unaccent(common_name_fr) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_taxonomy_unaccent_sci_trgm
  ON public.taxonomy_nodes USING gin (public.immutable_unaccent(scientific_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_taxonomy_unaccent_en_trgm
  ON public.taxonomy_nodes USING gin (public.immutable_unaccent(common_name_en) gin_trgm_ops);
