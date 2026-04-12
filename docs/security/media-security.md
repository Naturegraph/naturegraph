# Media Security & gestion des images

## Buckets Supabase Storage

| Bucket | Public | Usage | Size limit | MIME |
|---|---|---|---|---|
| `avatars` | ✅ public | Avatars users | 2 MB | image/webp, image/jpeg, image/png |
| `post-media` | ✅ public | Photos/vidéos d'observations | 10 MB | image/webp, image/jpeg, video/mp4 |
| `notebook-covers` | ✅ public | Couvertures de carnets | 2 MB | image/webp, image/jpeg |
| `exports` | 🔒 private | Exports RGPD ZIP | 100 MB | application/zip |

> « Public » = lecture sans auth (URLs servies via CDN Supabase). L'écriture reste protégée par RLS.

## Politiques de bucket (Storage RLS)

### `avatars`

```sql
-- Path convention : avatars/{user_id}/avatar.webp
CREATE POLICY avatars_select ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');  -- public

CREATE POLICY avatars_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### `post-media`

```sql
-- Path : post-media/{user_id}/{post_id}/{uuid}.webp
CREATE POLICY postmedia_select ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY postmedia_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY postmedia_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

> **Pourquoi user_id en premier dossier** — Permet une politique RLS triviale et un nettoyage simple à la suppression de compte (`DELETE FROM storage.objects WHERE name LIKE 'post-media/{user_id}/%'`).

### `exports` (privé)

```sql
CREATE POLICY exports_owner ON storage.objects
  FOR ALL USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Lecture via URL signée (TTL 24h) générée par l'Edge Function `export-data`.

## Pipeline d'upload (côté client)

```
[Input file]
   │
   ▼
1. Validation MIME + taille (refus client-side)
   │
   ▼
2. Strip EXIF (lib `exifr` / `piexifjs`)
   - Retire GPS, timestamp, device, lens, software
   - Garde orientation pour pivoter correctement
   │
   ▼
3. Conversion WebP qualité 82
   - Resize max 2048px côté long
   - Génère thumbnail 480px (hash perceptuel pour duplicates V1)
   │
   ▼
4. Upload vers `post-media/{user_id}/{post_id}/{uuid}.webp`
   │
   ▼
5. INSERT post_media (storage_path, mime, w, h, size, copyright_notice, license)
```

**Code (mediaService.ts, à créer Sprint 3)** :

```ts
import { supabase } from '@/lib/supabase'
import { stripExif, toWebP } from '@/lib/image'

export async function uploadPostMedia(
  file: File,
  postId: string,
  userId: string,
  copyright: { notice: string; license: License }
): Promise<{ storage_path: string; width: number; height: number }> {
  // 1. validation
  if (file.size > 10 * 1024 * 1024) throw new Error('Fichier trop lourd (max 10 MB)')
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
    throw new Error('Format non supporté')
  }

  // 2 + 3. strip + convert
  const cleaned = await stripExif(file)
  const { blob, width, height } = await toWebP(cleaned, { maxSide: 2048, quality: 82 })

  // 4. upload
  const path = `${userId}/${postId}/${crypto.randomUUID()}.webp`
  const { error: upErr } = await supabase.storage
    .from('post-media').upload(path, blob, { contentType: 'image/webp' })
  if (upErr) throw upErr

  // 5. metadata row
  const { error: insErr } = await supabase.from('post_media').insert({
    post_id: postId,
    storage_path: path,
    mime_type: 'image/webp',
    width, height, size_bytes: blob.size,
    copyright_notice: copyright.notice,
    license: copyright.license,
  })
  if (insErr) {
    // rollback storage
    await supabase.storage.from('post-media').remove([path])
    throw insErr
  }

  return { storage_path: path, width, height }
}
```

## Espèces sensibles — floutage de coordonnées

Certaines espèces (rapaces nicheurs, orchidées rares...) ont `taxref.is_sensitive = true`. Pour ces posts, on ne doit jamais exposer la position exacte.

**Implémentation** :
- À la création du post, si `species_id` est sensitive, le **trigger serveur** force `location_precision = 2` (~10 km) et **brouille `location`** vers le centre de la maille.
- Une fonction `posts_public_view` expose `ST_SnapToGrid(location, 0.1)` au lieu de `location` brut.

```sql
CREATE OR REPLACE FUNCTION blur_sensitive_location() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.species_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM taxref WHERE cd_nom = NEW.species_id AND is_sensitive) THEN
      NEW.location_precision := GREATEST(NEW.location_precision, 2);
      NEW.location := ST_SnapToGrid(NEW.location::geometry, 0.1)::geography;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_blur_sensitive
  BEFORE INSERT OR UPDATE OF location, species_id ON posts
  FOR EACH ROW EXECUTE FUNCTION blur_sensitive_location();
```

> **Important** : le floutage est appliqué côté serveur, **pas côté client**. Un client malveillant ne peut pas le contourner.

## Anti-abus

| Risque | Mitigation |
|---|---|
| Upload de contenu illégal | Modération a posteriori via `reports` + ban via Edge Function admin |
| Hotlinking massif (egress abuse) | Cache CDN Supabase + monitoring egress quota |
| Upload de virus | MIME validation client + en V1 : scan via Edge Function avec ClamAV |
| Données EXIF leakées | Strip systématique avant upload (cf. pipeline §3) |
| Vol de bande passante | Watermark optionnel V1 sur grandes images |

## Politique de licence

| Cas | Licence par défaut | Modifiable |
|---|---|---|
| Photo personnelle | `CC-BY-NC-SA-4.0` | ✅ |
| Photo de groupe / événement | `CC-BY-NC-SA-4.0` | ✅ |
| Capture d'écran TAXREF | doit créditer INPN/MNHN | non |
| Photo réutilisée d'ailleurs | `all-rights-reserved` | ✅ |

Le champ `copyright_notice` est **obligatoire** (NOT NULL) — l'utilisateur doit toujours déclarer la source.
