/**
 * SearchPanel — Overlay de recherche globale
 *
 * Fonctionnalités :
 *   - Filtre par type : Espèces | Comptes
 *   - Recherches récentes stockées dans localStorage (max 5, supprimables)
 *   - Résultats en temps réel depuis les mocks (debounce manuel via 2 chars min)
 *   - Items séparés par des lignes fines
 *
 * Responsive :
 *   - Mobile  : bottom sheet (slide depuis le bas)
 *   - Desktop : overlay fixe centré en haut
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop ferme
 *   - aria-live="polite" sur la zone de résultats
 *
 * TODO [BACKEND] — Remplacer la recherche locale par :
 *   - profileService.searchUsers(query) → SELECT FROM profiles WHERE username ILIKE
 *   - taxrefService.searchSpecies(query) → full-text search TAXREF / table locale
 *   - useQuery + staleTime: 5min + debounce 300ms
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { searchProfiles, searchSpecies } from '@/services/searchService'

// ─── Constantes ───────────────────────────────────────────────────────────────

const RECENT_KEY = 'naturegraph-recent-searches'
const MAX_RECENT = 5

/** Libellés lisibles par catégorie d'espèce */
const CATEGORY_LABEL: Record<string, string> = {
  bird: 'Oiseau',
  mammal: 'Mammifère',
  reptile: 'Reptile',
  amphibian: 'Amphibien',
  fish: 'Poisson',
  insect: 'Insecte',
  plant: 'Plante',
  fungus: 'Champignon',
  other: 'Espèce',
}

/** Emoji représentatif par catégorie */
const CATEGORY_EMOJI: Record<string, string> = {
  bird: '🦅',
  mammal: '🦊',
  reptile: '🦎',
  amphibian: '🐸',
  fish: '🐟',
  insect: '🦋',
  plant: '🌿',
  fungus: '🍄',
  other: '🌍',
}

/** Debounce simple sur une valeur. */
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'species' | 'accounts'

// ─── Helpers localStorage ─────────────────────────────────────────────────────

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveRecent(list: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface SearchPanelProps {
  onClose: () => void
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('species')
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus l'input à l'ouverture
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fermer si clic en dehors du panel
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  // ── Résultats filtrés ─────────────────────────────────────────────────────

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 2
  const debouncedQuery = useDebounced(trimmed, 300)
  const enabled = debouncedQuery.length >= 2

  const speciesQuery = useQuery({
    queryKey: ['search', 'species', debouncedQuery],
    queryFn: () => searchSpecies(debouncedQuery, 8),
    enabled: enabled && filter === 'species',
    staleTime: 5 * 60 * 1000,
  })

  const profilesQuery = useQuery({
    queryKey: ['search', 'profiles', debouncedQuery],
    queryFn: () => searchProfiles(debouncedQuery, 8),
    enabled: enabled && filter === 'accounts',
    staleTime: 5 * 60 * 1000,
  })

  const filteredSpecies = speciesQuery.data ?? []
  const filteredUsers = profilesQuery.data ?? []

  const showRecent = !hasQuery && recent.length > 0
  const showEmpty = !hasQuery && recent.length === 0
  const noResults =
    hasQuery &&
    ((filter === 'species' && filteredSpecies.length === 0) ||
      (filter === 'accounts' && filteredUsers.length === 0))

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Enregistre le terme dans les récents avant de fermer */
  function handleSelect(term: string) {
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, MAX_RECENT)
    setRecent(updated)
    saveRecent(updated)
    onClose()
  }

  function removeRecent(term: string) {
    const updated = recent.filter((r) => r !== term)
    setRecent(updated)
    saveRecent(updated)
  }

  function clearRecent() {
    setRecent([])
    localStorage.removeItem(RECENT_KEY)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50" aria-hidden="true" />

      {/* Panel — bottom sheet mobile / overlay desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[600px] md:px-4 z-50">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          className="bg-cream-lighter border border-border rounded-t-2xl md:rounded-xl shadow-xl overflow-hidden"
        >
          {/* Handle bar — mobile uniquement */}
          <div className="md:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="font-title font-bold text-lg text-foreground">Recherche</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la recherche"
              className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="px-5 pb-3">
            <div className="flex items-center gap-3 h-12 px-4 rounded-full bg-primary-light/50 border border-transparent focus-within:border-primary focus-within:bg-primary-light transition-colors">
              <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Espèce, utilisateur..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Rechercher"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  aria-label="Effacer la saisie"
                  className="shrink-0 size-5 flex items-center justify-center focus-visible:outline-none"
                >
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Chips de filtre */}
          <div className="px-5 pb-3 flex gap-2">
            {(['species', 'accounts'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  filter === f
                    ? 'bg-foreground text-cream-lighter'
                    : 'bg-primary-light/50 text-foreground hover:bg-primary-light',
                ].join(' ')}
              >
                {f === 'species' ? 'Espèces' : 'Comptes'}
              </button>
            ))}
          </div>

          <div className="h-px bg-border" aria-hidden="true" />

          {/* Zone de résultats — aria-live pour annoncer les changements */}
          <div
            role="region"
            aria-live="polite"
            aria-label="Résultats de recherche"
            className="max-h-[50vh] md:max-h-[400px] overflow-y-auto"
          >
            {/* État vide (aucune recherche récente) */}
            {showEmpty && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Recherche une espèce ou un utilisateur…
              </p>
            )}

            {/* Recherches récentes */}
            {showRecent && (
              <div>
                <div className="flex items-center justify-between px-5 py-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Recherches récentes
                  </p>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    Tout effacer
                  </button>
                </div>

                {recent.map((term, i) => (
                  <div key={term}>
                    {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                    <div className="flex items-center gap-3 px-5 py-3">
                      <Search
                        className="size-4 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(term)
                          inputRef.current?.focus()
                        }}
                        className="flex-1 text-sm text-foreground text-left hover:text-primary transition-colors focus-visible:outline-none"
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(term)}
                        aria-label={`Supprimer "${term}" des recherches récentes`}
                        className="size-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <X className="size-3 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aucun résultat */}
            {noResults && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour «&nbsp;{query}&nbsp;»
              </p>
            )}

            {/* Résultats Espèces */}
            {hasQuery &&
              filter === 'species' &&
              filteredSpecies.map((s, i) => {
                const groupKey = (s.group_label ?? 'other').toLowerCase()
                return (
                  <div key={s.taxref_id}>
                    {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                    <Link
                      to={`/species/${s.taxref_id}`}
                      onClick={() => handleSelect(s.common_name ?? s.scientific_name)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20"
                    >
                      <div
                        className="size-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0 text-lg leading-none"
                        aria-hidden="true"
                      >
                        {CATEGORY_EMOJI[groupKey] ?? '🌍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {s.common_name ?? s.scientific_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate italic">
                          {s.scientific_name}
                        </p>
                      </div>
                      <span className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-full shrink-0">
                        {CATEGORY_LABEL[groupKey] ?? s.group_label ?? 'Espèce'}
                      </span>
                    </Link>
                  </div>
                )
              })}

            {/* Résultats Comptes */}
            {hasQuery &&
              filter === 'accounts' &&
              filteredUsers.map((u, i) => (
                <div key={u.id}>
                  {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={() => handleSelect(u.username)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20"
                  >
                    <div className="relative shrink-0">
                      <div className="size-10 rounded-full overflow-hidden bg-primary-light flex items-center justify-center">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="text-base leading-none" aria-hidden="true">
                            👤
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">@{u.username}</p>
                      {(u.first_name || u.last_name) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="size-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
