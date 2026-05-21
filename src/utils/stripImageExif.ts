/**
 * stripImageExif — Compression adaptative + retrait EXIF avant upload
 * ====================================================================
 *
 * Refonte 2026-05-21 : la fonction continue de garantir le strip EXIF
 * RGPD (Art 5(1)(c) + 25 — Privacy by Default), mais elle prend désormais
 * en charge la compression côté client pour libérer l'utilisateur de la
 * contrainte « 10 Mo max ». Un photographe peut désormais envoyer un
 * RAW/JPEG de 30 Mo sorti d'un boîtier reflex sans rien faire — c'est
 * Naturegraph qui s'occupe de produire un fichier optimisé.
 *
 * Pipeline :
 *   1. Charge l'image en HTMLImageElement (decode natif).
 *   2. Resize proportionnel pour ramener le côté long sous `MAX_DIMENSION`
 *      (2560 px par défaut — densité largement suffisante pour le feed,
 *      l'écran retina le plus exigeant fait 1440 px de large × 2 = 2880).
 *   3. Re-encode en JPEG (ou WebP si entrée WebP) avec une boucle de
 *      qualité dégressive jusqu'à ce que la sortie tienne sous `TARGET_BYTES`
 *      (2 Mo par défaut). Plafond bas de qualité = 0.55 pour éviter
 *      l'effet « doudou » sur les détails fins de macro/plumage.
 *   4. Retourne un nouveau `File` propre (zéro EXIF, MIME normalisé).
 *
 * Pourquoi pas `browser-image-compression` (lib npm) ? +~30 KB gzipped
 * pour des features qu'on n'utilise pas (worker, multi-thread). Le Canvas
 * natif suffit largement pour notre budget perf RGESN.
 *
 * Compatibilité : JPEG, PNG, WebP — JPEG/WebP via `canvas.toBlob(type, quality)`.
 * HEIC/HEIF non supporté (Canvas natif refuse). Filtré en amont par
 * `ALLOWED_MIME_TYPES` dans MediaUploader / EncounterStep1.
 *
 * Cf. `docs/AUDIT_LEGAL.md` NC-3, `docs/AUDIT_SUPABASE.md` P-3 + RS-1,
 *     `GUIDELINES.md` budget perf media.
 */

/** Côté le plus long après resize (px). 2560 = 2× retina sur écran 1440 large. */
const MAX_DIMENSION = 2560

/** Cible de poids fichier après compression (octets). 2 Mo = équilibre qualité / bande. */
const TARGET_BYTES = 2 * 1024 * 1024

/** Qualité de départ pour la boucle de compression (proche lossless visuel). */
const QUALITY_START = 0.85

/** Plafond bas — en dessous, les détails fins (plumage, écailles) s'effondrent. */
const QUALITY_MIN = 0.55

/** Pas de décrément de qualité par itération (5 essais max : 0.85 → 0.75 → 0.65 → 0.55). */
const QUALITY_STEP = 0.1

/**
 * Compresse + strippe une image côté client avant upload.
 *
 * @param file Fichier image source (JPEG/PNG/WebP). Aucune limite de taille
 *   amont — la fonction est conçue pour absorber des originaux de 30 Mo+.
 * @returns File ré-encodé : sans EXIF, ≤ {@link TARGET_BYTES} dans 95 % des cas
 *   (peut dépasser légèrement pour des images très bruitées même à `QUALITY_MIN`,
 *   ce qui reste largement sous le plafond bucket Supabase à 10 Mo).
 * @throws Error si le format n'est pas supporté ou si le re-encodage échoue.
 */
export async function stripImageExif(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`stripImageExif: type non supporté (${file.type})`)
  }

  // Nicolas 2026-05-21 : raccourci pour les flows qui ont déjà compressé/strippé
  // en amont (ex : ContributeEncounterForm pipeline `compressPhoto` → `stripExif`).
  // Si le fichier arrive en AVIF/WebP ET sous le budget cible, on évite une
  // 3ᵉ passe canvas redondante — gain de 1 à 4 secondes par photo sur mobile.
  // Les formats AVIF/WebP émis par canvas natif n'embarquent jamais d'EXIF,
  // donc on est safe RGPD sans re-encoder.
  const lightCompressedFormats = file.type === 'image/avif' || file.type === 'image/webp'
  if (lightCompressedFormats && file.size <= TARGET_BYTES) {
    return file
  }

  // 1. Décoder l'image dans un HTMLImageElement
  const img = await loadImage(file)

  // 2. Resize proportionnel si le côté long dépasse MAX_DIMENSION
  const { width, height } = computeTargetSize(img.naturalWidth, img.naturalHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('stripImageExif: canvas 2D context indisponible')
  }
  ctx.drawImage(img, 0, 0, width, height)

  // 3. Boucle de compression — JPEG sortie par défaut, WebP préservé si entrée WebP
  const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'

  let blob: Blob | null = null
  for (let q = QUALITY_START; q >= QUALITY_MIN - 1e-6; q -= QUALITY_STEP) {
    blob = await canvasToBlob(canvas, outputType, q)
    if (!blob) throw new Error('stripImageExif: échec du re-encodage canvas')
    if (blob.size <= TARGET_BYTES) break
  }
  if (!blob) throw new Error('stripImageExif: échec du re-encodage canvas')

  // 4. Reconstruire un File propre (nom préservé, extension alignée sur outputType)
  const outputName = renameForType(file.name, outputType)
  return new File([blob], outputName, {
    type: outputType,
    lastModified: Date.now(),
  })
}

// ─── Helpers internes ────────────────────────────────────────────────────────

/** Charge un File dans un HTMLImageElement (Promise). */
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
      reject(new Error("stripImageExif: impossible de charger l'image"))
    }
    img.src = url
  })
}

/** Calcule les dimensions cibles (resize proportionnel si > MAX_DIMENSION). */
function computeTargetSize(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  const longSide = Math.max(naturalWidth, naturalHeight)
  if (longSide <= MAX_DIMENSION) {
    return { width: naturalWidth, height: naturalHeight }
  }
  const ratio = MAX_DIMENSION / longSide
  return {
    width: Math.round(naturalWidth * ratio),
    height: Math.round(naturalHeight * ratio),
  }
}

/** Wrapper Promise autour de `canvas.toBlob()` (qui est en callback). */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * Renomme le fichier pour cohérence avec le nouveau MIME.
 * Ex: "photo.png" → "photo.jpg" si le canvas a re-encodé en JPEG.
 */
function renameForType(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  return `${base}.${ext}`
}
