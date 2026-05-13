/**
 * compressPhoto — Compression côté client haute-qualité (second-agent/19)
 *
 * Objectif : maximiser la qualité perceptible tout en gardant des poids
 * raisonnables pour le stockage et la bande passante.
 *
 * Stratégie 2 tiers (PRD photo-management-v4 + naturegraph-v5) :
 *
 *   ┌─────────────┬───────────┬───────────┬─────────────────┐
 *   │ Tier        │ Max dim   │ Qualité   │ Target poids    │
 *   ├─────────────┼───────────┼───────────┼─────────────────┤
 *   │ FREE (MVP)  │ 2560px    │ 0.92→0.74 │ ~900 KB visé    │
 *   │ PREMIUM     │ 4096px    │ 0.95→0.85 │ ~3 MB visé      │
 *   └─────────────┴───────────┴───────────┴─────────────────┘
 *
 * Algorithme détaillé :
 *   1. Skip si fichier déjà léger ET petit (<500 KB & ≤ maxDim) — non-destruction
 *   2. Resize bicubique (`imageSmoothingQuality:'high'`) si plus grand côté > maxDim
 *   3. Choix du codec : AVIF > WebP > JPEG selon support navigateur
 *   4. Multi-pass adaptatif : on commence à `qualityStart` puis on descend
 *      par paliers jusqu'à atteindre `targetBytes` ou `qualityFloor`. La
 *      meilleure passe sous le budget est conservée.
 *   5. Fallback : si la compression est contre-productive (output ≥ source)
 *      ou si tout échoue, on retombe sur l'original.
 *
 * Lib : zéro dépendance (HTMLCanvasElement.toBlob natif).
 *
 * Roadmap Premium (TODO BACKEND, voir second-agent/19) :
 *   · Tier `'premium'` actif quand l'utilisateur a un abonnement
 *   · Stockage de l'original (avant compression) dans bucket dédié pour
 *     restauration HD à la souscription premium
 *   · Aujourd'hui : tout le monde est Free → seul le tier FREE est actif
 */

import { debugLog } from '@/lib/debugLog'

// ─── Tiers — paramètres par niveau d'abonnement ──────────────────────────────

export interface CompressionTier {
  /** Plus grand côté max (px) */
  maxDimension: number
  /** Qualité initiale (0-1) — on essaie d'atteindre celle-là d'abord */
  qualityStart: number
  /** Plancher qualité (0-1) — on ne descend jamais en dessous */
  qualityFloor: number
  /** Pas de décrément à chaque tentative */
  qualityStep: number
  /** Poids cible en octets — on s'arrête dès qu'on est en dessous */
  targetBytes: number
}

/**
 * Tier FREE — paramètres optimisés pour réduire l'egress Supabase.
 *
 * Choix (mai 2026, suite quota Free Plan dépassé) :
 *  - maxDimension 2048 : 4K-friendly, divise par ~1.5 le nombre de pixels vs
 *    2560 → ~30 % de poids en moins à qualité égale.
 *  - qualityStart 0.85 : seuil "haute qualité indiscernable" pour AVIF/WebP
 *    sur des photos nature (testé visuellement). En JPEG c'est l'équivalent
 *    de quality 80-85.
 *  - qualityFloor 0.65 : palier minimum avant qu'on accepte un poids > target.
 *  - targetBytes 500 KB : médiane Instagram/Twitter pour le feed. Les photos
 *    nature compressent bien (zones uniformes : feuillage, ciel).
 *
 * Résultat attendu : -40 à -50 % de bande passante vs anciens réglages.
 */
export const TIER_FREE: CompressionTier = {
  maxDimension: 2048,
  qualityStart: 0.85,
  qualityFloor: 0.65,
  qualityStep: 0.05,
  targetBytes: 500 * 1024, // ~500 KB (médiane Instagram feed)
}

/** Tier PREMIUM — qualité quasi-RAW, peu de compression. Inchangé. */
export const TIER_PREMIUM: CompressionTier = {
  maxDimension: 4096,
  qualityStart: 0.95,
  qualityFloor: 0.85,
  qualityStep: 0.03,
  targetBytes: 3 * 1024 * 1024, // ~3 MB
}

// ─── Compatibilité rétro avec l'ancienne API ─────────────────────────────────

/** @deprecated — utiliser `TIER_FREE.maxDimension` */
export const DEFAULT_MAX_DIMENSION = TIER_FREE.maxDimension
/** @deprecated — utiliser `TIER_FREE.qualityStart` */
export const DEFAULT_QUALITY = TIER_FREE.qualityStart

// Skip recompression seulement si le fichier est DÉJÀ très léger.
// Abaissé de 500 KB → 250 KB (mai 2026) pour forcer plus de fichiers à
// passer par notre pipeline AVIF/WebP qui économise 30-40 % vs JPEG natif.
const SKIP_THRESHOLD_BYTES = 250 * 1024 // 250 KB

