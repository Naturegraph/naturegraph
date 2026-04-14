/**
 * Espèces TAXREF mock — données de référence pour l'autocomplétion
 *
 * Source : INPN (Inventaire National du Patrimoine Naturel), licence CC-BY.
 * Les cd_nom correspondent aux identifiants TAXREF officiels.
 *
 * TODO [BACKEND] — Remplacer par l'API TAXREF réelle :
 *   GET https://taxref.mnhn.fr/api/taxa/search?term=...&size=10
 *   ou via table taxref_cache Supabase (src/types/database.ts → TaxrefEntry).
 *   Attribution CC-BY INPN obligatoire à conserver dans l'UI (voir CLAUDE.md).
 */

import type { TaxonomicGroup } from '@/types/database'

export interface TaxrefSpecies {
  id: string
  commonName: string
  scientificName: string
  group: TaxonomicGroup
}

/** Échantillon d'espèces TAXREF pour l'autocomplétion en développement */
export const TAXREF_SPECIES: TaxrefSpecies[] = [
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
