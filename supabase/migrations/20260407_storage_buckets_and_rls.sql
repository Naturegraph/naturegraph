-- Buckets Storage + RLS
-- Cree les 4 buckets du projet et leurs policies d'acces.
-- Convention de chemin : {bucket}/{user_id}/...
-- Permet une RLS triviale et un nettoyage simple a la suppression de compte.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars',         'avatars',         true,  2097152,  ARRAY['image/webp','image/jpeg','image/png']),
  ('post-media',      'post-media',      true,  10485760, ARRAY['image/webp','image/jpeg','image/png','video/mp4']),
  ('notebook-covers', 'notebook-covers', true,  2097152,  ARRAY['image/webp','image/jpeg','image/png']),
  ('exports',         'exports',         false, 104857600, ARRAY['application/zip'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars (public read, owner write)
DROP POLICY IF EXISTS avatars_select   ON storage.objects;
DROP POLICY IF EXISTS avatars_insert   ON storage.objects;
DROP POLICY IF EXISTS avatars_update   ON storage.objects;
DROP POLICY IF EXISTS avatars_delete   ON storage.objects;
CREATE POLICY avatars_select ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY avatars_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Post-media (public read, owner write)
DROP POLICY IF EXISTS postmedia_select ON storage.objects;
DROP POLICY IF EXISTS postmedia_insert ON storage.objects;
DROP POLICY IF EXISTS postmedia_delete ON storage.objects;
CREATE POLICY postmedia_select ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');
CREATE POLICY postmedia_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY postmedia_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Notebook covers
DROP POLICY IF EXISTS covers_select ON storage.objects;
DROP POLICY IF EXISTS covers_insert ON storage.objects;
DROP POLICY IF EXISTS covers_delete ON storage.objects;
CREATE POLICY covers_select ON storage.objects FOR SELECT
  USING (bucket_id = 'notebook-covers');
CREATE POLICY covers_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY covers_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'notebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Exports (private, owner only)
DROP POLICY IF EXISTS exports_owner ON storage.objects;
CREATE POLICY exports_owner ON storage.objects FOR ALL
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
