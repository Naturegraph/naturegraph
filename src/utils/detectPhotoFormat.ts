/**
 * detectPhotoFormat : Détection du format natif d'une photo côté client.
 *
 * PRD v2 § 4.1.3 : règle d'inférence basée sur le ratio width/height.
 *   ratio ≥ 1.05  → landscape
 *   ratio ≤ 0.95  → portrait
 *   sinon         → square
 *
 * Utilise `createImageBitmap` (fast, transférable, dispo partout sauf
 * Safari < 15) avec fallback `Image` pour les navigateurs anciens. Le
 * bitmap est explicitement fermé pour libérer la VRAM (éco-conception).
 */

export type PhotoFormat = 'portrait' | 'landscape' | 'square'

export interface PhotoDimensions {
  width: number
  height: number
  format: PhotoFormat
}

const LANDSCAPE_THRESHOLD = 1.05
const PORTRAIT_THRESHOLD = 0.95

/** Infère le format à partir des dimensions en pixels. */
export function inferFormat(width: number, height: number): PhotoFormat {
  if (height === 0) return 'square' // garde-fou, ne devrait jamais arriver
  const ratio = width / height
  if (ratio >= LANDSCAPE_THRESHOLD) return 'landscape'
  if (ratio <= PORTRAIT_THRESHOLD) return 'portrait'
  return 'square'
}

/**
 * Lit les dimensions réelles d'un fichier image et calcule son format.
 * Fonctionne hors réseau, en lisant l'objet File directement.
 */
export async function detectPhotoFormat(file: File): Promise<PhotoDimensions> {
  // Chemin rapide : createImageBitmap (asynchrone, off-main-thread sur
  // la plupart des navigateurs modernes).
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const dims: PhotoDimensions = {
        width: bitmap.width,
        height: bitmap.height,
        format: inferFormat(bitmap.width, bitmap.height),
      }
      // Libère la VRAM (sinon GC-dépendant)
      bitmap.close?.()
      return dims
    } catch {
      // Fallback si le format n'est pas supporté par createImageBitmap
      // (ex. HEIC sur certains Chromium)
    }
  }

  // Fallback : <img> + URL.createObjectURL
  return new Promise<PhotoDimensions>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims: PhotoDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: inferFormat(img.naturalWidth, img.naturalHeight),
      }
      URL.revokeObjectURL(url)
      resolve(dims)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de lire les dimensions de la photo'))
    }
    img.src = url
  })
}

/**
 * Détecte le format de plusieurs fichiers en parallèle.
 * L'ordre du tableau retourné correspond à l'ordre d'entrée.
 */
export async function detectBatchPhotoFormat(files: File[]): Promise<PhotoDimensions[]> {
  return Promise.all(files.map((f) => detectPhotoFormat(f)))
}
