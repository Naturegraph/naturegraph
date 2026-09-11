-- ============================================================================
-- PERF : search_cities utilise enfin son index GIN trigram
-- ============================================================================
--
-- SYMPTOME (retours utilisateurs "l'app rame", sept. 2026) :
--   L'autocompletion du lieu mettait ~750 ms par frappe (EXPLAIN : 757 ms ;
--   pg_stat_statements : 732 ms de moyenne sur 1019 appels, 2e requete la plus
--   couteuse de toute la base).
--
-- CAUSE :
--   La fonction filtrait avec `similarity(name_normalized, q) > 0.2`. Cette
--   forme n'est PAS indexable : seul l'operateur `%` de pg_trgm sait utiliser
--   un index GIN trgm. L'index `idx_fr_cities_name_trigram` existait mais
--   n'etait JAMAIS utilise -> seq scan des 35 457 communes a CHAQUE frappe.
--
-- CORRECTIF :
--   Utiliser l'operateur `%` (indexable) + le LIKE 'prefixe%' (indexable aussi),
--   les deux passant par l'index via un BitmapOr. Le seuil de similarite est
--   fixe a 0.2 AU DEBUT DE LA FONCTION via set_limit(0.2) : c'est la parite
--   EXACTE avec l'ancien `> 0.2`. NB : le SET de la GUC pg_trgm au niveau
--   fonction est refuse sur Supabase (permission denied), d'ou set_limit().
--   La fonction passe donc de sql STABLE a plpgsql (set_limit est volatile).
--
-- PARITE VERIFIEE APRES APPLICATION : 18 termes reels (grenobl, st etienne,
--   paris, quebec, levis, montreal, lyon, marseil, bordeau, toulous, nice,
--   colmar, chamoni, ann, sain, villeneuve, aix, le mans) -> listes d'insee_code
--   STRICTEMENT IDENTIQUES a l'ancienne version. Perf : 757 ms -> ~6 ms a chaud.
--
-- ROLLBACK : bloc commente en fin de fichier.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_cities(query text, max_results integer DEFAULT 5)
RETURNS TABLE(
  insee_code character,
  name text,
  region_name text,
  department_name text,
  department_code character,
  population integer,
  centroid_lat double precision,
  centroid_lng double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Seuil trigram 0.2 = parite EXACTE avec l'ancien `similarity(...) > 0.2`.
  PERFORM set_limit(0.2);

  RETURN QUERY
  SELECT
    c.insee_code,
    c.name,
    c.region_name,
    c.department_name,
    c.department_code,
    c.population,
    ST_Y(c.centroid::geometry)  AS centroid_lat,
    ST_X(c.centroid::geometry)  AS centroid_lng
  FROM public.fr_cities c
  WHERE
    c.name_normalized % lower(public.immutable_unaccent(query))
    OR c.name_normalized LIKE lower(public.immutable_unaccent(query)) || '%'
  ORDER BY
    similarity(c.name_normalized, lower(public.immutable_unaccent(query))) DESC,
    c.population DESC NULLS LAST
  LIMIT max_results;
END;
$function$;

-- ============================================================================
-- ROLLBACK (version precedente, seq scan) :
--
--   CREATE OR REPLACE FUNCTION public.search_cities(query text, max_results integer DEFAULT 5)
--   RETURNS TABLE(insee_code character, name text, region_name text, department_name text,
--                 department_code character, population integer,
--                 centroid_lat double precision, centroid_lng double precision)
--   LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
--   AS $f$
--     SELECT c.insee_code, c.name, c.region_name, c.department_name, c.department_code,
--            c.population, ST_Y(c.centroid::geometry), ST_X(c.centroid::geometry)
--     FROM public.fr_cities c
--     WHERE similarity(c.name_normalized, lower(public.immutable_unaccent(query))) > 0.2
--        OR c.name_normalized LIKE lower(public.immutable_unaccent(query)) || '%'
--     ORDER BY similarity(c.name_normalized, lower(public.immutable_unaccent(query))) DESC,
--              c.population DESC NULLS LAST
--     LIMIT max_results;
--   $f$;
-- ============================================================================
