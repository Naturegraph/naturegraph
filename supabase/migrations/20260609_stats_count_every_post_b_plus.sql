-- 20260609_stats_count_every_post_b_plus.sql
-- =============================================================================
-- "Observations" = option B+ (Nicolas 2026-06-09) :
--   Chaque post publie compte AU MOINS 1 observation ; un carnet compte ses N
--   especes. Plus de post a 0 (un Instant nature ou une Rencontre sans espece
--   nommee reste une observation). Comptes internes exclus (Impact uniquement).
--
--   - carnet            -> species_count (min 1)
--   - tout autre post   -> 1
--
-- "Especes" reste = especes DISTINCTES identifiees (taxref_id distinct).
-- "ADN observateur" reste une repartition PAR ESPECE (distribution).
--
-- Avantages : intuitif, aucune observation ne vaut 0, pas de baisse mysterieuse
-- vs l'ancien "nombre de posts", et un carnet ajoute bien +N.
-- =============================================================================

-- ── Impact global (StatsSidebar) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_observations_count(
  p_start timestamptz,
  p_end timestamptz DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN p.notebook_id IS NOT NULL THEN GREATEST(COALESCE(n.species_count, 1), 1)
      ELSE 1
    END
  ), 0)::bigint
  FROM public.posts p
  LEFT JOIN public.notebooks n ON n.id = p.notebook_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.status = 'published'
    AND p.created_at >= p_start
    AND (p_end IS NULL OR p.created_at < p_end)
    AND COALESCE(pr.is_internal, false) = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_observations_count(timestamptz, timestamptz) TO anon, authenticated;

-- ── Stats profil (ProfileSidebar + semaine + ADN) ───────────────────────────
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
WITH user_posts AS (
  -- 1 ligne par POST publie de l'utilisateur (pour Obs = cumul B+)
  SELECT p.created_at, p.notebook_id, n.species_count
  FROM public.posts p
  LEFT JOIN public.notebooks n ON n.id = p.notebook_id
  WHERE p.user_id = p_user_id AND p.status = 'published'
),
species_rows AS (
  -- 1 ligne par (post, espece) pour Especes distinctes + ADN (par espece)
  SELECT
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
  'obs_total', (
    SELECT COALESCE(SUM(
      CASE WHEN notebook_id IS NOT NULL THEN GREATEST(COALESCE(species_count, 1), 1) ELSE 1 END
    ), 0) FROM user_posts
  ),
  'obs_week', (
    SELECT COALESCE(SUM(
      CASE WHEN notebook_id IS NOT NULL THEN GREATEST(COALESCE(species_count, 1), 1) ELSE 1 END
    ), 0) FROM user_posts
    WHERE p_week_start IS NULL OR created_at >= p_week_start
  ),
  'species_total', (SELECT count(DISTINCT taxref_id) FROM species_rows WHERE taxref_id IS NOT NULL),
  'classes', (
    SELECT COALESCE(jsonb_object_agg(grp, c), '{}'::jsonb)
    FROM (SELECT grp, count(*) AS c FROM species_rows WHERE taxref_id IS NOT NULL GROUP BY grp) g
  )
);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_observation_stats(uuid, timestamptz) TO anon, authenticated;