// ─── Détection des codecs supportés ──────────────────────────────────────────

let avifSupport: boolean | null = null
let webpSupport: boolean | null = null

function supportsEncode(mime: 'image/avif' | 'image/webp'): boolean {
  const cache = mime === 'image/avif' ? avifSupport : webpSupport
  if (cache !== null) return cache
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const url = canvas.toDataURL(mime)
    const ok = url.startsWith(`data:${mime}`)
    if (mime === 'image/avif') avifSupport = ok
    else webpSupport = ok
    return ok
  } catch {
    if (mime === 'image/avif') avifSupport = false
    else webpSupport = false
    return false
  }
}

/** Choix du codec optimal disponible : AVIF > WebP > JPEG */
function pickCodec(): { mime: string; ext: string } {
  if (supportsEncode('image/avif')) return { mime: 'image/avif', ext: 'avif' }
  if (supportsEncode('image/webp')) return { mime: 'image/webp', ext: 'webp' }
  return { mime: 'image/jpeg', ext: 'jpg' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/** Encode le canvas vers Blob (Promise) */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

// ─── API principale ──────────────────────────────────────────────────────────

export interface CompressOptions {
  /** Tier d'abonnement — détermine maxDim / qualité / target. Default FREE. */
  tier?: CompressionTier
  /**
   * Override manuel de la dimension max — utile pour des cas spécifiques.
   * Par défaut on utilise `tier.maxDimension`.
   */
  maxDimension?: number
  /**
   * Override manuel de la qualité fixe (skip multi-pass).
   * Par défaut multi-pass entre `tier.qualityStart` et `tier.qualityFloor`.
   */
  quality?: number
  /** Force compression même si la source est légère */
  force?: boolean
}

/**
 * Compresse une image pour l'upload. Préserve l'aspect ratio, redimensionne
 * si nécessaire, choisit le meilleur codec disponible (AVIF > WebP > JPEG)
 * et fait du multi-pass adaptatif pour atteindre le poids cible avec la
 * qualité la plus haute possible.
 *
 * Retourne le fichier compressé, ou le fichier original si aucun gain n'est
 * attendu (photo déjà légère + petite, ou compression contre-productive).
 *
 * Ne jette jamais sur erreur : on retombe sur l'original. L'utilisateur ne
 * doit pas être bloqué par notre optimisation.
 */
export async function compressPhoto(file: File, options: CompressOptions = {}): Promise<File> {
  const tier = options.tier ?? TIER_FREE
  const maxDim = options.maxDimension ?? tier.maxDimension
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

    const { mime, ext } = pickCodec()

    // ── Mode qualité fixe (legacy / override explicite) ─────────────────────
    if (typeof options.quality === 'number') {
      const blob = await canvasToBlob(canvas, mime, options.quality)
      if (!blob || (blob.size >= file.size && !force)) return file
      return new File([blob], rename(file.name, ext), {
        type: mime,
        lastModified: file.lastModified,
      })
    }

    // ── Mode multi-pass adaptatif — qualité d'abord ─────────────────────────
    // On part de qualityStart et on descend par paliers de qualityStep
    // jusqu'à passer sous targetBytes. On s'arrête au plancher qualityFloor.
    // La meilleure passe (la plus haute qualité sous budget) est conservée.
    let bestBlob: Blob | null = null
    let bestQuality = tier.qualityStart

    for (let q = tier.qualityStart; q >= tier.qualityFloor - 1e-6; q -= tier.qualityStep) {
      const blob = await canvasToBlob(canvas, mime, q)
      if (!blob) continue

      // 1ère passe sous budget → on garde et on s'arrête (qualité max atteinte)
      if (blob.size <= tier.targetBytes) {
        bestBlob = blob
        bestQuality = q
        break
      }

      // Pas encore sous budget — on garde comme meilleure tentative à ce stade
      // et on continue à descendre la qualité.
      bestBlob = blob
      bestQuality = q
    }

    if (!bestBlob) return file

    // Compression contre-productive ? On garde l'original.
    if (bestBlob.size >= file.size && !force) {
      return file
    }

    // Log dev pour ajuster les paramètres si besoin (no-op en prod)
    // BATCH 15 / QW-CL2 : migre vers debugLog (centralise + tree-shake en prod)
    const ratio = ((bestBlob.size / file.size) * 100).toFixed(0)
    debugLog(
      'compressPhoto',
      `${file.name}: ${(file.size / 1024).toFixed(0)}KB → ` +
        `${(bestBlob.size / 1024).toFixed(0)}KB (${ratio}%) ` +
        `${mime} q=${bestQuality.toFixed(2)} ${targetW}×${targetH}`,
    )

    return new File([bestBlob], rename(file.name, ext), {
      type: mime,
      lastModified: file.lastModified,
    })
  } catch {
    // Best-effort : on ne bloque jamais l'upload pour un échec de compression
    return file
  }
}
