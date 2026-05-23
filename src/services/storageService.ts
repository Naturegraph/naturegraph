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
import { stripImageExif } from '@/utils/stripImageExif'

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

  // Limite de taille SOFT — la photo est compressée AVANT l'appel
  // (cf. compressPhoto dans EditPhotoTab) donc on accepte jusqu'à 10 MB
  // côté input (largement au-dessus du résultat compressé typique de 300 KB
  // pour avatar / 800 KB pour banner). Évite que les photos iPhone HEIC
  // 5-8 MB soient refusées avant même l'upload (Nicolas 2026-05-22).
  const HARD_MAX = 10 * 1_048_576
  if (file.size > HARD_MAX) {
    throw new Error(
      `Fichier trop volumineux (${(file.size / 1e6).toFixed(1)} MB, max ${HARD_MAX / 1e6} MB après compression)`,
    )
  }

  // Strip EXIF avant upload (RGPD Art 5(1)(c) + Art 25).
  // Le re-encodage canvas peut convertir PNG → JPEG, donc on prend
  // l'extension du File résultant.
  const stripped = await stripImageExif(file)

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
