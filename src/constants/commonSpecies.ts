/**
 * Espèces communes — fallback de référence pour l'autocomplétion en dev/offline.
 *
 * Phase 1 (Nicolas 2026-05-19) : la stratégie TAXREF/INPN a été abandonnée
 * (cf. PRD_SPECIES_DATABASE.md). On bascule sur GBIF (CC0) + Wikidata (CC0)
 * pour la base de données complète en production — voir table Supabase
 * `species_master`. Ce fichier sert uniquement de fallback minimal pour le
 * dev local et les tests, quand `species_master` n'est pas accessible.
 *
 * Les IDs ci-dessous sont des identifiants TAXREF historiques (cd_nom), conservés
 * uniquement pour la traçabilité interne. Ils seront alignés sur les GBIF
 * taxonKeys lors de la migration Phase 2.
 */

import type { TaxonomicGroup } from '@/types/database'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'

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

/**
 * Échantillon d'espèces courantes pour l'autocomplétion en dev/offline.
 * Le seed complet (~5000 espèces) vient de `species_master` en production.
 */
export const COMMON_SPECIES: CommonSpeciesEntry[] = [
  { id: '4001', commonName: 'Mésange charbonnière', scientificName: 'Parus major', group: 'birds' },
  {
    id: '3586',
    commonName: 'Hirondelle rustique',
    scientificName: 'Hirundo rustica',
    group: 'birds',
  },
  { id: '3248', commonName: 'Buse variable', scientificName: 'Buteo buteo', group: 'birds' },
  {
    id: '3562',
    commonName: 'Rougegorge familier',
    scientificName: 'Erithacus rubecula',
    group: 'birds',
  },
  { id: '3861', commonName: 'Cygne tuberculé', scientificName: 'Cygnus olor', group: 'birds' },
  {
    id: '3664',
    commonName: "Martin-pêcheur d'Europe",
    scientificName: 'Alcedo atthis',
    group: 'birds',
  },
  { id: '60612', commonName: 'Renard roux', scientificName: 'Vulpes vulpes', group: 'mammals' },
  {
    id: '100376',
    commonName: "Hérisson d'Europe",
    scientificName: 'Erinaceus europaeus',
    group: 'mammals',
  },
  { id: '4831', commonName: 'Écureuil roux', scientificName: 'Sciurus vulgaris', group: 'mammals' },
  { id: '60485', commonName: 'Blaireau européen', scientificName: 'Meles meles', group: 'mammals' },
  {
    id: '7021',
    commonName: 'Chevreuil européen',
    scientificName: 'Capreolus capreolus',
    group: 'mammals',
  },
  {
    id: '290',
    commonName: 'Grenouille rousse',
    scientificName: 'Rana temporaria',
    group: 'amphibians',
  },
  {
    id: '4878',
    commonName: 'Salamandre tachetée',
    scientificName: 'Salamandra salamandra',
    group: 'amphibians',
  },
  {
    id: '84913',
    commonName: 'Lézard vert occidental',
    scientificName: 'Lacerta bilineata',
    group: 'reptiles',
  },
  {
    id: '83791',
    commonName: 'Couleuvre à collier',
    scientificName: 'Natrix natrix',
    group: 'reptiles',
  },
  {
    id: '236193',
    commonName: 'Coccinelle à sept points',
    scientificName: 'Coccinella septempunctata',
    group: 'insects',
  },
  {
    id: '236074',
    commonName: 'Libellule fauve',
    scientificName: 'Libellula fulva',
    group: 'insects',
  },
  {
    id: '236551',
    commonName: 'Lucane cerf-volant',
    scientificName: 'Lucanus cervus',
    group: 'insects',
  },
  {
    id: '65474',
    commonName: 'Pissenlit officinal',
    scientificName: 'Taraxacum officinale',
    group: 'plants',
  },
  { id: '25637', commonName: 'Chêne pédonculé', scientificName: 'Quercus robur', group: 'plants' },
]
