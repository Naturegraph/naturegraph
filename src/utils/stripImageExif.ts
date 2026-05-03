/**
 * stripImageExif — Retrait des métadonnées EXIF avant upload
 * ============================================================
 *
 * Ré-encode l'image via Canvas API, ce qui supprime naturellement TOUTES
 * les métadonnées EXIF (GPS, date prise de vue, marque/modèle appareil,
 * ICC profile, etc.) car le navigateur n'écrit aucune métadonnée lors du
 * `canvas.toBlob()`.
 *
 * RGPD Art 5(1)(c) — minimisation : on ne stocke que les pixels.
 * RGPD Art 25 — privacy by default : strip systématique sans action user.
 * Loi 25 Art 9 — sécurité raisonnable : mesure technique adaptée.
 *
 * Important : l'extraction EXIF pour pré-remplir le formulaire (date, GPS
 * suggéré dans l'étape 3 du flow d'observation) doit se faire AVANT cet
 * appel, sur le File original (cf. `src/utils/extractPhotoMetadata.ts`).
 * Une fois strippée, l'image n'a plus aucune métadonnée exploitable.
 *
 * Compatibilité :
 *   - JPEG, PNG, WebP : OK (re-encodage canvas natif tous navigateurs récents)
 *   - HEIC/HEIF : non supporté (à convertir en amont, ou rejeté par le form)
 *   - GIF, SVG : non supportés (ALLOWED_MIME_TYPES les exclut déjà)
 *
 * Performance :
 *   - Aucune dépendance ajoutée (Canvas API native, 0 KB bundle)
 *   - Re-encodage à qualité 0.92 → légère compression (~5-15 % de poids
 *     en moins) sans perte visible. Bonus éco-conception.
 *   - Photos > 4096 px sur le côté long sont resize (économie mémoire +
 *     respect du budget upload 10 MB).
 *
 * Cf. `docs/AUDIT_LEGAL.md` NC-3, `docs/AUDIT_SUPABASE.md` P-3 + RS-1.
 */

/** Dimension max d'un côté avant resize (économie mémoire canvas + bande passante). */
const MAX_DIMENSION = 4096

/** Qualité JPEG/WebP du re-encodage (0-1). 0.92 = quasi-lossless. */
const REENCODE_QUALITY = 0.92

/**
 * Strip EXIF metadata from an image File via Canvas re-encoding.
 *
 * Conserve les pixels et les dimensions (resize si > MAX_DIMENSION).
 * Retourne un nouveau File avec le même nom mais des métadonnées vides.
 *
 * @param file Fichier image source (JPEG/PNG/WebP)
 * @returns File ré-encodé sans EXIF
 * @throws Error si le format n'est pas supporté ou si le re-encodage échoue
 */
export async function stripImageExif(file: File): Promise<File> {
  // Garde-fou : le caller doit déjà avoir filtré les types non supportés
  // (cf. ALLOWED_MIME_TYPES dans EncounterStep1.tsx + mediaService.ts)
  if (!file.type.startsWith('image/')) {
    throw new Error(`stripImageExif: type non supporté (${file.type})`)
  }

  // PNG ne contient en théorie pas d'EXIF GPS, mais il peut contenir des
  // chunks tEXt/iTXt avec des métadonnées arbitraires. On re-encode par
  // sécurité pour garantir un strip complet.
  // (Si on voulait optimiser : skip le re-encodage pour PNG sans tEXt/iTXt
  // détectés. Mais cela demande un parser PNG → pas justifié pour le MVP.)

  // 1. Charger le File dans un HTMLImageElement
  const img = await loadImage(file)

  // 2. Calculer dimensions cibles (resize si nécessaire)
  const { width, height } = computeTargetSize(img.naturalWidth, img.naturalHeight)

  // 3. Dessiner sur un canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('stripImageExif: canvas 2D context indisponible')
  }
  ctx.drawImage(img, 0, 0, width, height)

  // 4. Ré-exporter en blob — le canvas n'écrit AUCUNE métadonnée EXIF
  //    Format de sortie = format d'entrée (préserve WebP si WebP en entrée).
  const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, outputType, REENCODE_QUALITY)
  if (!blob) {
    throw new Error('stripImageExif: échec du re-encodage canvas')
  }

  // 5. Reconstruire un File avec le même nom (pour conserver l'extension UX)
  //    mais le MIME peut avoir été normalisé (PNG → JPEG par défaut).
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
