/**
 * photoEdits — Types + helpers partagés pour les recadrages photo côté étape 1.
 *
 * Extrait de `EncounterStep1.tsx` pour préserver le Fast Refresh
 * (`react-refresh/only-export-components` exige qu'un fichier de composant
 * n'exporte que des composants).
 */

import type { PhotoEditResult } from './PhotoEditModal'

/** Clé stable pour un File (name + size + lastModified). */
export function photoFileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`
}

/** Map des édits par fichier (crop + alt), indexée par `photoFileKey`. */
export type PhotoEditsMap = Record<string, PhotoEditResult>
