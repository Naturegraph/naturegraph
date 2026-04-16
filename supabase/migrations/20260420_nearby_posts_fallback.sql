-- ============================================================
-- 20260420_nearby_posts_fallback.sql
-- Mise à jour : nearby_posts avec fallback feed national
-- ============================================================
-- Objectif : si la zone géolocalisée de l'utilisateur contient
-- moins de 10 posts, compléter avec des posts récents du feed
-- national (non déjà inclus), jusqu'à atteindre result_limit.
--
-- Colonne ajoutée : is_nearby BOOLEAN
--   - TRUE  = post dans la zone géolocalisée de l'utilisateur
--   - FALSE = post de remplissage (feed national)
--
-- Le frontend peut utiliser is_nearby pour afficher un badge
-- ou séparer visuellement les deux types de résultats.
--
-- Throttle 1h conservé dans update_user_location (inchangé).
-- Seuil fallback : FALLBACK_THRESHOLD = 10 posts
-- ============================================================

CREATE OR REPLACE FUNCTION nearby_posts(
  requesting_user_id UUID,
  result_limit       INT DEFAULT 20,
  result_offset      INT DEFAULT 0
)
RETURNS TABLE(post_id UUID, distance_km FLOAT, is_nearby BOOLEAN)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_location_point  GEOGRAPHY;
  v_radius_km       INT;
  v_nearby_count    INT;
  FALLBACK_THRESHOLD CONSTANT INT := 10;
BEGIN
  -- 1. Récupérer la localisation du requester
  --    location_point n'est jamais exposé côté client (SECURITY DEFINER)
  SELECT p.location_point, p.location_radius_km
  INTO   v_location_point, v_radius_km
  FROM   profiles p
  WHERE  p.id = requesting_user_id;

  -- 2. Pas de localisation → feed vide (le client affiche le CTA)
  IF v_location_point IS NULL THEN
    RETURN;
  END IF;

  -- Rayon par défaut 75 km si NULL (sécurité côté DB)
  v_radius_km := COALESCE(v_radius_km, 75);

  -- 3. Posts géolocalisés dans le rayon
  RETURN QUERY
  WITH nearby AS (
    SELECT
      po.id                                                              AS post_id,
      ST_Distance(v_location_point, po.location_point) / 1000.0         AS distance_km,
      TRUE                                                               AS is_nearby
    FROM posts po
    WHERE po.status = 'published'
      AND po.location_point IS NOT NULL
      AND ST_DWithin(
            v_location_point,
            po.location_point,
            v_radius_km * 1000  -- ST_DWithin attend des mètres
          )
    ORDER BY distance_km ASC
    LIMIT  result_limit
    OFFSET result_offset
  ),

  -- Compte les résultats géolocalisés pour décider du fallback
  nearby_counted AS (
    SELECT * FROM nearby
  ),

  -- 4. Fallback : posts récents hors zone si résultats < seuil
  --    Exclut les posts déjà présents (anti-doublon)
  fallback AS (
    SELECT
      po.id     AS post_id,
      NULL      AS distance_km,
      FALSE     AS is_nearby
    FROM posts po
    WHERE po.status = 'published'
      AND po.id NOT IN (SELECT post_id FROM nearby_counted)
      -- Inclure uniquement si le feed géo est trop vide
      AND (SELECT COUNT(*) FROM nearby_counted) < FALLBACK_THRESHOLD
    ORDER BY po.created_at DESC
    LIMIT GREATEST(0, result_limit - (SELECT COUNT(*)::INT FROM nearby_counted))
  )

  SELECT * FROM nearby_counted
  UNION ALL
  SELECT * FROM fallback;

END;
$$;

-- Commentaire de fonction
COMMENT ON FUNCTION nearby_posts(UUID, INT, INT) IS
  'Retourne les posts dans la zone de l''utilisateur (is_nearby=TRUE) + fallback '
  'feed national (is_nearby=FALSE) si moins de 10 résultats géolocalisés. '
  'SECURITY DEFINER : location_point jamais exposé au client.';
