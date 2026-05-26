-- ============================================================
-- V1.1.0 prep : RPC search_taxonomy (especes + familles + ordres)
-- Date : 2026-05-26
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_taxonomy(
  p_query TEXT,
  p_territory TEXT DEFAULT NULL,
  p_ranks TEXT[] DEFAULT ARRAY['species','family','order'],
  p_class_filter TEXT DEFAULT NULL,
  p_max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID, rank TEXT, scientific_name TEXT,
  common_name_fr TEXT, common_name_en TEXT,
  class TEXT, "order" TEXT, family TEXT,
  photo_url TEXT, popularity INTEGER, match_score REAL
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.rank, t.scientific_name, t.common_name_fr, t.common_name_en,
    t.class, t."order", t.family, t.photo_url, t.popularity,
    GREATEST(
      similarity(t.scientific_name, p_query),
      COALESCE(similarity(t.common_name_fr, p_query), 0),
      COALESCE(similarity(t.common_name_en, p_query), 0)
    )::REAL AS match_score
  FROM public.taxonomy_nodes t
  WHERE t.is_active = TRUE
    AND t.rank = ANY(p_ranks)
    AND (p_class_filter IS NULL OR t.class = p_class_filter)
    AND (p_territory IS NULL
         OR (p_territory = 'fr' AND t.available_in_fr = TRUE)
         OR (p_territory = 'ca' AND t.available_in_ca = TRUE))
    AND (t.scientific_name % p_query
         OR t.common_name_fr % p_query
         OR t.common_name_en % p_query
         OR t.scientific_name ILIKE p_query || '%'
         OR t.common_name_fr ILIKE p_query || '%'
         OR t.common_name_en ILIKE p_query || '%')
  ORDER BY
    CASE t.rank WHEN 'species' THEN 1 WHEN 'genus' THEN 2 WHEN 'family' THEN 3 WHEN 'order' THEN 4 ELSE 5 END,
    match_score DESC, t.popularity DESC, t.scientific_name
  LIMIT p_max_results;
$$;

REVOKE EXECUTE ON FUNCTION public.search_taxonomy FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_taxonomy TO authenticated, anon;
