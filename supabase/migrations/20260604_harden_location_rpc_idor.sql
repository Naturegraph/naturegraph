-- =============================================================================
-- 20260604_harden_location_rpc_idor.sql
-- =============================================================================
-- Durcissement securite (Nicolas 2026-06-04, audit infra V1.1.5).
--
-- Contexte : les fonctions SECURITY DEFINER `update_user_location` et
-- `clear_user_location` acceptaient un parametre `p_user_id` SANS verifier
-- qu'il correspond a l'appelant (`auth.uid()`). Un utilisateur authentifie
-- pouvait donc modifier ou effacer la localisation d'un AUTRE compte (faille
-- de type IDOR / acces horizontal).
--
-- Correctif : garde non-cassante.
--   - Appel client (auth.uid() present) : rejet si p_user_id <> auth.uid().
--   - Appel service-role / interne (auth.uid() NULL) : autorise (confiance
--     serveur, ex : suppression RGPD cote backend).
-- Le frontend (LocationContext) appelle toujours avec l'id du user courant,
-- donc aucun changement de comportement legitime.
--
-- Definitions originales sauvegardees dans backup.function_defs_20260604.
-- Applique en prod via MCP le 2026-06-04 (projet unique hrxgduvworofnrjmgpcj).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_user_location(
  p_user_id uuid,
  p_city_name text,
  p_region_name text,
  p_country_code character,
  p_centroid_lat double precision,
  p_centroid_lng double precision,
  p_radius_km integer,
  p_visibility text,
  p_consent_source text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_update TIMESTAMPTZ;
BEGIN
  -- Garde IDOR : un appelant authentifie ne modifie QUE sa propre localisation.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF p_radius_km < 75 OR p_radius_km > 500 THEN
    RETURN jsonb_build_object('error', 'radius_out_of_range', 'min', 75, 'max', 500);
  END IF;

  IF p_visibility NOT IN ('private', 'region', 'city') THEN
    RETURN jsonb_build_object('error', 'invalid_visibility');
  END IF;

  SELECT location_updated_at INTO v_last_update
  FROM public.profiles WHERE id = p_user_id;

  IF v_last_update IS NOT NULL
    AND v_last_update > NOW() - INTERVAL '1 hour' THEN
    RETURN jsonb_build_object(
      'error', 'rate_limited',
      'retry_after', EXTRACT(EPOCH FROM (v_last_update + INTERVAL '1 hour' - NOW()))::INT
    );
  END IF;

  UPDATE public.profiles SET
    city_name               = p_city_name,
    region_name             = p_region_name,
    country_code            = p_country_code,
    location_point          = ST_SetSRID(ST_MakePoint(p_centroid_lng, p_centroid_lat), 4326)::geography,
    location_radius_km      = p_radius_km,
    location_visibility     = p_visibility,
    location_consent_source = p_consent_source,
    location_updated_at     = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_user_location(p_user_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.profiles SET
    city_name               = NULL,
    region_name             = NULL,
    country_code            = 'FR',
    location_point          = NULL,
    location_radius_km      = 75,
    location_visibility     = 'region',
    location_consent_source = NULL,
    location_updated_at     = NOW()
  WHERE id = p_user_id
    AND (auth.uid() IS NULL OR auth.uid() = p_user_id);
$function$;
