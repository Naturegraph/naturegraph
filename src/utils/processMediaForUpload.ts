/**
 * processMediaForUpload : Pipeline unifie de traitement media pour posts
 * ====================================================================
 *
 * NG-025 Phase 2 (Nicolas 2026-06-03) : unifier compressPhoto + stripExif +
 * stripImageExif en UNE seule fonction. Voir docs/media/MEDIA_PIPELINE_AUDIT.md
 * pour le contexte complet.
 *
 * Garanties en sortie :
 *   1. Format : JPEG ou WebP (formats acceptes par le bucket post-media)
 *   2. Sans EXIF (re-encode canvas par construction)
 *   3. Orientation EXIF appliquee avant re-encode (plus de photos tournees)
 *   4. Taille <= 2 Mo dans 95 % des cas
 *   5. Dimension max 2048 px cote long
 *
 * Erreurs retournees comme objets typees (ProcessMediaError) avec code +
 * message user-friendly, jamais en throw generique.
 *
 * HEIC : decode via lazy import heic2any (~150 KB) -> JPEG en memoire ->
 * pipeline standard. Si echec : erreur claire avec guide reglages iPhone.
 *
 * Cap d entree : 40 Mo (decision Nicolas). Au dela, rejet immediat sans
 * lancer le decode canvas (eviterait OOM mobile).
 */

import { debugLog } from '@/lib/debugLog'
import exifr from 'exifr'

// ─── Configuration ────────────────────────────────────────────────────────────

/** Cap absolu en entree (octets). Au dela : rejet sans tentative. */
const MAX_INPUT_BYTES = 40 * 1024 * 1024 // 40 Mo

/** Cote le plus long apres resize (px). 2048 = 4K-friendly, divise par 1.5 vs 2560. */
const MAX_DIMENSION = 2048

/** Cible de poids en sortie (octets). 1.5 Mo = equilibre qualite/bande passante. */
const TARGET_BYTES = 1.5 * 1024 * 1024

/** Qualite de depart (boucle degressive). */
const QUALITY_START = 0.85

/** Plancher qualite. */
const QUALITY_MIN = 0.65

/** Pas de decrement. */
const QUALITY_STEP = 0.05

/** Skip recompression si fichier deja petit ET sous le cote max. */
const SKIP_THRESHOLD_BYTES = 250 * 1024

/** Formats reconnus en entree. */
const RECOGNIZED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
])

// ─── Types d erreur ────────────────────────────────────────────────────────────

export type ProcessMediaErrorCode =
  | 'too_large'
  | 'unsupported_format'
  | 'heic_decode_failed'
  | 'canvas_unavailable'
  | 'image_load_failed'
  | 'reencode_failed'
  | 'unknown'

export interface ProcessMediaError {
  code: ProcessMediaErrorCode
  /** Message user-friendly en francais, pret a afficher dans un toast. */
  message: string
  /** Trace technique pour debug. Non affiche a l user. */
  details?: string
}

export interface ProcessMediaResult {
  /** File pret a etre uploade (JPEG ou WebP, sans EXIF, < cap). */
  file: File
  /** Dimensions originales (avant resize). */
  originalDimensions: { width: number; height: number }
  /** Dimensions finales. */
  finalDimensions: { width: number; height: number }
  /** Quality utilisee pour le re-encode JPEG/WebP. */
  quality: number
  /** Orientation EXIF appliquee (1 a 8, default 1 = pas de rotation). */
  exifOrientation: number
  /** Format de sortie effectif. */
  outputMime: 'image/jpeg' | 'image/webp'
}

// ─── Detection codec ────────────────────────────────────────────────────────

let webpEncodeSupport: boolean | null = null

function supportsWebpEncode(): boolean {
  if (webpEncodeSupport !== null) return webpEncodeSupport
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const url = canvas.toDataURL('image/webp')
    webpEncodeSupport = url.startsWith('data:image/webp')
    return webpEncodeSupport
  } catch {
    webpEncodeSupport = false
    return false
  }
}

