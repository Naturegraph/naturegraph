/**
 * storageService — Upload avatars / bannières vers Supabase Storage
 * ===================================================================
 *
 * Buckets utilisés :
 *   - `avatars` (1 MB max, image/*) — existant
 *   - `banners` (2 MB max, image/*) — créé par migration `20260502_settings_phase2_complete.sql`
 *
 * Convention de nommage : `{user_id}/{timestamp}.{ext}`. Le préfixe user_id
 * est exploité par les RLS storage pour vérifier l'ownership.
 *
 * Sécurité : tous les uploads sont strippés de leurs métadonnées EXIF via
 * `stripImageExif()` avant stockage (RGPD Art 5(1)(c) + Art 25). Cf.
 * `docs/AUDIT_LEGAL.md` NC-3 et `mediaService.ts`.
 */

import { supabase } from '@/lib/supabase'
// V1.1.4 NG-025 (Nicolas 2026-06-03) : aligne avatar + banner sur le
// pipeline unifie processMediaForUpload (un seul flow pour TOUS les
// uploads d'image dans le projet).
import { processMediaForUpload, isProcessMediaError } from '@/utils/processMediaForUpload'

export type StorageBucket = 'avatars' | 'banners'

export interface UploadResult {
  /** URL publique de l'objet uploadé (à stocker dans `profiles.avatar_url`) */
  publicUrl: string
  /** Path de l'objet dans le bucket (utile pour la suppression ultérieure) */
  path: string
}

/**
 * Upload un fichier image vers le bucket spécifié.
 *
 * @param bucket  'avatars' ou 'banners'
 * @param file    File depuis input[type=file]
 * @throws Error si Supabase non configuré, JWT manquant, ou MIME invalide.
 */
export async function uploadImage(bucket: StorageBucket, file: File): Promise<UploadResult> {
  if (!supabase) throw new Error('Supabase non configuré')
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image (JPEG, PNG, WebP)')
  }

  // Récupère l'user pour préfixer le path (RLS storage exige user_id/...).
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Authentification requise pour uploader une image')
  }

  // V1.1.4 NG-025 (Nicolas 2026-06-03) : pipeline unifie.
  // processMediaForUpload gere :
  //   - cap entree 40 Mo (rejet clair)
  //   - HEIC decode lazy via heic2any
  //   - resize + rotation EXIF + re-encode JPEG/WebP
  //   - strip EXIF par construction (RGPD Art 5(1)(c) + Art 25)
  //   - erreurs structurees user-friendly
  const result = await processMediaForUpload(file)
  if (isProcessMediaError(result)) {
    throw new Error(result.message)
  }
  const stripped = result.file

  const ext = stripped.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, stripped, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return { publicUrl, path }
}

/**
 * Supprime un objet du bucket (lors d'une suppression d'avatar / banner).
 * `path` est celui retourné par `uploadImage`.
 */
export async function deleteImage(bucket: StorageBucket, path: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(error.message)
}
