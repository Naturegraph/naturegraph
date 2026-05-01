/**
 * stripExif — Nettoie les métadonnées EXIF d'une image avant upload.
 *
 * Pourquoi c'est critique sur Naturegraph :
 *   · Les photos d'espèces sensibles (nids, orchidées rares, gîtes à
 *     chiroptères…) contiennent du GPS en EXIF. Publier l'original expose
 *     la localisation précise même quand l'utilisateur a activé
 *     `location_hidden` côté app.
 *   · Le switch "Rendre la localisation publique" de l'étape 3 pilote la
 *     colonne `posts.location_hidden` mais NE retire PAS le GPS EXIF.
 *     Sans strip, `location_hidden = true` est un faux sentiment de sécurité.
 *
 * Méthode — zéro dépendance :
 *   · `createImageBitmap(file)` → décode le binaire (bitmap pur, aucune meta).
 *   · Canvas → encode en JPEG / PNG / WebP (les APIs `toBlob` ne produisent
 *     jamais d'EXIF ; on repart d'un bitmap "propre").
 *   · Résultat : File dont on a perdu TOUTES les métadonnées (EXIF, XMP, IPTC,
 *     ICC partiel). C'est volontaire — on garde le visuel, pas le fingerprint.
 *
 * Limites :
 *   · HEIC/HEIF non supportés en encode navigateur → on retombe sur le
 *     fichier original et on documente (rare en pratique : iOS convertit
 *     automatiquement en JPEG lors de l'upload web).
 *   · Les photos sans EXIF ne sont PAS re-encodées (évite une perte de qualité
 *     inutile). On détecte via la présence d'un marker JPEG APP1 (0xFFE1) ou
 *     on re-encode systématiquement en best-effort — ici on choisit la
 *     simplicité : re-encode si le MIME est strippable.
 *
 * Qualité d'encodage : 0.92 par défaut — perte visuelle imperceptible,
 * réduction de 10-30% du poids typique.
 */

const STRIPPABLE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

/** Mapping MIME d'entrée → MIME de sortie (on reste sur le même format). */
function outputMime(input: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (input === 'image/png') return 'image/png'
  if (input === 'image/webp') return 'image/webp'
  return 'image/jpeg' // jpeg par défaut (inclut 'image/jpg')
}

/** Re-encode via canvas pour produire un blob sans métadonnées. */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob a renvoyé null'))),
      type,
      quality,
    )
  })
}

export interface StripExifOptions {
  /** Qualité d'encodage JPEG/WebP, 0-1. Ignoré pour PNG. Défaut : 0.92. */
  quality?: number
  /**
   * Taille maximale du côté le plus long, en pixels. L'image est downscalée
   * proportionnellement si elle dépasse ce seuil. Défaut : 2400 (suffisant
   * pour un écran Retina 5K en lightbox, tout en divisant par 4-6 le poids
   * typique d'une photo 12 MP moderne). Mets `Infinity` pour désactiver.
   *
   * Justification éco-conception (GUIDELINES.md) :
   *   · photo 4000×3000 jpeg q0.92 ≈ 3-4 Mo
   *   · photo 2400×1800 jpeg q0.92 ≈ 0.6-0.9 Mo
   *   → 75% de bande passante économisée, perte visuelle nulle en usage feed.
   */
  maxLongEdge?: number
}

/**
 * Calcule les dimensions cibles en préservant l'aspect ratio.
 * Retourne `null` si aucun downscale n'est nécessaire.
 */
function computeDownscale(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } | null {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return null
  const ratio = maxLongEdge / longEdge
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

/**
 * Retourne un `File` visuellement identique (ou légèrement downscalé),
 * dépourvu de métadonnées.
 * Si le format n'est pas strippable (HEIC, GIF…), retourne le file original.
 */
export async function stripExif(file: File, options: StripExifOptions = {}): Promise<File> {
  const { quality = 0.92, maxLongEdge = 2400 } = options

  if (!STRIPPABLE_MIMES.has(file.type)) {
    // Format non supporté → on laisse passer tel quel.
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // createImageBitmap peut échouer sur des JPEG CMYK exotiques ou profils
    // ICC invalides. On retombe sur le fichier original plutôt que de bloquer.
    return file
  }

  // Downscale éventuel : on calcule les dimensions cibles avant d'allouer le
  // canvas, puis `drawImage` fait le resampling bilinéaire natif (suffisant
  // pour du JPEG q=0.92 — pas besoin de Lanczos côté client, gain CPU mobile).
  const target = computeDownscale(bitmap.width, bitmap.height, maxLongEdge)
  const outW = target?.width ?? bitmap.width
  const outH = target?.height ?? bitmap.height

  // Canvas 2D — on dessine le bitmap, on re-sérialise, EXIF out.
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, outW, outH)
  bitmap.close?.() // libère la VRAM dès que le canvas a la pixel data

  const mime = outputMime(file.type)
  let blob: Blob
  try {
    blob = await canvasToBlob(canvas, mime, quality)
  } catch {
    return file
  }

  // Nom conservé (changement d'extension si on convertit .jpg → .jpeg, marginal).
  // `lastModified` mis à now() pour ne pas réinjecter la date de prise de vue
  // dans le nom / dans les métadonnées système — cohérent avec le strip.
  const cleanName = file.name.replace(
    /\.(jpe?g|png|webp)$/i,
    mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : '.webp',
  )
  return new File([blob], cleanName, { type: mime, lastModified: Date.now() })
}
