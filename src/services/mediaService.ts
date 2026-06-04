/**
 * mediaService : Upload de medias vers Supabase Storage + ligne `media`
 *
 * Convention de chemin : {bucket}/{user_id}/{post_id?}/{uuid}.{ext}
 * RLS Storage : owner-only en ecriture, public en lecture (sauf bucket exports).
 *
 * Sécurité :
 *   - Tous les uploads sont strippés de leurs métadonnées EXIF en amont
 *     via `processMediaForUpload()` (pipeline unifie NG-025) AVANT
 *     l'envoi à Supabase Storage. Cela retire coordonnées GPS, date
 *     prise, marque/modèle appareil, ICC profile.
 *   - RGPD Art 5(1)(c) minimisation + Art 25 Privacy by Default.
 *   - Cf. `docs/AUDIT_LEGAL.md` NC-3 et `docs/AUDIT_SUPABASE.md` P-3.
 *
 * Important : l'extraction EXIF pour pré-remplir le formulaire (date, GPS
 * suggéré dans l'étape 3) est faite AVANT cet appel, sur les Files
 * originaux côté composant (`extractPhotoMetadata.ts`). Ici on ne fait
 * que stripper avant le stockage.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
// V1.1.4 NG-025 (Nicolas 2026-06-03) : stripImageExif retire, plus aucun
// consommateur. Le pipeline unifie processMediaForUpload (utilise par
// useContributePostSubmit, ContributeInstantForm, storageService) fait
// deja le strip EXIF par construction (canvas re-encode).

// Nicolas 2026-05-21 : ajout AVIF (processMediaForUpload peut produire AVIF sur Chrome).
// Nicolas 2026-05-22 : ajout HEIC / HEIF, iPhone par défaut. iOS Safari avec
// `accept="image/*"` convertit normalement en JPEG, mais dans certains cas
// (sélection multiple, partage depuis Photos.app) le HEIC arrive brut. On
// l'accepte plutôt que de rejeter silencieusement et casser le partage.
const ACCEPTED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]
// Garde-fou aligné sur la limite bucket Supabase Storage (10 Mo).
// Le fichier arrivant ici a deja transite par processMediaForUpload (~1.5 Mo
// cible), donc ce check sert juste de filet de securite. Nicolas 2026-05-21,
// reaffirme NG-025 2026-06-03.
const MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024 // 10 MB (= plafond bucket Supabase)

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
//
// V1.1.4 NG-025 (Nicolas 2026-06-03) : la fonction uploadAvatar dupliquait
// le flow de storageService.uploadImage('avatars', file) sans aucun
// consommateur reel. Retiree. L'upload avatar passe par
// EditPhotoTab -> storageService.uploadImage -> processMediaForUpload.

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

  // V1.1.4 NG-025 (Nicolas 2026-06-03) : le pipeline d upload des posts
  // appelle desormais processMediaForUpload() en amont dans
  // useContributePostSubmit. Ce module unifie compression + strip EXIF +
  // resize + rotation EXIF + decode HEIC en une seule passe canvas.
  // Donc le 3eme passe stripImageExif ici est devenu redondant : le file
  // arrive deja JPEG/WebP, sans EXIF, sous le cap.
  //
  // On garde une garde de securite sur la taille au cas ou un appelant
  // contournerait le pipeline (test, futur, etc.).
  const stripped = file

  if (stripped.size > MAX_POST_MEDIA_BYTES) {
    throw new Error(
      'Photo trop complexe à compresser (>10 Mo après optimisation). Essaie de réduire la résolution.',
    )
  }

  const path = `${userId}/${postId}/${uuid()}.${ext(stripped)}`

  const { error: upErr } = await supabase.storage.from('post-media').upload(path, stripped, {
    contentType: stripped.type,
    upsert: false,
    // Cache 1 an immutable : chaque photo a un path UUID unique (jamais
    // ré-écrit), donc on peut maxer le cache navigateur en toute sécurité.
    // Effet : -90 % d'egress sur les visites répétées du feed (Supabase free
    // plan oblige, voir docs eco-conception).
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
