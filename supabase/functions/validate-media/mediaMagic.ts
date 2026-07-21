/**
 * _shared/mediaMagic : detection de format par magic bytes (NG-001)
 * =============================================================================
 *
 * Logique pure (aucune dependance Deno/jsr/reseau) partagee entre :
 *   - l'Edge Function validate-media (validation serveur des uploads)
 *   - le test unitaire vitest (src, deterministe, hors prod)
 *
 * On lit les premiers octets d'un fichier stocke et on rend un verdict :
 *   - valid   : format explicitement autorise par le bucket post-media
 *               (image/jpeg, image/png, image/webp, video/mp4)
 *   - invalid : format connu mais interdit ici (TIFF, GIF, BMP, HEIC, AVIF)
 *   - unknown : signature non reconnue -> fail-open (on garde + alerte)
 */

export type MediaVerdict =
  | { kind: 'valid'; detected: string }
  | { kind: 'invalid'; detected: string }
  | { kind: 'unknown'; detected: 'unknown' }

/** Brands ISOBMFF (offset 8) correspondant a de la video MP4 acceptee. */
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'mmp4',
  'm4v ',
  'dash',
  'ndsc',
  'msnv',
])

/** Brands ISOBMFF image (HEIC/AVIF) : interdits pour post-media. */
const IMAGE_BRANDS = new Set([
  'heic',
  'heix',
  'mif1',
  'msf1',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'avif',
  'avis',
])

/**
 * Analyse les premiers octets d'un fichier et rend un verdict.
 *
 * MP4 et HEIC/AVIF partagent le prefixe 'ftyp' (offset 4) : on discrimine sur
 * le brand (offset 8). Seuls les brands video mp4 sont valides ; les brands
 * image (heic/avif...) sont explicitement invalides pour ce bucket.
 *
 * @param buf Au moins 12 octets ; 16+ recommande pour couvrir le brand ftyp.
 */
export function detectFormat(buf: Uint8Array): MediaVerdict {
  const at = (i: number) => buf[i] ?? -1

  // JPEG : FF D8 FF
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { kind: 'valid', detected: 'image/jpeg' }
  }
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  ) {
    return { kind: 'valid', detected: 'image/png' }
  }
  // WebP : "RIFF"(0-3) .... "WEBP"(8-11)
  if (
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  ) {
    return { kind: 'valid', detected: 'image/webp' }
  }

  // Conteneurs ISOBMFF : 'ftyp' (66 74 79 70) a l'offset 4, brand a l'offset 8.
  if (at(4) === 0x66 && at(5) === 0x74 && at(6) === 0x79 && at(7) === 0x70) {
    const brand = String.fromCharCode(at(8), at(9), at(10), at(11)).toLowerCase()
    if (MP4_BRANDS.has(brand)) {
      return { kind: 'valid', detected: 'video/mp4' }
    }
    if (IMAGE_BRANDS.has(brand)) {
      return { kind: 'invalid', detected: `image/${brand}` }
    }
    // ftyp d'un brand inconnu : on ne supprime pas sur un doute.
    return { kind: 'unknown', detected: 'unknown' }
  }

  // TIFF : "II*\0" (little endian) ou "MM\0*" (big endian)
  if (
    (at(0) === 0x49 && at(1) === 0x49 && at(2) === 0x2a && at(3) === 0x00) ||
    (at(0) === 0x4d && at(1) === 0x4d && at(2) === 0x00 && at(3) === 0x2a)
  ) {
    return { kind: 'invalid', detected: 'image/tiff' }
  }
  // GIF : "GIF8"
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) {
    return { kind: 'invalid', detected: 'image/gif' }
  }
  // BMP : "BM"
  if (at(0) === 0x42 && at(1) === 0x4d) {
    return { kind: 'invalid', detected: 'image/bmp' }
  }

  // Signature non reconnue : fail-open (garde + alerte).
  return { kind: 'unknown', detected: 'unknown' }
}

/**
 * Extrait { bucket, path } d'une URL publique Supabase Storage.
 * Format attendu : .../storage/v1/object/public/<bucket>/<path...>
 * Retourne null si l'URL ne correspond pas au schema attendu.
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const marker = '/storage/v1/object/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  let rest = url.slice(idx + marker.length)
  rest = rest.replace(/^(public|authenticated|sign)\//, '')
  const slash = rest.indexOf('/')
  if (slash === -1) return null
  const bucket = rest.slice(0, slash)
  const path = decodeURIComponent(rest.slice(slash + 1).split('?')[0])
  if (!bucket || !path) return null
  return { bucket, path }
}
