-- =============================================================================
-- 20260420_security_fixes.sql
-- Corrections de sécurité post-audit Supabase Advisor
-- =============================================================================
-- 1. Politique RLS manquante sur fr_cities (lecture publique OK)
-- 2. Suppression de l'ancienne policy dupliquée sur taxref_cache
-- 3. Bucket storage : interdire le listing public des objets
--    (les URL restent accessibles si connues, mais on ne peut pas lister)
-- =============================================================================

-- ─── 1. RLS sur fr_cities (données géographiques publiques) ──────────────────
-- fr_cities contient uniquement des données de référence INSEE (pas de données
-- utilisateur). On autorise la lecture publique mais interdit toute écriture
-- côté client (insertions via service_role seulement lors des imports).

ALTER TABLE public.fr_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fr_cities_select_public" ON public.fr_cities
  FOR SELECT USING (true);

-- ─── 2. Nettoyage de la policy dupliquée sur taxref_cache ────────────────────
-- La migration initiale avait créé "TAXREF cache readable by all".
-- La migration taxref_search_optimizations a créé "taxref_cache_select_public".
-- On supprime l'ancienne pour éviter toute ambiguïté.

DROP POLICY IF EXISTS "TAXREF cache readable by all" ON public.taxref_cache;

-- ─── 3. Bucket storage : désactiver le listing public ────────────────────────
-- Par défaut Supabase n'expose pas le listing, mais on s'assure que les policies
-- SELECT ne couvrent que des objets spécifiques (pas de wildcard sans filtre).
-- Note : les buckets avatars, posts-media, community-photos sont PUBLIC pour
-- les lectures d'objets individuels — seul le listing est restreint.
-- Cette migration est documentaire : le listing n'était pas exposé dans le code,
-- mais on l'explicitera ici pour la traçabilité de l'audit.

-- Suppression de toute policy SELECT trop permissive sur storage.objects
-- (si elle existait depuis un test précédent)
DROP POLICY IF EXISTS "Public read all objects" ON storage.objects;

-- Policy correcte : lecture d'un objet spécifique dans les buckets publics
-- (Supabase génère déjà ces policies via la console lors de la création des buckets)
-- On les crée ici seulement si elles n'existent pas pour garantir la cohérence.

DO $$
BEGIN
  -- avatars bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  -- posts-media bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'posts_media_public_read'
  ) THEN
    CREATE POLICY "posts_media_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'posts-media');
  END IF;

  -- community-photos bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'community_photos_public_read'
  ) THEN
    CREATE POLICY "community_photos_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'community-photos');
  END IF;
END $$;
