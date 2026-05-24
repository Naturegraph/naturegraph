-- ============================================================================
-- 20260523_backfill_posts_country.sql
-- ----------------------------------------------------------------------------
-- Backfill posts.country pour les posts existants sans pays renseigné.
--
-- Contexte (Nicolas 2026-05-23) : on assouplit la règle privacy pour afficher
-- au minimum le pays de l'observation même quand la localisation est privée
-- (« France », « Canada », « autre ») afin que les autres users aient une
-- idée biogéographique sans compromettre la vie privée.
--
-- Heuristiques (ordre de priorité) :
--   1. region == 'Québec' → Canada
--   2. region IN noms régions FR connues OU department_code numérique → France
--   3. latitude/longitude présents (avant blur trigger ou si location_hidden=false)
--      · lng < -50 et lat > 40 → Canada
--      · lng entre -5 et 10 et lat entre 41 et 51 → France
--   4. Sinon : laisser NULL (impossible de deviner sans risque d'erreur)
--
-- Re-jouable sans dommage : UPDATE filtre les NULL uniquement.
-- ============================================================================

BEGIN;

-- ─── 1. Posts avec region == Québec → Canada ─────────────────────────────────
UPDATE public.posts
SET country = 'Canada'
WHERE country IS NULL
  AND region IS NOT NULL
  AND lower(unaccent(region)) IN ('quebec', 'québec');

-- ─── 2. Posts avec une région FR connue → France ─────────────────────────────
-- Liste fermée des 18 régions administratives françaises (métropole + outre-mer).
UPDATE public.posts
SET country = 'France'
WHERE country IS NULL
  AND region IS NOT NULL
  AND lower(unaccent(region)) IN (
    'auvergne-rhone-alpes',
    'bourgogne-franche-comte',
    'bretagne',
    'centre-val de loire',
    'corse',
    'grand est',
    'hauts-de-france',
    'ile-de-france',
    'normandie',
    'nouvelle-aquitaine',
    'occitanie',
    'pays de la loire',
    'provence-alpes-cote d''azur',
    'guadeloupe',
    'martinique',
    'guyane',
    'la reunion',
    'mayotte'
  );

-- ─── 3. Fallback géographique via lat/lng (si encore exposés) ────────────────
-- France métropolitaine + DROM proches (lng > -5, lat 41-51).
UPDATE public.posts
SET country = 'France'
WHERE country IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 41 AND 51
  AND longitude BETWEEN -5 AND 10;

-- Canada (lng très négatif, lat 41-83).
UPDATE public.posts
SET country = 'Canada'
WHERE country IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 41 AND 83
  AND longitude BETWEEN -141 AND -52;

COMMIT;

-- ─── Audit : combien de posts ont été enrichis ? ─────────────────────────────
-- À exécuter manuellement après application si curiosité :
--   SELECT country, COUNT(*) FROM posts GROUP BY country ORDER BY 2 DESC;
