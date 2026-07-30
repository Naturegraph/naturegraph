-- Reecrit search_taxonomy pour une recherche INSENSIBLE AUX ACCENTS, en
-- s'appuyant sur les index fonctionnels immutable_unaccent(...) gin_trgm_ops
-- crees dans la migration precedente. Seule la logique de MATCH et de SCORE
-- change (unaccent des deux cotes) ; le tri, les filtres et la signature restent
-- identiques. Corrige "je ne trouve pas la chevêche d'Athéna" (Hebus13).
CREATE OR REPLACE FUNCTION public.search_taxonomy(
  p_query text,
  p_territory text DEFAULT NULL::text,
  p_ranks text[] DEFAULT ARRAY['species'::text, 'family'::text, 'order'::text],
  p_class_filter text DEFAULT NULL::text,
  p_max_results integer DEFAULT 20)
 RETURNS TABLE(id uuid, rank text, scientific_name text, common_name_fr text, common_name_en text, class text, "order" text, family text, available_in_fr boolean, available_in_ca boolean, inaturalist_id integer, photo_url text, popularity integer, match_score real)
 LANGUAGE sql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH candidates AS (
    SELECT t.id, t.rank, t.scientific_name, t.common_name_fr, t.common_name_en,
      t.class, t."order", t.family,
      t.available_in_fr, t.available_in_ca, t.inaturalist_id,
      t.photo_url, t.popularity
    FROM public.taxonomy_nodes t
    WHERE t.is_active = TRUE
      AND t.rank = ANY(p_ranks)
      AND (p_class_filter IS NULL OR t.class = p_class_filter)
      AND (p_territory IS NULL
           OR (p_territory = 'fr' AND t.available_in_fr = TRUE)
           OR (p_territory = 'ca' AND t.available_in_ca = TRUE))
      -- Match INSENSIBLE AUX ACCENTS des deux cotes (index fonctionnels dedies).
      AND (public.immutable_unaccent(t.scientific_name) % public.immutable_unaccent(p_query)
           OR public.immutable_unaccent(t.common_name_fr) % public.immutable_unaccent(p_query)
           OR public.immutable_unaccent(t.common_name_en) % public.immutable_unaccent(p_query)
           OR public.immutable_unaccent(t.scientific_name) ILIKE public.immutable_unaccent(p_query) || '%'
           OR public.immutable_unaccent(t.common_name_fr) ILIKE public.immutable_unaccent(p_query) || '%'
           OR public.immutable_unaccent(t.common_name_en) ILIKE public.immutable_unaccent(p_query) || '%')
  )
  SELECT c.id, c.rank, c.scientific_name, c.common_name_fr, c.common_name_en,
    c.class, c."order", c.family,
    c.available_in_fr, c.available_in_ca, c.inaturalist_id,
    c.photo_url, c.popularity,
    GREATEST(
      similarity(public.immutable_unaccent(c.scientific_name), public.immutable_unaccent(p_query)),
      COALESCE(similarity(public.immutable_unaccent(c.common_name_fr), public.immutable_unaccent(p_query)), 0),
      COALESCE(similarity(public.immutable_unaccent(c.common_name_en), public.immutable_unaccent(p_query)), 0)
    )::REAL AS match_score
  FROM candidates c
  ORDER BY
    -- 1. Prefix match prioritaire (insensible aux accents).
    CASE
      WHEN public.immutable_unaccent(c.common_name_fr) ILIKE public.immutable_unaccent(p_query) || '%'
        OR public.immutable_unaccent(c.scientific_name) ILIKE public.immutable_unaccent(p_query) || '%'
        OR public.immutable_unaccent(c.common_name_en) ILIKE public.immutable_unaccent(p_query) || '%'
      THEN 0 ELSE 1
    END,
    -- 2. Espece / famille avant genre / ordre.
    CASE c.rank WHEN 'species' THEN 1 WHEN 'family' THEN 1 WHEN 'genus' THEN 2 WHEN 'order' THEN 3 ELSE 4 END,
    -- 3. Popularite (especes communes d'abord).
    c.popularity DESC,
    -- 4. Similarite trigram (insensible aux accents) en dernier recours.
    GREATEST(
      similarity(public.immutable_unaccent(c.scientific_name), public.immutable_unaccent(p_query)),
      COALESCE(similarity(public.immutable_unaccent(c.common_name_fr), public.immutable_unaccent(p_query)), 0),
      COALESCE(similarity(public.immutable_unaccent(c.common_name_en), public.immutable_unaccent(p_query)), 0)
    ) DESC,
    c.scientific_name
  LIMIT p_max_results;
$function$;
