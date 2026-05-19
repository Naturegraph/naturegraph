/**
 * Configuration des groupes taxonomiques — labels FR + emojis.
 *
 * Phase 1 (Nicolas 2026-05-19) : suppression du mock COMMON_SPECIES.
 * La base de données complète vit dans Supabase `species_master`
 * (GBIF CC0 + Wikidata CC0). Ce fichier ne contient plus que la config
 * d'affichage (emoji + label par groupe), utilisée par FeedPost, SearchPanel
 * et EncounterStep2.
 *
 * Voir PRD_SPECIES_DATABASE.md pour la stratégie complète.
 */

import type { TaxonomicGroup } from '@/types/database'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'

/**
 * Type minimal d'une espèce — conservé pour compatibilité avec les rares
 * endroits qui typent encore des entrées d'espèces locales (tests, mocks).
 * En production, les espèces viennent de `species_master` et utilisent
 * le type `SpeciesHit` exposé par `searchService`.
 */
export interface CommonSpeciesEntry {
  id: string
  commonName: string
  scientificName: string
  group: TaxonomicGroup
}

// ─── Configuration des groupes taxonomiques ───────────────────────────────────

/**
 * Emoji et libellé par groupe taxonomique.
 * Utilisé dans SpeciesSearch, FeedPost chip, SearchPanel.
 *
 * Emojis dérivés de CATEGORY_EMOJIS (source de vérité — second-agent/09).
 */
export const TAXONOMIC_GROUP_CONFIG: Record<string, { emoji: string; label: string }> = {
  birds: { emoji: CATEGORY_EMOJIS.birds, label: 'Oiseaux' },
  mammals: { emoji: CATEGORY_EMOJIS.mammals, label: 'Mammifères' },
  insects: { emoji: CATEGORY_EMOJIS.insects, label: 'Insectes' },
  amphibians: { emoji: CATEGORY_EMOJIS.amphibians, label: 'Amphibiens' },
  reptiles: { emoji: CATEGORY_EMOJIS.reptiles, label: 'Reptiles' },
  arachnids: { emoji: CATEGORY_EMOJIS.arachnids, label: 'Arachnides' },
  mollusks: { emoji: CATEGORY_EMOJIS.mollusks, label: 'Mollusques' },
  fish: { emoji: CATEGORY_EMOJIS.fish, label: 'Poissons' },
  plants: { emoji: CATEGORY_EMOJIS.plants, label: 'Plantes' },
  other: { emoji: '✨', label: 'Autre' },
}
