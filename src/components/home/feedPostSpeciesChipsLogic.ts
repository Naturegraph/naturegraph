/**
 * feedPostSpeciesChips : logique de décision des chips catégorie + espèce d'un post.
 *
 * Extrait de FeedPost.tsx (Lot 4, factorisation) et isolé en fonction PURE pour
 * être testable sans providers (même approche que les helpers de NotifItem).
 * Le rendu JSX vit dans FeedPostSpeciesChips.tsx ; ici, seulement les règles.
 *
 * Règle produit (Nicolas 2026-05-01) : TOUJOURS catégorie d'abord puis espèce,
 * en 2 chips séparés (jamais fusionnés). Trois cas :
 *   1. Catégorie connue + espèce identifiée -> chip catégorie + chip espèce (nom).
 *   2. Catégorie connue + espèce non identifiée -> chip catégorie + "non déterminée".
 *   3. Rien d'identifié -> un seul chip "non déterminée".
 * Cliquabilité : la catégorie est cliquable si un handler de filtre existe ; l'espèce
 * est cliquable si un `taxref_id` est présent. `disableChipFilters` rend tout passif
 * (post principal de PostDetail).
 */

import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'

export interface SpeciesChipsInput {
  taxonomicGroup?: string | null
  species?: string | null
  scientificName?: string | null
  taxrefId?: string | null
  disableChipFilters?: boolean
  individualsCount?: number
  /** true si le parent (feed) fournit un handler de filtre par catégorie. */
  hasCategoryHandler: boolean
}

/** Chip catégorie : présent seulement si le groupe taxonomique est connu. */
export interface CategoryChipDescriptor {
  label: string
  clickable: boolean
}

/** Chip espèce : soit un nom identifié (cliquable ou non), soit "non déterminée". */
export type SpeciesChipDescriptor =
  | { kind: 'named'; text: string; clickable: boolean }
  | { kind: 'unknown' }

export interface SpeciesChipsDescriptor {
  category: CategoryChipDescriptor | null
  species: SpeciesChipDescriptor
  /** Suffixe "(N)" si N individus > 1 (sinon ""), appliqué aux deux modes. */
  countSuffix: string
}

/**
 * Calcule ce qu'il faut afficher (catégorie + espèce) à partir des données du post.
 * Fonction pure : pas d'effet de bord, pas de dépendance au rendu.
 */
export function computeSpeciesChips(input: SpeciesChipsInput): SpeciesChipsDescriptor {
  const {
    taxonomicGroup,
    species,
    scientificName,
    taxrefId,
    disableChipFilters = false,
    individualsCount,
    hasCategoryHandler,
  } = input

  const categoryLabel = taxonomicGroup
    ? (TAXONOMIC_GROUP_CONFIG[taxonomicGroup]?.label ?? null)
    : null
  const speciesName = species || scientificName || null

  const isCategoryClickable = hasCategoryHandler && !!taxonomicGroup && !disableChipFilters
  const isSpeciesClickable = !!taxrefId && !disableChipFilters
  const countSuffix = individualsCount && individualsCount > 1 ? ` (${individualsCount})` : ''

  return {
    category: categoryLabel ? { label: categoryLabel, clickable: isCategoryClickable } : null,
    species: speciesName
      ? { kind: 'named', text: speciesName, clickable: isSpeciesClickable }
      : { kind: 'unknown' },
    countSuffix,
  }
}
