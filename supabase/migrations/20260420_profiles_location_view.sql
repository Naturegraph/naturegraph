-- ============================================================
-- Migration : Vue profiles_public + RLS localisation
-- ============================================================
-- Vue publique qui masque location_point (coordonnées brutes)
-- et applique la logique de visibilité choisie par l'utilisateur.
--
-- RGPD : location_point ne doit JAMAIS apparaître dans une réponse
-- client, même pour les utilisateurs authentifiés. Seuls les calculs
-- serveur (ST_DWithin) y accèdent via SECURITY DEFINER.
-- ============================================================

-- ─── Vue publique profiles ────────────────────────────────────

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.interests,
  p.is_public,
  p.posts_count,
  p.followers_count,
  p.following_count,
  p.created_at,
  -- Localisation affichée selon le choix de visibilité :
  --   'private' → NULL (rien ne fuite)
  --   'region'  → région seulement
  --   'city'    → "Grenoble · Auvergne-Rhône-Alpes"
  CASE p.location_visibility
    WHEN 'private' THEN NULL
    WHEN 'region'  THEN p.region_name
    WHEN 'city'    THEN
      CASE
        WHEN p.city_name IS NOT NULL AND p.region_name IS NOT NULL
          THEN p.city_name || ' · ' || p.region_name
        WHEN p.city_name IS NOT NULL THEN p.city_name
        ELSE p.region_name
      END
    ELSE NULL
  END AS location_label,
  -- Code pays exposé (non sensible, utile pour le drapeau emoji)
  CASE p.location_visibility
    WHEN 'private' THEN NULL
    ELSE p.country_code
  END AS country_code,
  -- Rayon de partage exposé (non sensible, utile pour l'affichage UX)
  CASE p.location_visibility
    WHEN 'private' THEN NULL
    ELSE p.location_radius_km
  END AS location_radius_km,
  p.location_visibility
  -- IMPORTANT : location_point est DÉLIBÉRÉMENT absent de cette vue.
FROM public.profiles p;

COMMENT ON VIEW public.profiles_public
  IS 'Vue publique de profiles. Ne contient JAMAIS location_point (coordonnées brutes). Applique la logique de visibilité.';

-- ─── Fonction : feed géolocalisé ─────────────────────────────
-- Retourne les posts dans le rayon déclaré par l'utilisateur courant.
-- SECURITY DEFINER pour accéder à location_point sans l'exposer.

CREATE OR REPLACE FUNCTION public.nearby_posts(
  requesting_user_id UUID,
  result_limit       INT DEFAULT 20,
  result_offset      INT DEFAULT 0
)
RETURNS TABLE (
  post_id     UUID,
  distance_km DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH requester AS (
    SELECT
      location_point,
      location_radius_km
    FROM public.profiles
    WHERE id = requesting_user_id
      AND location_point IS NOT NULL
  )
  SELECT
    p.id           AS post_id,
    ST_Distance(
      pr.location_point,
      requester.location_point
    ) / 1000       AS distance_km
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  CROSS JOIN requester
  WHERE
    p.status = 'published'
    AND p.visibility = 'public'
    AND pr.location_point IS NOT NULL
    AND pr.location_visibility != 'private'
    AND ST_DWithin(
      pr.location_point,
      requester.location_point,
      requester.location_radius_km * 1000
    )
  ORDER BY p.created_at DESC
  LIMIT  result_limit
  OFFSET result_offset;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_posts(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.nearby_posts
  IS 'Posts dans le rayon de l''utilisateur. SECURITY DEFINER : accède à location_point sans l''exposer.';

-- ─── Fonction : update localisation utilisateur ──────────────
-- Centralise la mise à jour avec throttle 1h + validation radius.

CREATE OR REPLACE FUNCTION public.update_user_location(
  p_user_id             UUID,
  p_city_name           TEXT,
  p_region_name         TEXT,
  p_country_code        CHAR(2),
  p_centroid_lat        DOUBLE PRECISION,
  p_centroid_lng        DOUBLE PRECISION,
  p_radius_km           INT,
  p_visibility          TEXT,
  p_consent_source      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_update TIMESTAMPTZ;
  v_result      JSONB;
BEGIN
  -- Validation du radius (double sécurité côté DB)
  IF p_radius_km < 75 OR p_radius_km > 500 THEN
    RETURN jsonb_build_object('error', 'radius_out_of_range', 'min', 75, 'max', 500);
  END IF;

  -- Validation de la visibilité
  IF p_visibility NOT IN ('private', 'region', 'city') THEN
    RETURN jsonb_build_object('error', 'invalid_visibility');
  END IF;

  -- Throttle : 1 update max par heure (anti-abus)
  SELECT location_updated_at INTO v_last_update
  FROM public.profiles WHERE id = p_user_id;

  IF v_last_update IS NOT NULL
    AND v_last_update > NOW() - INTERVAL '1 hour' THEN
    RETURN jsonb_build_object(
      'error', 'rate_limited',
      'retry_after', EXTRACT(EPOCH FROM (v_last_update + INTERVAL '1 hour' - NOW()))::INT
    );
  END IF;

  -- Mise à jour
  UPDATE public.profiles SET
    city_name              = p_city_name,
    region_name            = p_region_name,
    country_code           = p_country_code,
    location_point         = ST_SetSRID(ST_MakePoint(p_centroid_lng, p_centroid_lat), 4326)::geography,
    location_radius_km     = p_radius_km,
    location_visibility    = p_visibility,
    location_consent_source = p_consent_source,
    location_updated_at    = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_location(UUID, TEXT, TEXT, CHAR(2), DOUBLE PRECISION, DOUBLE PRECISION, INT, TEXT, TEXT) TO authenticated;

-- ─── Fonction : effacement localisation ──────────────────────

CREATE OR REPLACE FUNCTION public.clear_user_location(p_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET
    city_name               = NULL,
    region_name             = NULL,
    country_code            = 'FR',
    location_point          = NULL,
    location_radius_km      = 75,
    location_visibility     = 'region',
    location_consent_source = NULL,
    location_updated_at     = NOW()
  WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.clear_user_location(UUID) TO authenticated;

-- ─── RLS : policies localisation ─────────────────────────────
-- La table profiles a déjà RLS activé depuis 20260320_rls_policies.sql
-- On ajoute des policies spécifiques aux nouveaux champs.

-- Lecture via vue profiles_public : déjà permise par les policies existantes
-- (la vue filtre location_point côté SQL, pas besoin de policy dédiée).

-- Politique d'écriture : seul l'utilisateur peut modifier ses champs de localisation.
-- Note : la policy de UPDATE existante couvre déjà (auth.uid() = id),
-- on s'assure simplement que c'est en place.

DO $$
BEGIN
  -- Vérifie si une policy d'update existe, sinon la crée
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
