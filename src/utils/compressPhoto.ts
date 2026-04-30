/**
 * compressPhoto — Compression côté client pour économiser le stockage et
 * la bande passante, tout en préservant la qualité perceptible.
 *
 * Stratégie MVP (PRD photo-management-v4) :
 *   · Max 2560px sur le plus grand côté (préserve détails plumage / œil
 *     d'oiseau). Au-delà, l'œil humain ne gagne rien sur écran web courant.
 *   · Encode en WebP qualité 82 par défaut → ~35% du poids d'un JPEG
 *     équivalent, pour une perte perceptible nulle (test validé INPN).
 *   · Skip : si la source est déjà légère (< 500 Ko) et petite (< 2560px),
 *     on renvoie le fichier original pour éviter une recompression inutile
 *     qui dégraderait. Principe P1 (non-destruction).
 *   · Fallback JPEG q=85 si le navigateur n'a pas WebP (rare, mais safe).
 *
 * Lib : zéro — on utilise HTMLCanvasElement.toBlob natif. Poids : 0 Ko.
 *
 * Retourne un nouveau File (même nom, extension mise à jour) ou le fichier
 * original si la compression n'a pas lieu d'être.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export const DEFAULT_MAX_DIMENSION = 2560
export const DEFAULT_QUALITY = 0.82
const SKIP_THRESHOLD_BYTES = 500 * 1024 // 500 Ko

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Détecte si le navigateur peut encoder en WebP via canvas.
 * Mémoïsé : on ne refait pas le test à chaque photo.
 */
let webpSupport: boolean | null = null
function supportsWebpEncode(): boolean {
  if (webpSupport !== null) return webpSupport
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const url = canvas.toDataURL('image/webp')
    webpSupport = url.startsWith('data:image/webp')
  } catch {
    webpSupport = false
  }
  return webpSupport
}

/** Charge un File en HTMLImageElement (évite createImageBitmap pour compat HEIC). */
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

/** Remplace l'extension d'un nom de fichier. `photo.jpg` → `photo.webp`. */
function rename(name: string, newExt: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  return `${base}.${newExt}`
}

// ─── API principale ──────────────────────────────────────────────────────────

export interface CompressOptions {
  /** Dimension maximale (plus grand côté). Default 2560. */
  maxDimension?: number
  /** Qualité 0-1 pour WebP/JPEG. Default 0.82. */
  quality?: number
  /** Force compression même si la source est légère. Default false. */
  force?: boolean
}

/**
 * Compresse une image pour l'upload. Préserve l'aspect ratio, redimensionne
 * si nécessaire, encode en WebP (ou JPEG fallback).
 *
 * Retourne le fichier compressé, ou le fichier original si aucun gain n'est
 * attendu (photo déjà légère + petite).
 *
 * Ne jette jamais sur erreur de compression : on retombe sur l'original,
 * l'upload continue. L'utilisateur ne doit pas être bloqué par notre
 * optimisation.
 */
export async function compressPhoto(file: File, options: CompressOptions = {}): Promise<File> {
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const force = options.force ?? false

  // HEIC/HEIF : décodage non-garanti en Canvas. On renvoie tel quel — la
  // Phase 2 ajoutera libheif-wasm pour décoder puis recompresser.
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return file
  }

  try {
    const img = await loadImage(file)
    const { naturalWidth: w, naturalHeight: h } = img
    const largestSide = Math.max(w, h)

    // Skip si déjà léger + petit et qu'on ne force pas la recompression.
    if (!force && file.size <= SKIP_THRESHOLD_BYTES && largestSide <= maxDim) {
      return file
    }

    // Calcul des dimensions cibles en gardant le ratio.
    const scale = largestSide > maxDim ? maxDim / largestSide : 1
    const targetW = Math.round(w * scale)
    const targetH = Math.round(h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // imageSmoothingQuality 'high' : bicubique côté navigateur, qualité
    // visiblement meilleure que le downscale par défaut (nearest/bilinear).
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const useWebp = supportsWebpEncode()
    const mime = useWebp ? 'image/webp' : 'image/jpeg'
    const ext = useWebp ? 'webp' : 'jpg'

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, mime, quality)
    })

    if (!blob) return file

    // Si la compression est contre-productive (output > original), on garde
    // l'original. Rare mais possible pour de très petites photos PNG.
    if (blob.size >= file.size && !force) {
      return file
    }

    return new File([blob], rename(file.name, ext), {
      type: mime,
      lastModified: file.lastModified,
    })
  } catch {
    // Best-effort : on ne bloque jamais l'upload pour un échec de compression
    return file
  }
}
