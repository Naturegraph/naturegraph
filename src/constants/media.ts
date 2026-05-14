/**
 * media — Constantes partagees pour uploads media (photos)
 *
 * Refs : audit Phase 3 (BATCH 41) — `MAX_FILE_SIZE_BYTES = 10*1024*1024` defini
 * 3x (EncounterStep1, MediaUploader, mediaService). `ALLOWED_MIME_TYPES`
 * defini 2x.
 *
 * Centralisation pour eviter le drift entre composants front et services
 * backend (un upload pourrait passer 11 MB cote front mais etre refuse cote
 * service si limites desynchronisees).
 */

/** Taille max d'un upload media (10 MB). Coherent avec Supabase Storage. */
export const MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024

/** Taille max d'un upload avatar / banner (5 MB). */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * MIME types autorises pour les photos.
 * WebP/AVIF prioritaires (eco-conception, cf GUIDELINES.md).
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/webp',
  'image/avif',
  'image/jpeg',
  'image/png',
] as const

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

/** Nombre max de media par post (encounter). */
export const MAX_POST_MEDIA_COUNT = 10

/** Dimensions max d'une image apres compression (longueur / hauteur). */
export const MAX_IMAGE_DIMENSION_PX = 4096
