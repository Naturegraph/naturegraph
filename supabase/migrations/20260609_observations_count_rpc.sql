-- 20260609_observations_count_rpc.sql
-- =============================================================================
-- Stat "Impact > Observations" : passe du nombre de POSTS au CUMUL D'ESPECES
-- (Nicolas 2026-06-08 : vrai nombre d'observations reel, pas le nombre de post).
--
-- Regle de comptage par post publie :
--   - post carnet (notebook_id non null)        -> species_count du carnet
--   - post mono-espece (espece identifiee/nommee) -> 1   (partage de base preserve)
--   - Instant nature (sans espece)              -> 0
-- Exclut les comptes internes (profiles.is_internal).
--
-- SECURITY INVOKER : la fonction s'execute en tant qu'appelant -> les RLS de
-- posts / notebooks / profiles s'appliquent (lecture publique des posts/carnets
-- publies). Pas de SECURITY DEFINER (evite un avertissement advisor + plus sur).
-- =============================================================================

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
      WHEN p.species_identified IS TRUE OR p.species_name IS NOT NULL THEN 1
      ELSE 0
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
