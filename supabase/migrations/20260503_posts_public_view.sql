-- ════════════════════════════════════════════════════════════════════════════
-- 20260503 — Vue posts_public : masquage column-level des données de localisation
-- ════════════════════════════════════════════════════════════════════════════
--
-- Contexte
-- ────────
-- La RLS native Postgres est *row-level uniquement* — elle ne masque pas de
-- colonnes. Avant cette migration, les coordonnées GPS (latitude, longitude,
-- location_point, city, region, country, location_name) étaient TOUJOURS
-- exposées dans le payload API, même quand `location_hidden = true`.
--
-- Le trigger `blur_hidden_location` (cf. migration 20260407) floute déjà les
-- coordonnées en écriture à environ 10 km de précision. Ce niveau de
-- floutage est insuffisant pour les espèces sensibles (rapaces, orchidées
-- rares) où la zone de 10 km reste exploitable par un braconnier.
--
-- Cette migration crée une **vue `posts_public`** qui sert de couche de
-- masquage column-level : les coordonnées et toponymes sont remplacés par
-- NULL pour tout viewer qui n'est pas l'auteur du post, quand
-- `location_hidden = true`.
--
-- Sécurité — défense en profondeur
-- ─────────────────────────────────
--   1. EXIF strippé côté client AVANT upload (cf. `stripImageExif.ts`, Fix #1)
--   2. Trigger `blur_hidden_location` floute en écriture (existant)
--   3. **Cette vue masque en lecture pour les non-propriétaires** (nouveau)
--   4. Le service postService doit utiliser `posts_public` côté lecture (Fix #2 code)
--
-- Conformité
-- ──────────
--   - RGPD Art 5(1)(c) minimisation
--   - RGPD Art 25 Privacy by Default
--   - RGPD Art 32 sécurité
--   - Loi 25 Art 9 sécurité raisonnable
--
-- Refs : docs/AUDIT_LEGAL.md NC-3 RL-6, docs/AUDIT_SUPABASE.md P-2,
--        docs/SYNTHESE_AUDITS.md RC-B, Fix #2.
--
-- À appliquer dans l'ordre sur :
--   - naturegraph-dev   (avant merge develop → staging)
--   - naturegraph-prod  (au merge staging → main)
--
-- Idempotente : `CREATE OR REPLACE VIEW`.

-- ────────────────────────────────────────────────────────────────────────────
-- Vue : posts_public
-- ────────────────────────────────────────────────────────────────────────────
--
-- `WITH (security_invoker = true)` (PostgreSQL 15+) — la vue applique les
-- permissions et la RLS du caller, pas du créateur. Sans ça, la vue
-- court-circuiterait la RLS.
--
-- Le CASE conditionnel masque les colonnes sensibles si :
--   - `location_hidden = true` ET
--   - `user_id <> auth.uid()` (le viewer n'est PAS l'auteur)
--
-- Si l'utilisateur n'est pas authentifié (`auth.uid()` retourne NULL),
-- la condition `user_id <> NULL` retourne NULL (pas TRUE), donc le CASE
-- se déclenche bien sur le branche par défaut → masquage. ✅
--
-- Note : `auth.uid() IS NULL OR user_id <> auth.uid()` est plus explicite
-- et lisible — on l'utilise pour la robustesse.

CREATE OR REPLACE VIEW public.posts_public
  WITH (security_invoker = true) AS
SELECT
  -- Identifiants & relations
  id,
  user_id,

  -- Métadonnées générales (passthrough)
  type,
  status,
  visibility,
  description,
  tags,

  -- Contexte temporel & nature
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

  -- Compteurs (passthrough — denormalized par triggers)
  likes_count,
  comments_count,
  shares_count,
  views_count,

  -- Timestamps (passthrough)
  created_at,
  updated_at,
  published_at,

  -- Le flag location_hidden RESTE visible — l'UI en a besoin pour adapter
  -- l'affichage (ex : "Lieu masqué" au lieu d'une ville).
  location_hidden,

  -- ── Colonnes sensibles : masquées pour les non-propriétaires si hidden ──
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE city
  END AS city,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE region
  END AS region,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE country
  END AS country,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE location_name
  END AS location_name,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE latitude
  END AS latitude,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE longitude
  END AS longitude,

  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid())
    THEN NULL
    ELSE location_point
  END AS location_point

FROM public.posts;

-- ────────────────────────────────────────────────────────────────────────────
-- Permissions
-- ────────────────────────────────────────────────────────────────────────────
--
-- La vue est lisible par tous (mais la RLS de `posts` filtre les rows
-- accessibles via `security_invoker`). Les écritures (INSERT/UPDATE/DELETE)
-- restent sur la table `posts` directement — la vue n'est PAS DML-able sans
-- triggers explicites, et c'est intentionnel (lecture seule).

GRANT SELECT ON public.posts_public TO authenticated, anon;

-- ────────────────────────────────────────────────────────────────────────────
-- Documentation
-- ────────────────────────────────────────────────────────────────────────────

COMMENT ON VIEW public.posts_public IS
  'Vue lecture des posts avec masquage column-level des données de localisation '
  'quand location_hidden=true et le viewer n''est pas l''auteur. Cf. '
  'docs/AUDIT_SUPABASE.md P-2 et docs/SYNTHESE_AUDITS.md RC-B. '
  'À utiliser PARTOUT côté lecture client (postService.getFeed, getPostById, '
  'getPostsByUser, useNearbyFeed). Les mutations (INSERT/UPDATE/DELETE) '
  'restent sur la table `posts` directement.';

-- ────────────────────────────────────────────────────────────────────────────
-- Vérifications post-application
-- ────────────────────────────────────────────────────────────────────────────
--
-- 1. Vue visible :
--    SELECT viewname FROM pg_views WHERE viewname = 'posts_public';
--
-- 2. security_invoker activé (Postgres 15+) :
--    SELECT relname, reloptions FROM pg_class WHERE relname = 'posts_public';
--    → reloptions doit contenir 'security_invoker=on'
--
-- 3. Test masquage anonyme :
--    SET ROLE anon;
--    SELECT latitude, longitude FROM posts_public WHERE location_hidden = true LIMIT 1;
--    → doit retourner NULL, NULL
--
-- 4. Test propriétaire (avec JWT contenant sub=<user_uuid>) :
--    SELECT latitude FROM posts_public
--      WHERE user_id = '<user_uuid>' AND location_hidden = true LIMIT 1;
--    → doit retourner la valeur (potentiellement floutée par trigger)
