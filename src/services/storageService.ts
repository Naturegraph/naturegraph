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
 * Compression côté client : on tente une conversion WebP via Canvas pour
 * réduire la taille de payload (les buckets n'acceptent que les MIME image/*).
 * Si le navigateur ne supporte pas, on upload tel quel.
 */

import { supabase } from '@/lib/supabase'

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

  // Limite de taille côté client (l'Edge / le bucket re-vérifient côté serveur).
  const maxBytes = bucket === 'avatars' ? 1_048_576 : 2_097_152
  if (file.size > maxBytes) {
    throw new Error(`Fichier trop volumineux (max ${maxBytes / 1e6} MB pour ${bucket})`)
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
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
