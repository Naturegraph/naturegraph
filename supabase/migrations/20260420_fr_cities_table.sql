-- ============================================================
-- Migration : Table de référence des communes françaises
-- ============================================================
-- Source : geo.api.gouv.fr (données IGN/INSEE, licence ODbL)
-- ~35 000 communes + DROM-COM (codes 97x).
--
-- Cette table est peuplée via le script de seed séparé :
--   scripts/seed-fr-cities.ts
-- Elle est mise à jour annuellement (données INSEE stables).
--
-- Usage : résolution de ville depuis l'autocomplete +
--         reverse geocoding (plus proche voisin PostGIS).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fr_cities (
  -- Code INSEE officiel (5 caractères) — clé primaire
  -- Ex : '38185' = Grenoble, '75056' = Paris
  insee_code      CHAR(5)  PRIMARY KEY,

  -- Nom officiel de la commune (ex: "Grenoble", "Saint-Étienne")
  name            TEXT     NOT NULL,

  -- Nom normalisé pour la recherche floue (minuscules, sans accents)
  -- Ex: "saint-etienne", "grenoble"
  name_normalized TEXT     NOT NULL,

  -- Code région INSEE (ex: '84' = Auvergne-Rhône-Alpes)
  region_code     CHAR(2)  NOT NULL,

  -- Nom complet de la région
  region_name     TEXT     NOT NULL,

  -- Code département (ex: '38', '2A', '974')
  department_code CHAR(3)  NOT NULL,

  -- Nom du département (ex: "Isère", "Corse-du-Sud")
  department_name TEXT     NOT NULL,

  -- Population (données INSEE, mise à jour irrégulière)
  population      INTEGER,

  -- Centroïde géographique de la commune
  -- Utilisé pour : reverse geocoding, nearest neighbor search
  centroid        GEOGRAPHY(POINT, 4326) NOT NULL
);

-- ─── Index pour l'autocomplete ────────────────────────────────
-- Trigram sur name_normalized — permet les recherches floues rapides
-- (ex: "grenble" → "grenoble", "st etienne" → "saint-etienne")
CREATE INDEX IF NOT EXISTS idx_fr_cities_name_trigram
  ON public.fr_cities USING GIN (name_normalized gin_trgm_ops);

-- Index sur le nom exact pour les correspondances parfaites
CREATE INDEX IF NOT EXISTS idx_fr_cities_name_exact
  ON public.fr_cities (name_normalized);

-- ─── Index spatial pour reverse geocoding ────────────────────
-- Permet ST_DWithin / nearest neighbor en O(log n)
CREATE INDEX IF NOT EXISTS idx_fr_cities_centroid_gist
  ON public.fr_cities USING GIST (centroid);

-- ─── Index utilitaires ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fr_cities_region_code
  ON public.fr_cities (region_code);

CREATE INDEX IF NOT EXISTS idx_fr_cities_department_code
  ON public.fr_cities (department_code);

-- ─── Commentaires ────────────────────────────────────────────

COMMENT ON TABLE public.fr_cities
  IS 'Référentiel INSEE des communes françaises. Seed via scripts/seed-fr-cities.ts. Mise à jour annuelle.';

COMMENT ON COLUMN public.fr_cities.name_normalized
  IS 'Nom en minuscules sans accents pour la recherche trigram. Ex: saint-etienne';

COMMENT ON COLUMN public.fr_cities.centroid
  IS 'Centroïde officiel IGN. Utilisé côté serveur uniquement pour ST_DWithin et nearest neighbor.';

-- ─── Fonction : autocomplete ville ───────────────────────────
-- RPC exposée au client via Supabase (read-only, sécurisée)
-- Retourne max 5 résultats classés par similarité puis population.

CREATE OR REPLACE FUNCTION public.search_cities(
  query TEXT,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  insee_code      CHAR(5),
  name            TEXT,
  region_name     TEXT,
  department_name TEXT,
  department_code CHAR(3),
  population      INTEGER,
  centroid_lat    DOUBLE PRECISION,
  centroid_lng    DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Similarité trigram minimum 0.2 (assez permissif pour fautes de frappe)
    similarity(c.name_normalized, lower(unaccent(query))) > 0.2
    OR c.name_normalized LIKE lower(unaccent(query)) || '%'
  ORDER BY
    -- Priorité 1 : similarité trigram décroissante
    similarity(c.name_normalized, lower(unaccent(query))) DESC,
    -- Priorité 2 : population décroissante (grandes villes en premier)
    c.population DESC NULLS LAST
  LIMIT max_results;
$$;

-- Accès en lecture pour tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.search_cities(TEXT, INT) TO authenticated;

-- ─── Fonction : reverse geocoding ────────────────────────────
-- Trouve la commune la plus proche d'un point GPS.
-- Usage : quand l'utilisateur accepte la géoloc navigateur.

CREATE OR REPLACE FUNCTION public.reverse_geocode_city(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  max_distance_km INT DEFAULT 50
)
RETURNS TABLE (
  insee_code      CHAR(5),
  name            TEXT,
  region_name     TEXT,
  department_name TEXT,
  department_code CHAR(3),
  distance_km     DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.insee_code,
    c.name,
    c.region_name,
    c.department_name,
    c.department_code,
    ST_Distance(
      c.centroid,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM public.fr_cities c
  WHERE ST_DWithin(
    c.centroid,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    max_distance_km * 1000
  )
  ORDER BY c.centroid <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_geocode_city(DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated;
