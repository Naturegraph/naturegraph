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
import { TAXREF_SPECIES } from '@/constants/taxrefSpecies'
import type { TaxrefSpecies } from '@/constants/taxrefSpecies'

/** Alias exporté pour la compatibilité avec les composants existants */
export type MockSpecies = TaxrefSpecies

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
      ? TAXREF_SPECIES.filter(
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
