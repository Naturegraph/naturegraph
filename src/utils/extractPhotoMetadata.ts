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
  /** Timestamp EXIF DateTimeOriginal (brut, pour détection de série). */
  capturedAt?: Date
}

/**
 * Détails de prise de vue (EXIF enrichi) — alimente le panneau ℹ️ lightbox
 * et la colonne `media.exif` (JSONB). Tous champs optionnels : une photo
 * capture d'écran n'a rien de tout ça.
 *
 * Les champs sont des string ou number bruts — l'UI formate (ex: "f/4.5",
 * "1/1000 s", "ISO 400"). On ne transforme pas côté extraction pour garder
 * la donnée fidèle au capteur.
 */
export interface PhotoExifDetails {
  /** Marque du boîtier (Canon, Nikon, Sony, Fujifilm, iPhone…) */
  cameraMake?: string
  /** Modèle précis (EOS R5, Z6II, Alpha 7 IV…) */
  cameraModel?: string
  /** Focale en mm (ex: 200, 500) */
  focalLength?: number
  /** Sensibilité ISO (ex: 400, 1600) */
  iso?: number
  /** Vitesse d'obturation en secondes (ex: 0.001 pour 1/1000s) */
  shutterSpeed?: number
  /** Ouverture f-number (ex: 4.5, 2.8) */
  aperture?: number
  /** Altitude GPS en mètres */
  altitude?: number
  /** Cap boussole lors de la prise de vue (0-360°) */
  heading?: number
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

    const result: PhotoMetadata = {}

    // Date/heure — priorité :
    //   1. EXIF DateTimeOriginal (capture caméra réelle)
    //   2. EXIF CreateDate (fallback)
    //   3. file.lastModified (cas iPhone HEIC mal parsé, screenshots, etc.) —
    //      mieux que la date du jour quand l'EXIF est absent.
    let captureSource: Date | null = null
    const exifRaw = exif?.DateTimeOriginal ?? exif?.CreateDate
    if (exifRaw instanceof Date && !isNaN(exifRaw.getTime())) {
      captureSource = exifRaw
    } else if (file.lastModified && file.lastModified > 0) {
      // file.lastModified = timestamp Unix ms du fichier sur disque. Pour
      // une photo importée depuis la galerie, c'est généralement la date
      // de prise de vue (ou très proche). Pas idéal mais meilleur fallback.
      captureSource = new Date(file.lastModified)
    }

    if (captureSource && !isNaN(captureSource.getTime())) {
      result.capturedAt = captureSource
      // Format ISO YYYY-MM-DD (local — évite le décalage UTC qui basculerait
      // une photo prise à 23h en jour suivant)
      const y = captureSource.getFullYear()
      const m = String(captureSource.getMonth() + 1).padStart(2, '0')
      const d = String(captureSource.getDate()).padStart(2, '0')
      result.date = `${y}-${m}-${d}`

      const h = String(captureSource.getHours()).padStart(2, '0')
      const min = String(captureSource.getMinutes()).padStart(2, '0')
      result.time = `${h}:${min}`
      result.timeOfDay = inferTimeOfDay(captureSource.getHours())
    }

    if (!exif) return result

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
 * Extrait les détails de prise de vue (EXIF enrichi) — persisté en
 * `media.exif` (JSONB). Alimente le panneau ℹ️ de la lightbox.
 *
 * Best-effort : tout champ absent reste undefined. Ne jette jamais.
 */
export async function extractExifDetails(file: File): Promise<PhotoExifDetails> {
  try {
    const exif = await exifr.parse(file, {
      pick: [
        'Make',
        'Model',
        'FocalLength',
        'ISO',
        'ExposureTime',
        'FNumber',
        'GPSAltitude',
        'GPSImgDirection',
      ],
    })
    if (!exif) return {}

    const result: PhotoExifDetails = {}
    if (typeof exif.Make === 'string' && exif.Make.trim()) {
      result.cameraMake = exif.Make.trim()
    }
    if (typeof exif.Model === 'string' && exif.Model.trim()) {
      result.cameraModel = exif.Model.trim()
    }
    if (typeof exif.FocalLength === 'number' && Number.isFinite(exif.FocalLength)) {
      result.focalLength = exif.FocalLength
    }
    if (typeof exif.ISO === 'number' && Number.isFinite(exif.ISO)) {
      result.iso = exif.ISO
    }
    if (typeof exif.ExposureTime === 'number' && Number.isFinite(exif.ExposureTime)) {
      result.shutterSpeed = exif.ExposureTime
    }
    if (typeof exif.FNumber === 'number' && Number.isFinite(exif.FNumber)) {
      result.aperture = exif.FNumber
    }
    if (typeof exif.GPSAltitude === 'number' && Number.isFinite(exif.GPSAltitude)) {
      result.altitude = exif.GPSAltitude
    }
    if (typeof exif.GPSImgDirection === 'number' && Number.isFinite(exif.GPSImgDirection)) {
      result.heading = exif.GPSImgDirection
    }
    return result
  } catch {
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
