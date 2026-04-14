/**
 * mediaService — Upload de medias vers Supabase Storage + ligne `media`
 *
 * Convention de chemin : {bucket}/{user_id}/{post_id?}/{uuid}.{ext}
 * RLS Storage : owner-only en ecriture, public en lecture (sauf bucket exports).
 *
 * Note : la conversion WebP / strip EXIF cote client est volontairement
 * minimaliste pour le MVP (juste validation type/size). Sprint suivant : ajouter
 * compression via canvas + retrait EXIF via piexif/exifr.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const ACCEPTED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024 // 10 MB

function ext(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  return file.type.split('/').pop() ?? 'bin'
}

function uuid(): string {
  return crypto.randomUUID()
}

// ── Avatar ───────────────────────────────────────────────────────────────────

/** Upload l'avatar du user. Ecrase l'existant. Retourne l'URL publique. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Storage indisponible (mode demo)')
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Format non supporte (jpeg, png, webp)')
  }
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Fichier trop lourd (max 2 Mo)')

  const path = `${userId}/avatar.${ext(file)}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  return pub.publicUrl
}

// ── Post media ───────────────────────────────────────────────────────────────

export interface PostMediaUploadResult {
  id: string
  url: string
  storage_path: string
  width?: number
  height?: number
}

/**
 * Upload un fichier media et insere une ligne `media` rattachee au post.
 * Le post_id doit deja exister (cree via postService.createPost).
 */
export async function uploadPostMedia(params: {
  file: File
  postId: string
  userId: string
  copyrightNotice: string
  license?: string
  altText?: string
  displayOrder?: number
}): Promise<PostMediaUploadResult> {
  const {
    file,
    postId,
    userId,
    copyrightNotice,
    license = 'cc-by-nc-sa',
    altText,
    displayOrder = 1,
  } = params

  if (!isSupabaseConfigured || !supabase) throw new Error('Storage indisponible (mode demo)')
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Format non supporte (jpeg, png, webp)')
  }
  if (file.size > MAX_POST_MEDIA_BYTES) throw new Error('Fichier trop lourd (max 10 Mo)')

  const path = `${userId}/${postId}/${uuid()}.${ext(file)}`

  // 1. Upload binaire
  const { error: upErr } = await supabase.storage
    .from('post-media')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw new Error(upErr.message)

  // 2. URL publique
  const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path)

  // 3. Ligne media (rollback du blob si l'insert echoue)
  const { data, error: insErr } = await supabase
    .from('media')
    .insert({
      post_id: postId,
      user_id: userId,
      type: 'photo',
      status: 'ready',
      url: pub.publicUrl,
      original_url: pub.publicUrl,
      mime_type: file.type,
      file_size: file.size,
      alt: altText ?? null,
      display_order: displayOrder,
      copyright_notice: copyrightNotice,
      license,
    })
    .select('id, url, width, height')
    .single()

  if (insErr) {
    await supabase.storage
      .from('post-media')
      .remove([path])
      .catch(() => {})
    throw new Error(insErr.message)
  }

  return {
    id: (data as { id: string }).id,
    url: (data as { url: string }).url,
    storage_path: path,
    width: (data as { width?: number }).width,
    height: (data as { height?: number }).height,
  }
}

// ── Community Photo (héro auth) ──────────────────────────────────────────────

export interface CommunityHeroPhoto {
  id: string
  src: string
  alt: string
  photographerName: string | null
  instagramUrl: string | null
  tagline: string
}

/**
 * Récupère la photo communautaire active pour les pages auth.
 * Retourne null si aucune photo active ou si Supabase n'est pas configuré.
 * Le composant AuthHeroPhoto gère le fallback vers l'asset local.
 */
export async function getCommunityHeroPhoto(): Promise<CommunityHeroPhoto | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('community_photos')
    .select('id, src, alt, photographer_name, instagram_url, tagline')
    .eq('is_active', true)
    .eq('consent_verified', true)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    src: data.src,
    alt: data.alt,
    photographerName: data.photographer_name ?? null,
    instagramUrl: data.instagram_url ?? null,
    tagline: data.tagline,
  }
}

/** Supprime un media (storage + ligne DB). */
export async function deletePostMedia(mediaId: string, storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  await supabase.storage
    .from('post-media')
    .remove([storagePath])
    .catch(() => {})
  const { error } = await supabase.from('media').delete().eq('id', mediaId)
  if (error) throw new Error(error.message)
}
