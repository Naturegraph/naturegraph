-- =============================================================================
-- 20260606_posts_public_show_country.sql
-- =============================================================================
-- NG (Nicolas 2026-06-06) : afficher AU MOINS le pays (France / Canada) sur les
-- publications, MEME quand la localisation est privee (location_hidden = true).
--
-- Contexte : la quasi-totalite des posts beta sont en localisation privee mais
-- renseignent un pays. La vue `posts_public` masquait `country` (avec city /
-- region / location_name / coordonnees) -> aucune localisation affichee.
--
-- Le pays est un repere biogeographique tres grossier, non sensible pour la vie
-- privee. On l'expose donc toujours, tout en CONTINUANT de masquer les donnees
-- fines (ville, region, nom de lieu, latitude, longitude, point GPS) lorsque le
-- post est prive et que le viewer n'est pas l'auteur.
--
-- Le front (FeedSection) etait deja prevu pour afficher `country` en mode prive.
-- Cast en character varying (non borne) pour conserver le type de colonne
-- d'origine de la vue (contrainte CREATE OR REPLACE VIEW).
--
-- Applique manuellement via MCP sur prod (hrxgduvworofnrjmgpcj) et dev
-- (nkgdgxwejqqnqmwqwegy) le 2026-06-06.
-- =============================================================================

-- IMPORTANT : security_invoker = true OBLIGATOIRE. Sans cette option, la vue
-- s'execute avec les droits du proprietaire et CONTOURNE les RLS de `posts`
-- (le filtre NOT is_internal_user + visibilite/statut ne s'appliquent plus) ->
-- posts internes/prives exposes publiquement. Toujours la conserver lors d'un
-- CREATE OR REPLACE VIEW (l'option n'est PAS preservee automatiquement).
CREATE OR REPLACE VIEW public.posts_public
  WITH (security_invoker = true)
AS
 SELECT id,
    short_id,
    user_id,
    type,
    status,
    visibility,
    title,
    description,
    tags,
    encounter_date,
    time_of_day,
    weather,
    habitat,
    multiple_observations,
    individuals_count,
    species_identified,
    species_name,
    scientific_name,
    taxonomic_group,
    identification_status,
    taxref_id,
    taxref_rank,
    taxref_source,
    taxref_license,
    taxref_updated_at,
    phenomenon,
    display_format,
    likes_count,
    comments_count,
    shares_count,
    views_count,
    created_at,
    updated_at,
    published_at,
    location_hidden,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
            ELSE city
        END AS city,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
            ELSE region
        END AS region,
    -- Pays toujours visible (repere grossier, non sensible).
    (country)::character varying AS country,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
            ELSE location_name
        END AS location_name,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::numeric
            ELSE latitude
        END AS latitude,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::numeric
            ELSE longitude
        END AS longitude,
        CASE
            WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::geography
            ELSE location_point
        END AS location_point
   FROM posts;
