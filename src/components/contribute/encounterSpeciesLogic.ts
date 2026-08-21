/**
 * encounterSpeciesLogic : logique pure du carnet d'espèces de l'étape 2 (Rencontre).
 *
 * Extrait d'EncounterStep2.tsx (Lot 4) et isolé en fonctions PURES pour être
 * testable sans providers. Le rendu (barre de recherche, lignes, sections) reste
 * dans EncounterStep2 et ses sous-composants, qui importent ces helpers.
 */

import type { TaxonomicGroup } from '@/types/database'
import type { ObservationEntry } from './EncounterStep2'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'

/**
 * Emoji + libellé FR d'un groupe taxonomique : strictement aligné sur le rendu de
 * `SearchPanel` (cohérence produit). Source de vérité unique : TAXONOMIC_GROUP_CONFIG.
 * Fallback "Autre" (✨) si le groupe est null ou inconnu.
 */
export function groupConfig(group: string | null): { emoji: string; label: string } {
  const key = (group ?? 'other').toLowerCase()
  return TAXONOMIC_GROUP_CONFIG[key] ?? TAXONOMIC_GROUP_CONFIG.other
}

/**
 * Regroupe les observations par groupe taxonomique (sections + pill de classe),
 * pour un affichage aligné sur le Carnet d'observations. Espèces non déterminées
 * -> groupe "Autre". L'ordre suit la première apparition de chaque groupe.
 */
export function groupObservations(
  entries: ObservationEntry[],
): { key: string; label: string; items: ObservationEntry[] }[] {
  const order: string[] = []
  const map = new Map<string, { key: string; label: string; items: ObservationEntry[] }>()
  for (const e of entries) {
    const key = e.isUnknown || !e.species ? 'other' : e.species.group
    if (!map.has(key)) {
      map.set(key, { key, label: groupConfig(key === 'other' ? null : key).label, items: [] })
      order.push(key)
    }
    map.get(key)!.items.push(e)
  }
  return order.map((k) => map.get(k)!)
}

/**
 * Groupes taxonomiques filtrables dans la recherche. Aligné sur les catégories du
 * FeedFilterPanel. Les groupes non listés restent supportés côté DB (TaxonomicGroup)
 * mais ne sont pas exposés en filtre tant que la masse critique n'est pas atteinte.
 */
export const TAXONOMIC_FILTERS: { value: TaxonomicGroup; labelKey: string }[] = [
  { value: 'birds', labelKey: 'taxonomy.birds' },
  { value: 'mammals', labelKey: 'taxonomy.mammals' },
  { value: 'insects', labelKey: 'taxonomy.insects' },
  { value: 'amphibians', labelKey: 'taxonomy.amphibians' },
  { value: 'reptiles', labelKey: 'taxonomy.reptiles' },
  // V1.1.0 (Nicolas 2026-05-26) : nouvelles catégories suite seed iNat
  { value: 'arachnids', labelKey: 'taxonomy.arachnids' },
  { value: 'mollusks', labelKey: 'taxonomy.mollusks' },
  { value: 'fish', labelKey: 'taxonomy.fish' },
]
