-- ============================================================
-- Migration : Localisation utilisateur privacy-first
-- ============================================================
-- Ajoute les champs de localisation zonée sur profiles.
-- Principe : on stocke un centroïde de ville (geometry) côté
-- serveur uniquement — jamais exposé côté client via la vue
-- profiles_public créée dans la migration suivante.
--
-- Règles privacY :
--   - radius minimum 75 km (enforced par check constraint + edge fn)
--   - location_point jamais dans les SELECT publics
--   - visibility contrôle ce que voient les autres utilisateurs
-- ============================================================

-- Activer pg_trgm pour l'autocomplete ville (recherche floue)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Champs localisation sur profiles ────────────────────────

ALTER TABLE public.profiles
  -- Nom de ville canonique (ex: "Grenoble")
  ADD COLUMN IF NOT EXISTS city_name       TEXT,
  -- Région administrative (ex: "Auvergne-Rhône-Alpes")
  ADD COLUMN IF NOT EXISTS region_name     TEXT,
  -- Code pays ISO 3166-1 alpha-2 (défaut FR)
  ADD COLUMN IF NOT EXISTS country_code    CHAR(2)    DEFAULT 'FR',
  -- Centroïde de la ville — JAMAIS exposé publiquement
  -- Utilisé uniquement pour ST_DWithin côté serveur
  ADD COLUMN IF NOT EXISTS location_point  GEOGRAPHY(POINT, 4326),
  -- Rayon de partage déclaré par l'utilisateur (75–500 km)
  -- Minimum 75 km : garantit qu'une ville ≠ un individu en zone rurale
  ADD COLUMN IF NOT EXISTS location_radius_km INT DEFAULT 75
    CHECK (location_radius_km BETWEEN 75 AND 500),
  -- Ce que voient les autres utilisateurs :
  --   'private'  → rien
  --   'region'   → région seulement (défaut)
  --   'city'     → ville + région
  ADD COLUMN IF NOT EXISTS location_visibility TEXT DEFAULT 'region'
    CHECK (location_visibility IN ('private', 'region', 'city')),
  -- Source du consentement pour l'audit RGPD
  --   'browser'    → géolocalisation navigateur acceptée
  --   'manual'     → saisie manuelle ville
  --   'onboarding' → flow onboarding
  --   'settings'   → modifié depuis Settings
  ADD COLUMN IF NOT EXISTS location_consent_source TEXT
    CHECK (location_consent_source IN ('browser', 'manual', 'onboarding', 'settings')),
  -- Timestamp du dernier changement de localisation (audit + throttle)
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- ─── Index spatial sur location_point ────────────────────────
-- Indispensable pour les requêtes ST_DWithin performantes
-- (bench cible : < 150ms p95 sur 100k profils)

CREATE INDEX IF NOT EXISTS idx_profiles_location_gist
  ON public.profiles USING GIST (location_point)
  WHERE location_point IS NOT NULL;

-- ─── Trigger : purge location_point à la suppression du profil ──
-- Sécurité RGPD : le DELETE ON CASCADE du FK auth.users ne suffit
-- pas si la row profile est supprimée manuellement avant auth.users.

CREATE OR REPLACE FUNCTION public.purge_profile_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Réinitialise toutes les données de localisation
  NEW.city_name              := NULL;
  NEW.region_name            := NULL;
  NEW.location_point         := NULL;
  NEW.location_consent_source := NULL;
  NEW.location_updated_at    := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger déclenché si on met location_point à NULL explicitement
-- (bouton "Effacer ma localisation" dans Settings)
DROP TRIGGER IF EXISTS trg_purge_profile_location ON public.profiles;
CREATE TRIGGER trg_purge_profile_location
  BEFORE UPDATE OF location_point ON public.profiles
  FOR EACH ROW
  WHEN (NEW.location_point IS NULL AND OLD.location_point IS NOT NULL)
  EXECUTE FUNCTION public.purge_profile_location();

-- ─── Commentaires colonnes ────────────────────────────────────

COMMENT ON COLUMN public.profiles.city_name
  IS 'Ville déclarée par l''utilisateur (affichée selon location_visibility)';

COMMENT ON COLUMN public.profiles.region_name
  IS 'Région administrative (affichée selon location_visibility)';

COMMENT ON COLUMN public.profiles.location_point
  IS 'Centroïde ville — usage serveur uniquement (ST_DWithin). JAMAIS exposé au client.';

COMMENT ON COLUMN public.profiles.location_radius_km
  IS 'Rayon de partage déclaré [75–500 km]. 75 km = valeur privacy-safe minimum.';

COMMENT ON COLUMN public.profiles.location_visibility
  IS 'Granularité affichée aux autres : private | region | city';

COMMENT ON COLUMN public.profiles.location_consent_source
  IS 'Origine du consentement RGPD : browser | manual | onboarding | settings';
