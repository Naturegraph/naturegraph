-- ════════════════════════════════════════════════════════════════════════════
-- OPTIONAL — Restreindre Storage buckets listing (4 buckets publics)
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠️ NE PAS APPLIQUER SANS VALIDATION
-- ───────────────────────────────────
-- Cette migration est OPTIONNELLE et REQUIERT validation Nicolas car elle
-- peut casser des fonctionnalites de l'app si elle utilise `.list()` sur
-- ces buckets (verifier `grep -rn "storage.from.*list" src/`).
--
-- Recommandation : appliquer apres avoir verifie que rien n'appelle
-- `.list()` ou `.listObjects()` sur les buckets avatars / banners /
-- notebook-covers / post-media.
--
-- Probleme (advisor Supabase `public_bucket_allows_listing`)
-- ───────────────────────────────────────────────────────────
-- Les 4 buckets publics ont une policy SELECT (USING bucket_id = 'X') qui
-- autorise NIMPORTE QUI (anon inclus) a lister tous les fichiers via :
--   POST /storage/v1/object/list/{bucket}
--
-- Cela permet a un attaquant de scraper tous les avatars/banners/posts.
--
-- Note : les URLs publiques (`.getPublicUrl()`) NE PASSENT PAS par RLS
-- (elles vont directement au CDN). Donc restreindre SELECT n'empeche pas
-- le rendu des images dans l'app — UNIQUEMENT le listing.
--
-- Fix propose
-- ───────────
-- Drop les policies "public read" et les recreer pour autoriser SELECT
-- UNIQUEMENT au proprietaire du fichier (via storage.foldername).
-- Pattern path attendu : {user_id}/{filename}.ext
--
-- Verifications a faire AVANT d'appliquer :
--   - grep -rn "supabase.storage.from.*list" src/  -> doit etre vide
--   - Sinon : adapter le code pour utiliser getPublicUrl() au lieu de list()

-- ────────────────────────────────────────────────────────────────────────────
-- 1. AVATARS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_select_public_url" ON storage.objects;

-- Owner peut lister/lire ses propres fichiers
CREATE POLICY "avatars_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. BANNERS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "banners_public_read" ON storage.objects;

CREATE POLICY "banners_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'banners'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. NOTEBOOK COVERS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notebook_covers_select_public_url" ON storage.objects;

CREATE POLICY "notebook_covers_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'notebook-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 4. POST-MEDIA
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "postmedia_select_public_url" ON storage.objects;

CREATE POLICY "postmedia_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Note : les URLs publiques `getPublicUrl()` continuent de fonctionner
-- car elles bypassent RLS (CDN direct). Le rendu des images dans le feed,
-- profils, post details, etc. n'est pas impacte.