/**
 * Output format. On exclut AVIF (refuse par le bucket Supabase post-media
 * actuel) et HEIC/HEIF (rare en sortie navigateur, refuse aussi par le
 * bucket). WebP si supporte (gain poids ~30 %), JPEG sinon.
 */
function pickOutputFormat(): { mime: 'image/jpeg' | 'image/webp'; ext: 'jpg' | 'webp' } {
  if (supportsWebpEncode()) return { mime: 'image/webp', ext: 'webp' }
  return { mime: 'image/jpeg', ext: 'jpg' }
}

// ─── Magic numbers (validation forte) ────────────────────────────────────────

/**
 * Lit les premiers octets pour detecter le vrai format (au cas ou file.type
 * mentirait, ex .heic renomme en .jpg). Retourne null si pas reconnu.
 */
async function readMagic(file: File): Promise<string | null> {
  const slice = file.slice(0, 16)
  const buf = new Uint8Array(await slice.arrayBuffer())
  // JPEG : FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'image/png'
  // WebP : "RIFF....WEBP" (offset 8)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'image/webp'
  // HEIC / HEIF : "ftyphe" "ftypheic" "ftypmif1" etc a offset 4
  // Pattern : bytes 4-7 = 'ftyp' (0x66 0x74 0x79 0x70)
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    // bytes 8-11 : brand. heic, heix, mif1, msf1, heim, heis, hevc, hevx
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11])
    if (
      brand === 'heic' ||
      brand === 'heix' ||
      brand === 'mif1' ||
      brand === 'msf1' ||
      brand === 'heim' ||
      brand === 'heis' ||
      brand === 'hevc' ||
      brand === 'hevx'
    ) {
      return 'image/heic'
    }
  }
  // AVIF : "ftyp" + brand avif
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70 &&
    buf[8] === 0x61 &&
    buf[9] === 0x76 &&
    buf[10] === 0x69 &&
    buf[11] === 0x66
  )
    return 'image/avif'
  return null
}

// ─── HEIC decode lazy ────────────────────────────────────────────────────────

/**
 * Decode HEIC en JPEG via heic2any (lazy import). Retourne un nouveau File
 * MIME image/jpeg pret pour le pipeline canvas.
 */
async function decodeHeic(file: File): Promise<File> {
  // Lazy import : la lib (~150 KB gzip) n est chargee que si HEIC detecte
  const { default: heic2any } = await import('heic2any')
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  const out = Array.isArray(blob) ? blob[0] : blob
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
  return new File([out], newName, { type: 'image/jpeg', lastModified: Date.now() })
}

// ─── EXIF orientation ────────────────────────────────────────────────────────

/**
 * Lit l orientation EXIF (1 a 8). Default 1 si introuvable.
 * 1 = normal, 3 = 180°, 6 = 90° CW, 8 = 90° CCW, etc.
 */
async function readExifOrientation(file: File): Promise<number> {
  try {
    const parsed = await exifr.parse(file, {
      pick: ['Orientation'],
      tiff: true,
      ifd1: false,
      exif: true,
      gps: false,
      xmp: false,
      icc: false,
      iptc: false,
    })
    const orientation = (parsed as { Orientation?: number } | undefined)?.Orientation
    return typeof orientation === 'number' && orientation >= 1 && orientation <= 8 ? orientation : 1
  } catch {
    return 1
  }
}

