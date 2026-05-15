/**
 * mediaService — Upload de medias vers Supabase Storage + ligne `media`
 *
 * Convention de chemin : {bucket}/{user_id}/{post_id?}/{uuid}.{ext}
 * RLS Storage : owner-only en ecriture, public en lecture (sauf bucket exports).
 *
 * Sécurité :
 *   - Tous les uploads sont strippés de leurs métadonnées EXIF via
 *     `stripImageExif()` AVANT l'envoi à Supabase Storage. Cela retire
 *     coordonnées GPS, date prise, marque/modèle appareil, ICC profile.
 *   - RGPD Art 5(1)(c) minimisation + Art 25 Privacy by Default.
 *   - Cf. `docs/AUDIT_LEGAL.md` NC-3 et `docs/AUDIT_SUPABASE.md` P-3.
 *
 * Important : l'extraction EXIF pour pré-remplir le formulaire (date, GPS
 * suggéré dans l'étape 3) est faite AVANT cet appel, sur les Files
 * originaux côté composant (`extractPhotoMetadata.ts`). Ici on ne fait
 * que stripper avant le stockage.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { stripImageExif } from '@/utils/stripImageExif'

const ACCEPTED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024 // 10 MB

function ext(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  return file.type.split('/').pop() ?? 'bin'
}

/**
 * Génère un UUID v4 avec fallback compatible Safari < 15.4 (BATCH 115).
 *
 * `crypto.randomUUID()` n'est dispo que depuis Safari 15.4 (mars 2022).
 * Le fallback utilise `crypto.getRandomValues()` (Safari 11+, universellement
 * supporté) pour générer un UUID v4 conforme RFC 4122 sans dépendance externe.
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback Safari < 15.4 : 16 bytes aléatoires → format UUID v4
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ── Avatar ───────────────────────────────────────────────────────────────────

/** Upload l'avatar du user. Ecrase l'existant. Retourne l'URL publique. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Storage indisponible (mode demo)')
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Format non supporte (jpeg, png, webp)')
  }
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Fichier trop lourd (max 2 Mo)')

  // Strip EXIF AVANT upload — RGPD Art 5(1)(c) minimisation. Le re-encodage
  // canvas génère un nouveau File sans aucune métadonnée (GPS, date prise,
  // marque appareil, etc.). L'extension peut changer (PNG → JPG) — sans
  // impact car le path est déterministe via `ext(stripped)`.
  const stripped = await stripImageExif(file)

  const path = `${userId}/avatar.${ext(stripped)}`
  const { error } = await supabase.storage.from('avatars').upload(path, stripped, {
    contentType: stripped.type,
    upsert: true,
    // Cache 1 an immutable — les avatars sont uploadés sur un path déterministe
    // et l'upsert remplace le contenu, donc on peut bénéficier d'un cache long.
    // (NB : l'URL ne change pas — si tu veux invalider, ajoute un querystring `?v=`.)
    cacheControl: '31536000',
  })
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
  /** Position dans la série, 0-3 (max 4 photos par post). */
  displayOrder?: number
  /** Marque cette photo comme cover du post (trigger DB garantit unicité). */
  isCover?: boolean
  /** Largeur native en pixels, après downscale éventuel côté client. */
  width?: number
  /** Hauteur native en pixels, après downscale éventuel côté client. */
  height?: number
}): Promise<PostMediaUploadResult> {
  const {
    file,
    postId,
    userId,
    copyrightNotice,
    license = 'cc-by-nc-sa',
    altText,
    displayOrder = 0,
    isCover = false,
    width,
    height,
  } = params

  if (!isSupabaseConfigured || !supabase) throw new Error('Storage indisponible (mode demo)')
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Format non supporte (jpeg, png, webp)')
  }
  if (file.size > MAX_POST_MEDIA_BYTES) throw new Error('Fichier trop lourd (max 10 Mo)')

  // Strip EXIF AVANT upload — RGPD Art 5(1)(c) minimisation. Le re-encodage
  // canvas retire systématiquement coordonnées GPS, date de prise de vue,
  // marque/modèle appareil, ICC profile, etc. Sans cela, un visiteur qui
  // télécharge la photo via le bucket public peut extraire les coordonnées
  // GPS exactes même si l'utilisateur a coché "Région masquée" — risque
  // RGPD majeur + risque écologique pour les espèces sensibles.
  //
  // L'extraction EXIF pour pré-remplir l'étape 3 du formulaire a été faite
  // en amont (cf. `extractPhotoMetadata.ts` côté EncounterStep1), sur les
  // Files originaux. Ici on strippe uniquement avant le stockage.
  const stripped = await stripImageExif(file)

  const path = `${userId}/${postId}/${uuid()}.${ext(stripped)}`

  const { error: upErr } = await supabase.storage.from('post-media').upload(path, stripped, {
    contentType: stripped.type,
    upsert: false,
    // Cache 1 an immutable — chaque photo a un path UUID unique (jamais
    // ré-écrit), donc on peut maxer le cache navigateur en toute sécurité.
    // Effet : -90 % d'egress sur les visites répétées du feed (Supabase free
    // plan oblige — voir docs eco-conception).
    cacheControl: '31536000',
  })
  if (upErr) throw new Error(upErr.message)

  const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path)

  // `is_cover` est géré par le trigger DB `ensure_single_cover` qui garantit
  // qu'une seule photo par post reste cover.
  const insertPayload = {
    post_id: postId,
    user_id: userId,
    type: 'photo' as const,
    status: 'ready' as const,
    url: pub.publicUrl,
    original_url: pub.publicUrl,
    mime_type: stripped.type,
    file_size: stripped.size,
    alt: altText ?? null,
    display_order: displayOrder,
    copyright_notice: copyrightNotice,
    license,
    width: width ?? null,
    height: height ?? null,
    is_cover: isCover,
  }

  const { data, error: insErr } = await supabase
    .from('media')
    .insert(insertPayload)
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

  // community_photos n'est pas encore dans supabase.ts généré (migration 20260414)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('community_photos')
    .select('id, src, alt, photographer_name, instagram_url, tagline')
    .eq('is_active', true)
    .eq('consent_verified', true)
    .maybeSingle()

  if (error || !data) return null

  const row = data as {
    id: string
    src: string
    alt: string
    photographer_name: string | null
    instagram_url: string | null
    tagline: string
  }

  return {
    id: row.id,
    src: row.src,
    alt: row.alt,
    photographerName: row.photographer_name ?? null,
    instagramUrl: row.instagram_url ?? null,
    tagline: row.tagline,
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
