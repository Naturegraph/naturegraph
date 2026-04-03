/**
 * SpeciesSearch — Autocomplétion espèce sur données TAXREF mock
 *
 * Recherche par nom commun ou scientifique (filtre local, min 2 caractères).
 * Affiche le crédit obligatoire TAXREF / INPN CC-BY.
 *
 * TODO [BACKEND] — Remplacer le mock par l'API TAXREF réelle :
 *   GET https://taxref.mnhn.fr/api/taxa/search?term=...&size=10
 *   ou via table taxref_cache Supabase (src/types/database.ts → TaxrefEntry).
 *   Attribution CC-BY INPN obligatoire à conserver dans l'UI (voir CLAUDE.md).
 */

import { useState, useId } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'

export interface MockSpecies {
  id: string
  commonName: string
  scientificName: string
  group: TaxonomicGroup
}

// Données TAXREF mock — source : INPN, licence CC-BY
// Les cd_nom correspondent aux identifiants TAXREF officiels
const MOCK_SPECIES: MockSpecies[] = [
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

interface SpeciesSearchProps {
  /** Espèce actuellement sélectionnée (null = aucune sélection) */
  selected: MockSpecies | null
  onSelect: (species: MockSpecies) => void
  onClear: () => void
}

export function SpeciesSearch({ selected, onSelect, onClear }: SpeciesSearchProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results =
    query.length >= 2
      ? MOCK_SPECIES.filter(
          (s) =>
            s.commonName.toLowerCase().includes(query.toLowerCase()) ||
            s.scientificName.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 8)
      : []

  function handleSelect(species: MockSpecies) {
    onSelect(species)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{t('contribute.species.label')}</span>

      {selected ? (
        // Espèce sélectionnée — affichée en carte
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary bg-primary-light/20">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{selected.commonName}</p>
            <p className="text-xs text-muted-foreground italic">{selected.scientificName}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Changer d'espèce"
            className="size-7 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>
      ) : (
        // Champ de recherche avec autocomplétion
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={t('contribute.species.searchPlaceholder')}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-autocomplete="list"
            aria-controls={listId}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />

          {/* Suggestions */}
          {open && results.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 w-full mt-1 rounded-xl border border-border bg-cream-lighter shadow-lg overflow-hidden"
            >
              {results.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(s)}
                    className="w-full flex flex-col px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">{s.commonName}</span>
                    <span className="text-xs text-muted-foreground italic">{s.scientificName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Aucun résultat */}
          {open && query.length >= 2 && results.length === 0 && (
            <div className="absolute z-20 w-full mt-1 rounded-xl border border-border bg-cream-lighter shadow-lg px-4 py-3">
              <p className="text-sm text-muted-foreground">{t('contribute.species.noResults')}</p>
            </div>
          )}
        </div>
      )}

      {/* Attribution TAXREF obligatoire — voir CLAUDE.md */}
      <p className="text-[10px] text-muted-foreground">{t('contribute.species.taxrefCredit')}</p>
    </div>
  )
}