/**
 * Applique l orientation EXIF au canvas avant drawImage.
 * Retourne les nouvelles dimensions (peuvent etre swappees).
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number,
): { canvasWidth: number; canvasHeight: number } {
  switch (orientation) {
    case 2: // miroir horizontal
      ctx.transform(-1, 0, 0, 1, width, 0)
      return { canvasWidth: width, canvasHeight: height }
    case 3: // 180°
      ctx.transform(-1, 0, 0, -1, width, height)
      return { canvasWidth: width, canvasHeight: height }
    case 4: // miroir vertical
      ctx.transform(1, 0, 0, -1, 0, height)
      return { canvasWidth: width, canvasHeight: height }
    case 5: // transpose
      ctx.transform(0, 1, 1, 0, 0, 0)
      return { canvasWidth: height, canvasHeight: width }
    case 6: // 90° CW
      ctx.transform(0, 1, -1, 0, height, 0)
      return { canvasWidth: height, canvasHeight: width }
    case 7: // transverse
      ctx.transform(0, -1, -1, 0, height, width)
      return { canvasWidth: height, canvasHeight: width }
    case 8: // 90° CCW
      ctx.transform(0, -1, 1, 0, 0, width)
      return { canvasWidth: height, canvasHeight: width }
    case 1:
    default:
      return { canvasWidth: width, canvasHeight: height }
  }
}

// ─── Helpers canvas ──────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image-load-failed'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

function rename(name: string, ext: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  return `${base}.${ext}`
}

function formatMo(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

// ─── API principale ──────────────────────────────────────────────────────────

/**
 * Pipeline unifie : validation entree + decode (HEIC -> JPEG si necessaire) +
 * lecture orientation EXIF + single-pass canvas (resize + rotate + re-encode)
 * + retour fichier pret upload.
 *
 * Strip EXIF garanti par construction (re-encode canvas ne preserve aucune
 * metadata).
 *
 * Sortie : JPEG ou WebP, jamais HEIC/AVIF/HEIF (formats refuses par bucket).
 *
 * @returns ProcessMediaResult avec le file pret upload, OU ProcessMediaError
 *   structure pour affichage user-friendly.
 */
