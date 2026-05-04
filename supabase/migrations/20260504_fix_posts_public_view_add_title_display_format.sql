-- ============================================================================
-- Fix critique : vue posts_public n'exposait pas title et display_format
-- ============================================================================
--
-- Bug observe : meme apres le fix UI dans FeedSection.tsx (PR #65) qui priorise
-- item.title quand il existe, l'utilisateur voyait toujours ses 3 posts
-- "se melanger" car la vue posts_public ne contenait pas la colonne title
-- -> item.title = undefined cote frontend -> fallback vers description.
--
-- Cause racine
-- ------------
-- Migrations chronologiques :
--   2026-04-29 : posts.display_format ajoute (display_format text default '16:9')
--   2026-05-01 : posts.title ajoute (title text nullable)
--   2026-05-03 : posts_public view creee (mais SANS ces 2 nouvelles colonnes)
--
-- La vue posts_public a ete creee en listant explicitement chaque colonne au
-- lieu de SELECT *, ce qui est correct pour la securite (location masking)
-- mais a oublie d'inclure les 2 colonnes ajoutees recemment.
--
-- Toutes les lectures du feed passent par posts_public (cf. POSTS_READ_SOURCE
-- dans postService.ts) -> le frontend recevait NULL pour title et
-- display_format meme si ils etaient en DB.
--
-- Fix
-- ---
-- DROP + CREATE la vue avec :
--   - AJOUT title
--   - AJOUT display_format
--   - GARDE security_invoker = true (RLS user-scoped)
--   - GARDE location masking (location_hidden + user != owner)
--
-- Note : CREATE OR REPLACE ne peut pas etre utilise car Postgres interdit
-- de changer le nom/ordre des colonnes d'une vue existante. DROP requis.
-- ============================================================================

DROP VIEW IF EXISTS public.posts_public CASCADE;

CREATE VIEW public.posts_public WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  type,
  status,
  visibility,
  title,                    -- AJOUT 2026-05-04
  description,
  tags,
  encounter_date,
  time_of_day,
  weather,
  habitat,
  multiple_observations,
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
  display_format,           -- AJOUT 2026-05-04
  likes_count,
  comments_count,
  shares_count,
  views_count,
  created_at,
  updated_at,
  published_at,
  location_hidden,
  -- Masquage location quand location_hidden = true et user != owner
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE city
  END AS city,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE region
  END AS region,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE country
  END AS country,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE location_name
  END AS location_name,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE latitude
  END AS latitude,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE longitude
  END AS longitude,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL ELSE location_point
  END AS location_point
FROM public.posts;

GRANT SELECT ON public.posts_public TO authenticated, anon;
