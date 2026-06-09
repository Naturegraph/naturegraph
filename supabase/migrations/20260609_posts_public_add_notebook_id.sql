-- 20260609_posts_public_add_notebook_id.sql
-- =============================================================================
-- V1.2.0 (NG-005/006) : exposer notebook_id dans la vue publique des posts.
--
-- Probleme : le feed lit `posts_public` (POST_FEED_SELECT = *). La vue ne
-- contenait PAS la colonne notebook_id, donc le front ne savait jamais qu'un
-- post etait issu d'un carnet d'observations -> il affichait les chips espece
-- classiques au lieu de la carte carnet repliable (NotebookCardInFeed).
--
-- Fix : on recree la vue en ajoutant notebook_id en fin de SELECT.
--
-- IMPORTANT : WITH (security_invoker = true) est OBLIGATOIRE et n'est PAS
-- preserve par CREATE OR REPLACE VIEW. Sans lui, la vue s'execute en tant que
-- proprietaire et contourne les RLS de `posts` (fuite de posts internes/prives,
-- cf. incident 2026-06-06). Toujours le respecifier.
-- =============================================================================

CREATE OR REPLACE VIEW public.posts_public WITH (security_invoker = true) AS
SELECT
  id,
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
  END AS location_point,
  -- NOUVEAU : lien vers le carnet d'observations (post multi-especes).
  notebook_id,
  -- NOUVEAU : nb d'especes du carnet lie, pour afficher "Especes (N)" dans le
  -- feed sans fetch (carte repliee). Sous-requete soumise aux RLS de notebooks
  -- (lecture publique des carnets publies via notebooks_public_read_published).
  (SELECT n.species_count FROM public.notebooks n WHERE n.id = posts.notebook_id) AS notebook_species_count
FROM posts;
