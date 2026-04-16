/**
 * SpeciesSearch — Autocomplétion espèce via taxref_cache Supabase
 * ================================================================
 * Recherche multi-niveaux (full-text → trigram → ILIKE → mock local).
 * Aucune saisie libre autorisée : l'utilisateur doit sélectionner
 * une espèce depuis TAXREF ou choisir explicitement "Passer".
 *
 * États gérés :
 *   - idle      : champ vide, invitation à taper
 *   - loading   : requête en cours (debounce 300ms)
 *   - results   : liste de suggestions
 *   - empty     : aucun résultat
 *   - error     : Supabase indisponible (fallback mock silencieux)
 *   - selected  : espèce confirmée (carte récapitulative)
 *
 * Attribution CC-BY INPN obligatoire — voir CLAUDE.md.
 */

import { useState, useEffect, useRef, useId, useCallback } from 'react'
import { Search, X, Loader2, AlertCircle, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { searchSpecies } from '@/services/searchService'
import type { SpeciesHit } from '@/services/searchService'
import { TaxrefCredit } from '@/components/ui/TaxrefCredit'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/taxrefSpecies'

/** Délai de debounce en millisecondes */
const DEBOUNCE_MS = 300

/** Nombre max de suggestions affichées */
const MAX_SUGGESTIONS = 8

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchState = 'idle' | 'loading' | 'results' | 'empty' | 'error'

export interface SpeciesSearchProps {
  /** Espèce actuellement sélectionnée (null = aucune) */
  selected: SpeciesHit | null
  /** Callback quand une espèce est sélectionnée depuis TAXREF */
  onSelect: (species: SpeciesHit) => void
  /** Callback quand l'utilisateur désélectionne ou efface */
  onClear: () => void
  /**
   * Callback quand l'utilisateur choisit "Passer l'identification".
   * Si non fourni, le bouton Passer n'est pas affiché.
   */
  onSkip?: () => void
  /** Filtrer par groupe taxonomique (optionnel) */
  group?: string
}

/**
 * SpeciesSearch — Champ d'autocomplétion espèce avec validation TAXREF obligatoire.
 */
export function SpeciesSearch({ selected, onSelect, onClear, onSkip, group }: SpeciesSearchProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const listId = useId()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpeciesHit[]>([])
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [open, setOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)

  // ── Recherche avec debounce ───────────────────────────────────
  const runSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([])
        setSearchState('idle')
        setOpen(false)
        return
      }

      setSearchState('loading')
      setOpen(true)
      abortRef.current = false

      try {
        const hits = await searchSpecies(q, MAX_SUGGESTIONS, group)
        if (abortRef.current) return // requête annulée (nouvelle frappe)

        setResults(hits)
        setSearchState(hits.length > 0 ? 'results' : 'empty')
      } catch {
        if (abortRef.current) return
        setResults([])
        setSearchState('error')
      }
    },
    [group],
  )

  useEffect(() => {
    // Annule la requête précédente
    abortRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      runSearch(query)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  // ── Gestion sélection ─────────────────────────────────────────
  function handleSelect(species: SpeciesHit) {
    onSelect(species)
    setQuery('')
    setResults([])
    setSearchState('idle')
    setOpen(false)
  }

  function handleClear() {
    onClear()
    setQuery('')
    setResults([])
    setSearchState('idle')
    setOpen(false)
  }

  // ── Espèce sélectionnée — vue carte ───────────────────────────
  if (selected) {
    const groupConfig = TAXONOMIC_GROUP_CONFIG[selected.group_label ?? '']

    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground">
          {t('contribute.species.label')}
        </span>

        {/* Carte espèce confirmée */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary bg-primary/5">
          {/* Icône groupe taxonomique */}
          {groupConfig && (
            <span className="text-xl shrink-0" aria-hidden="true">
              {groupConfig.emoji}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {selected.common_name ?? selected.scientific_name}
            </p>
            <p className="text-xs text-muted-foreground italic truncate">
              {selected.scientific_name}
            </p>
            {groupConfig && (
              <p className="text-[10px] text-primary font-medium mt-0.5">{groupConfig.label}</p>
            )}
          </div>

          {/* Bouton désélectionner */}
          <button
            type="button"
            onClick={handleClear}
            aria-label={t('contribute.species.changeSpecies')}
            className="size-7 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>

        <TaxrefCredit compact />
      </div>
    )
  }

  // ── Champ de recherche ────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {t('contribute.species.label')}
        </span>

        {/* Bouton Passer (si callback fourni) */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1"
          >
            <HelpCircle className="size-3" aria-hidden="true" />
            {t('contribute.species.skip')}
          </button>
        )}
      </div>

      {/* Champ de saisie */}
      <div className="relative">
        {/* Icône état */}
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {searchState === 'loading' ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin" aria-hidden="true" />
          ) : (
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </span>

        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('contribute.species.searchPlaceholder')}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-busy={searchState === 'loading'}
          autoComplete="off"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-cream text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-shadow"
        />

        {/* Dropdown résultats */}
        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={t('contribute.species.suggestionsLabel')}
            className="absolute z-20 w-full mt-1 rounded-xl border border-border bg-surface-cream shadow-lg overflow-hidden"
          >
            {/* État : résultats */}
            {searchState === 'results' &&
              results.map((species) => {
                const gc = TAXONOMIC_GROUP_CONFIG[species.group_label ?? '']
                return (
                  <div key={species.taxref_id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelect(species)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 text-left transition-colors"
                    >
                      {gc && (
                        <span className="text-base shrink-0" aria-hidden="true">
                          {gc.emoji}
                        </span>
                      )}
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {species.common_name ?? species.scientific_name}
                        </span>
                        <span className="text-xs text-muted-foreground italic truncate">
                          {species.scientific_name}
                        </span>
                      </span>
                    </button>
                  </div>
                )
              })}

            {/* État : aucun résultat */}
            {searchState === 'empty' && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">{t('contribute.species.noResults')}</p>
                {onSkip && (
                  <button
                    type="button"
                    onMouseDown={onSkip}
                    className="mt-2 text-xs text-primary hover:underline focus-visible:outline-none"
                  >
                    {t('contribute.species.skipFromEmpty')}
                  </button>
                )}
              </div>
            )}

            {/* État : erreur (ne devrait pas arriver — fallback mock silencieux) */}
            {searchState === 'error' && (
              <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                {t('contribute.species.serviceUnavailable')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attribution CC-BY obligatoire */}
      <TaxrefCredit compact />
    </div>
  )
}
