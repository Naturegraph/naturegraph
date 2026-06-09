-- 20260609_user_observation_stats_rpc.sql
-- =============================================================================
-- Stats PROFIL alignees sur le cumul d'especes (Nicolas 2026-06-09) :
--   - Obs      = CUMUL des observations d'especes (chaque espece de chaque post
--                compte ; plusieurs obs d'une meme espece dans l'annee cumulent).
--   - Especes  = especes DISTINCTES (ne grossit pas si meme espece).
--   - Semaine  = cumul d'especes observees depuis p_week_start (4 especes dans
--                un post cette semaine = 4).
--   - classes  = repartition par GROUPE app (birds/mammals/...) pour l'ADN de
--                l'observateur, normalisee depuis la classe iNat des carnets.
--
-- Expansion : 1 ligne par (post, espece). Carnet -> ses observations ; sinon le
-- post mono-espece. SECURITY INVOKER : RLS appliquee (les observations des
-- carnets publies sont en lecture publique -> coherent quel que soit le viewer).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_observation_stats(
  p_user_id uuid,
  p_week_start timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
WITH rows AS (
  SELECT
    p.created_at,
    COALESCE(o.taxref_id, p.taxref_id) AS taxref_id,
    CASE COALESCE(o.vernacular_class, '')
      WHEN 'Aves' THEN 'birds'
      WHEN 'Mammalia' THEN 'mammals'
      WHEN 'Insecta' THEN 'insects'
      WHEN 'Amphibia' THEN 'amphibians'
      WHEN 'Reptilia' THEN 'reptiles'
      WHEN 'Actinopterygii' THEN 'fish'
      WHEN 'Arachnida' THEN 'arachnids'
      WHEN 'Mollusca' THEN 'mollusks'
      WHEN 'Plantae' THEN 'plants'
      ELSE COALESCE(NULLIF(p.taxonomic_group, ''), 'other')
    END AS grp
  FROM public.posts p
  LEFT JOIN public.notebook_observations o ON o.notebook_id = p.notebook_id
  WHERE p.user_id = p_user_id
    AND p.status = 'published'
    AND (p.notebook_id IS NOT NULL OR p.species_identified IS TRUE OR p.species_name IS NOT NULL)
)
SELECT jsonb_build_object(
  'obs_total', (SELECT count(*) FROM rows WHERE taxref_id IS NOT NULL),
  'species_total', (SELECT count(DISTINCT taxref_id) FROM rows WHERE taxref_id IS NOT NULL),
  'obs_week', (
    SELECT count(*) FROM rows
    WHERE taxref_id IS NOT NULL AND (p_week_start IS NULL OR created_at >= p_week_start)
  ),
  'classes', (
    SELECT COALESCE(jsonb_object_agg(grp, c), '{}'::jsonb)
    FROM (SELECT grp, count(*) AS c FROM rows WHERE taxref_id IS NOT NULL GROUP BY grp) g
  )
);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_observation_stats(uuid, timestamptz) TO anon, authenticated;