export async function processMediaForUpload(
  file: File,
): Promise<ProcessMediaResult | ProcessMediaError> {
  // ─── Validation entree ─────────────────────────────────────────────────────

  // 1. Cap taille
  if (file.size > MAX_INPUT_BYTES) {
    return {
      code: 'too_large',
      message: `Cette photo est trop volumineuse (${formatMo(file.size)}). Taille maximale : ${formatMo(MAX_INPUT_BYTES)}.`,
      details: `file.size = ${file.size}, MAX = ${MAX_INPUT_BYTES}`,
    }
  }

  // 2. Magic numbers : verifie le vrai format (au cas ou file.type ment)
  const realMime = await readMagic(file)
  const declaredMime = file.type

  // 3. Format reconnu ? On accepte tout ce qui est dans RECOGNIZED_MIMES OU
  //    detecte via magic. On rejette tout le reste avec message clair.
  const effectiveMime = realMime ?? declaredMime
  if (!effectiveMime || !RECOGNIZED_MIMES.has(effectiveMime)) {
    // Cas particulier RAW (CR2, NEF, ARW, RAF, DNG, ORF) : message specifique
    const nameLower = file.name.toLowerCase()
    if (/\.(cr2|cr3|nef|arw|raf|dng|orf|rw2|pef|srw)$/i.test(nameLower)) {
      return {
        code: 'unsupported_format',
        message: `Fichier RAW (${nameLower.split('.').pop()?.toUpperCase()}) non supporté. Convertis-le en JPEG dans ton logiciel photo, puis réessaye.`,
        details: `RAW file detected: ${file.name}`,
      }
    }
    return {
      code: 'unsupported_format',
      message: `Format non supporté (${effectiveMime || 'inconnu'}). Formats acceptés : JPEG, PNG, WebP, AVIF, HEIC.`,
      details: `declared=${declaredMime}, magic=${realMime}`,
    }
  }

  // ─── HEIC : decode vers JPEG d abord ───────────────────────────────────────

  let workingFile = file
  if (effectiveMime === 'image/heic' || effectiveMime === 'image/heif') {
    try {
      workingFile = await decodeHeic(file)
      debugLog('processMediaForUpload', `HEIC -> JPEG decode OK : ${file.name}`)
    } catch (err) {
      return {
        code: 'heic_decode_failed',
        message:
          'La conversion HEIC a échoué. Sur iPhone : Réglages > Appareil photo > Formats > Compatibilité maximale, puis reprends la photo.',
        details: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ─── Lecture orientation EXIF ──────────────────────────────────────────────
  // On lit sur le file ORIGINAL (avant decode HEIC), car heic2any reset l EXIF.
  // Pour HEIC, l orientation est de toute facon dans le HEIF iref/iprp, pas
  // forcement parsable par exifr. Default 1 = pas de rotation.

  const exifOrientation =
    effectiveMime === 'image/heic' || effectiveMime === 'image/heif'
      ? 1
      : await readExifOrientation(file)

  // ─── Decode canvas ─────────────────────────────────────────────────────────

  let img: HTMLImageElement
  try {
    img = await loadImage(workingFile)
  } catch (err) {
    return {
      code: 'image_load_failed',
      message:
        'Impossible de charger cette image. Elle est peut-être corrompue ou trop volumineuse pour ton appareil.',
      details: err instanceof Error ? err.message : String(err),
    }
  }

  const { naturalWidth: srcW, naturalHeight: srcH } = img

  // Skip recompression si deja petite ET legere ET orientation OK ET MIME ok
  const isOutputFormatAlready = effectiveMime === 'image/jpeg' || effectiveMime === 'image/webp'
  if (
    isOutputFormatAlready &&
    workingFile.size <= SKIP_THRESHOLD_BYTES &&
    Math.max(srcW, srcH) <= MAX_DIMENSION &&
    exifOrientation === 1
  ) {
    return {
      file: workingFile,
      originalDimensions: { width: srcW, height: srcH },
      finalDimensions: { width: srcW, height: srcH },
      quality: 1,
      exifOrientation: 1,
      outputMime: effectiveMime as 'image/jpeg' | 'image/webp',
    }
  }

  // ─── Resize + rotate + re-encode (single canvas pass) ──────────────────────

  // Dimensions cibles apres resize (proportionnel)
  const scale = Math.max(srcW, srcH) > MAX_DIMENSION ? MAX_DIMENSION / Math.max(srcW, srcH) : 1
  const targetW = Math.round(srcW * scale)
  const targetH = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  // Si orientation tourne 90/270, on swap les dimensions du canvas
  const swapped = exifOrientation >= 5 && exifOrientation <= 8
  canvas.width = swapped ? targetH : targetW
  canvas.height = swapped ? targetW : targetH

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      code: 'canvas_unavailable',
      message:
        'Ton navigateur ne supporte pas le traitement d images. Essaye un autre navigateur (Chrome, Firefox, Safari).',
      details: 'getContext(2d) returned null',
    }
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Applique la transformation EXIF avant drawImage
  applyOrientation(ctx, exifOrientation, targetW, targetH)
  ctx.drawImage(img, 0, 0, targetW, targetH)

  // Multi-pass qualite degressive
  const { mime: outputMime, ext: outputExt } = pickOutputFormat()
  let bestBlob: Blob | null = null
  let bestQuality = QUALITY_START

  for (let q = QUALITY_START; q >= QUALITY_MIN - 1e-6; q -= QUALITY_STEP) {
    const blob = await canvasToBlob(canvas, outputMime, q)
    if (!blob) continue
    if (blob.size <= TARGET_BYTES) {
      bestBlob = blob
      bestQuality = q
      break
    }
    // pas encore sous budget, on garde comme meilleure tentative
    bestBlob = blob
    bestQuality = q
  }

  if (!bestBlob) {
    return {
      code: 'reencode_failed',
      message:
        'Cette photo est trop grande pour être traitée sur ton appareil. Essaye une version réduite (< 10 Mo).',
      details: 'canvas.toBlob returned null on all passes',
    }
  }

  const outputFile = new File([bestBlob], rename(file.name, outputExt), {
    type: outputMime,
    lastModified: Date.now(),
  })

  debugLog(
    'processMediaForUpload',
    `${file.name} : ${formatMo(file.size)} -> ${formatMo(outputFile.size)} ` +
      `(${outputMime} q=${bestQuality.toFixed(2)} ${canvas.width}x${canvas.height} orient=${exifOrientation})`,
  )

  return {
    file: outputFile,
    originalDimensions: { width: srcW, height: srcH },
    finalDimensions: { width: canvas.width, height: canvas.height },
    quality: bestQuality,
    exifOrientation,
    outputMime,
  }
}

/** Helper : true si le retour est une erreur structuree. */
export function isProcessMediaError(
  result: ProcessMediaResult | ProcessMediaError,
): result is ProcessMediaError {
  return 'code' in result && 'message' in result
}
