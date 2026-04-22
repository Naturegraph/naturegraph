/**
 * extractPhotoMetadata — Lecture EXIF des photos d'observation
 *
 * Utilisé à l'étape 1 du flow "Rencontre nature" pour pré-remplir
 * automatiquement la date, l'heure, les coordonnées GPS et en déduire
 * le moment de la journée.
 *
 * Fallback propre : si une donnée est absente (photo sans EXIF,
 * capture d'écran, WebP sans métadonnées), les champs restent undefined
 * et l'utilisateur remplit manuellement à l'étape 3.
 *
 * Lib : exifr build `lite` (~15 KB gzip) — lecture TIFF+GPS uniquement.
 *   · On n'a pas besoin de XMP/IPTC/ICC (full build) pour nos cas d'usage :
 *     DateTimeOriginal + GPS sont dans le segment TIFF que lite décode.
 *   · Gain ~10 KB gzip vs full — respecte le budget éco-conception (< 300 KB).
 */

// Import ciblé du build `lite` — pas d'entrée exports dans exifr/package.json,
// d'où le chemin direct vers dist/*.esm.mjs. Stable (API identique à la racine).
// Pas de .d.ts pour ce sous-chemin → @ts-expect-error ciblé sur l'import.
// @ts-expect-error — exifr ne publie pas de types pour les builds dérivés
import exifr from 'exifr/dist/lite.esm.mjs'
import type { TimeOfDay } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoMetadata {
  /** Date ISO (YYYY-MM-DD) prise de photo si dispo */
  date?: string
  /** Heure prise de photo (HH:mm) si dispo */
  time?: string
  /** Coordonnée GPS latitude */
  latitude?: number
  /** Coordonnée GPS longitude */
  longitude?: number
  /** Moment de la journée déduit de `time` */
  timeOfDay?: TimeOfDay
}

// ─── Time-of-day inference ────────────────────────────────────────────────────

/**
 * Déduit le moment de la journée à partir d'une heure locale (0-23).
 * Tranches volontairement simplifiées — alignées sur l'enum backend
 * (morning / afternoon / dusk / evening / night). On ne distingue pas
 * l'aube ici (regroupée avec morning) pour éviter la fausse précision.
 */
export function inferTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

// ─── API principale ───────────────────────────────────────────────────────────

/**
 * Extrait les métadonnées EXIF d'une image. Best-effort — ne jette jamais.
 * Retourne un objet vide si aucune donnée exploitable n'est trouvée.
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    // On cible uniquement les blocs nécessaires pour rester léger :
    //   - DateTimeOriginal : date/heure de prise de vue (préférée à `ModifyDate`)
    //   - latitude/longitude : GPS (exifr fait le parsing DMS → décimal)
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    })

    if (!exif) return {}

    const result: PhotoMetadata = {}

    // Date/heure — DateTimeOriginal prioritaire, sinon CreateDate
    const raw = exif.DateTimeOriginal ?? exif.CreateDate
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      // Format ISO YYYY-MM-DD (local — évite le décalage UTC qui basculerait
      // une photo prise à 23h en jour suivant)
      const y = raw.getFullYear()
      const m = String(raw.getMonth() + 1).padStart(2, '0')
      const d = String(raw.getDate()).padStart(2, '0')
      result.date = `${y}-${m}-${d}`

      const h = String(raw.getHours()).padStart(2, '0')
      const min = String(raw.getMinutes()).padStart(2, '0')
      result.time = `${h}:${min}`
      result.timeOfDay = inferTimeOfDay(raw.getHours())
    }

    // GPS — vérifie que les valeurs sont des nombres finis valides
    if (typeof exif.latitude === 'number' && Number.isFinite(exif.latitude)) {
      result.latitude = exif.latitude
    }
    if (typeof exif.longitude === 'number' && Number.isFinite(exif.longitude)) {
      result.longitude = exif.longitude
    }

    return result
  } catch {
    // Jamais bloquer l'UI pour un échec de parsing EXIF
    return {}
  }
}

/**
 * Agrège les métadonnées d'une liste de photos. Prend la première photo
 * ayant des données valides pour chaque champ (date, GPS, etc.).
 * Cette stratégie correspond à l'UX voulue : "la première photo porte
 * le contexte de la rencontre".
 */
export async function extractBatchMetadata(files: File[]): Promise<PhotoMetadata> {
  if (files.length === 0) return {}
  const all = await Promise.all(files.map(extractPhotoMetadata))
  // Merge : premier non-undefined gagne
  return all.reduce<PhotoMetadata>((acc, m) => {
    if (!acc.date && m.date) acc.date = m.date
    if (!acc.time && m.time) acc.time = m.time
    if (!acc.timeOfDay && m.timeOfDay) acc.timeOfDay = m.timeOfDay
    if (acc.latitude === undefined && m.latitude !== undefined) acc.latitude = m.latitude
    if (acc.longitude === undefined && m.longitude !== undefined) acc.longitude = m.longitude
    return acc
  }, {})
}
