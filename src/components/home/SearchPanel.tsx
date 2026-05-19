/**
 * SearchPanel — Overlay de recherche globale
 * ============================================
 * PRD Recherche §3 — multi-entités : Espèces + Comptes.
 *
 * Filtres (§3.2) :
 *   - Tous      : espèces + comptes simultanément (défaut)
 *   - Espèces   : taxref uniquement
 *   - Comptes   : profils uniquement
 *
 * Comportement navigation (§3.3) :
 *   - Clic compte  → /profile/:username
 *   - Clic espèce  → Species Context Layer (feed contextualisé §6.1), pas de navigation
 *
 * Icônes espèces :
 *   - Emoji associé à la catégorie taxonomique (oiseau, mammifère…)
 *   - Pas de photo — trop lourd pour la BDD (MVP)
 *
 * Positionnement :
 *   - Mobile  : bottom sheet fixed (slide depuis le bas) + backdrop
 *   - Desktop : dropdown absolue ancrée au bouton dans le parent div.relative
 *
 * Historique (§3.5) :
 *   - localStorage v2 — items typés RecentItem (type + label + meta)
 *   - Max 5 items, suppression individuelle + effacer tout
 *
 * Accessibilité (WCAG AA) :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop/extérieur ferme
 *   - aria-live="polite" sur la zone de résultats
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { searchProfiles, searchSpecies } from '@/services/searchService'
import type { SpeciesHit, ProfileHit } from '@/services/searchService'
import { useSpecies } from '@/contexts/SpeciesContext'
import { EmptyState } from '@/components/ui'
import hermineIcon from '@/assets/images/hermine-icon.png'

// ─── Constantes ───────────────────────────────────────────────────────────────

const RECENT_KEY = 'naturegraph-recent-searches-v2'
const MAX_RECENT = 5

/**
 * Libellés de groupe taxonomique affichés dans les résultats.
 * Format Figma : "· Mammifères" (préfixe point, muted, aligné à droite).
 */
const GROUP_LABEL: Record<string, string> = {
  bird: 'Oiseaux',
  mammal: 'Mammifères',
  reptile: 'Reptiles',
  amphibian: 'Amphibiens',
  fish: 'Poissons',
  insect: 'Insectes',
  plant: 'Plantes',
  fungus: 'Champignons',
  other: 'Espèce',
}

/**
 * Emoji catégorie — icône légère associée au groupe taxonomique.
 * Utilisé à la place d'une photo (trop lourd BDD, MVP).
 */
const GROUP_EMOJI: Record<string, string> = {
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'species' | 'accounts'

/**
 * Item typé pour l'historique de recherche (remplace string[]).
 * Stocke le contexte complet pour ré-afficher l'icône/avatar au retour.
 */
type RecentItem =
  | {
      type: 'species'
      id: string
      label: string
      sublabel: string | null
      group: string | null
    }
  | {
      type: 'account'
      id: string
      label: string
      sublabel: string | null
      avatar_url: string | null
    }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

function loadRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentItem[]
  } catch {
    return []
  }
}

function saveRecent(list: RecentItem[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton d'une ligne de résultat — affiché pendant le chargement */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3" aria-hidden="true">
      <div className="size-10 rounded-full bg-muted animate-pulse shrink-0 motion-reduce:animate-none" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-32 bg-muted animate-pulse rounded-full motion-reduce:animate-none" />
        <div className="h-2.5 w-20 bg-muted animate-pulse rounded-full motion-reduce:animate-none" />
      </div>
    </div>
  )
}

/**
 * Icône catégorie espèce — emoji dans un cercle coloré.
 * Délibérément léger (pas d'image) pour le MVP.
 */
function SpeciesCategoryIcon({ group }: { group: string | null }) {
  const key = (group ?? 'other').toLowerCase()
  return (
    <div
      className="size-10 rounded-full bg-primary-light flex items-center justify-center shrink-0 text-lg leading-none"
      aria-hidden="true"
    >
      {GROUP_EMOJI[key] ?? '🌍'}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface SearchPanelProps {
  onClose: () => void
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const { setActiveSpecies } = useSpecies()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [recent, setRecent] = useState<RecentItem[]>(loadRecent)

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

  // Fermer si clic en dehors du panel (desktop dropdown + mobile)
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

  // ── Queries ───────────────────────────────────────────────────────────────

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 2
  const debouncedQuery = useDebounced(trimmed, 300)
  const enabled = debouncedQuery.length >= 2

  const speciesQuery = useQuery({
    queryKey: ['search', 'species', debouncedQuery],
    queryFn: () => searchSpecies(debouncedQuery, 8),
    enabled: enabled && (filter === 'all' || filter === 'species'),
    staleTime: 5 * 60 * 1000,
  })

  const profilesQuery = useQuery({
    queryKey: ['search', 'profiles', debouncedQuery],
    queryFn: () => searchProfiles(debouncedQuery, 8),
    enabled: enabled && (filter === 'all' || filter === 'accounts'),
    staleTime: 5 * 60 * 1000,
  })

  const filteredSpecies = speciesQuery.data ?? []
  const filteredUsers = profilesQuery.data ?? []

  const isLoading =
    (filter === 'all' && (speciesQuery.isFetching || profilesQuery.isFetching)) ||
    (filter === 'species' && speciesQuery.isFetching) ||
    (filter === 'accounts' && profilesQuery.isFetching)

  const hasSpeciesResults = filteredSpecies.length > 0
  const hasAccountResults = filteredUsers.length > 0

  const showRecent = !hasQuery && recent.length > 0
  const showEmpty = !hasQuery && recent.length === 0
  const noResults =
    hasQuery &&
    !isLoading &&
    ((filter === 'all' && !hasSpeciesResults && !hasAccountResults) ||
      (filter === 'species' && !hasSpeciesResults) ||
      (filter === 'accounts' && !hasAccountResults))

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Sélection espèce — PRD §3.3 Cas 2 : active le Species Context Layer
   * → le feed se contextualise automatiquement, pas de navigation vers /species/:id.
   */
  function handleSelectSpecies(species: SpeciesHit) {
    const item: RecentItem = {
      type: 'species',
      id: species.taxref_id,
      label: species.common_name ?? species.scientific_name,
      sublabel: species.scientific_name,
      group: species.group_label,
    }
    const updated = [item, ...recent.filter((r) => r.id !== species.taxref_id)].slice(0, MAX_RECENT)
    setRecent(updated)
    saveRecent(updated)
    setActiveSpecies(species)
    onClose()
  }

  function handleSelectAccount(user: ProfileHit) {
    const item: RecentItem = {
      type: 'account',
      id: user.id,
      label: `@${user.username}`,
      sublabel: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      avatar_url: user.avatar_url,
    }
    const updated = [item, ...recent.filter((r) => r.id !== user.id)].slice(0, MAX_RECENT)
    setRecent(updated)
    saveRecent(updated)
    onClose()
  }

  function handleRecentClick(item: RecentItem) {
    setQuery(item.type === 'species' ? item.label : item.label.replace('@', ''))
    inputRef.current?.focus()
  }

  function removeRecent(id: string) {
    const updated = recent.filter((r) => r.id !== id)
    setRecent(updated)
    saveRecent(updated)
  }

  function clearRecent() {
    setRecent([])
    localStorage.removeItem(RECENT_KEY)
  }

  // ── Contenu partagé mobile / desktop ─────────────────────────────────────

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'species', label: 'Espèces' },
    { id: 'accounts', label: 'Comptes' },
  ]

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <p className="font-title font-bold text-base text-foreground">Recherche</p>
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
        <div className="flex items-center gap-3 h-11 px-4 rounded-full bg-primary-light/60 border border-transparent focus-within:border-primary focus-within:bg-primary-light transition-colors">
          <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Espèce, utilisateur..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Rechercher une espèce ou un utilisateur"
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Effacer la saisie"
              className="shrink-0 size-5 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            >
              <X className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Filtres — Tous / Espèces / Comptes */}
      <div className="px-5 pb-3 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-foreground hover:bg-primary-light',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-border" aria-hidden="true" />

      {/* Zone de résultats */}
      <div
        role="region"
        aria-live="polite"
        aria-busy={isLoading}
        aria-label="Résultats de recherche"
        className="flex-1 overflow-y-auto md:max-h-[400px] md:flex-none"
      >
        {/* Empty state */}
        {showEmpty && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Recherchez une espèce ou un utilisateur…
          </p>
        )}

        {/* ── Historique ─────────────────────────────────────────────── */}
        {showRecent && (
          <div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-semibold text-foreground">Récent</p>
              <button
                type="button"
                onClick={clearRecent}
                className="text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Tout effacer
              </button>
            </div>

            {recent.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                <div className="flex items-center gap-3 px-5 py-3">
                  {item.type === 'species' ? (
                    <SpeciesCategoryIcon group={item.group} />
                  ) : (
                    <div className="size-10 rounded-full overflow-hidden bg-primary-light shrink-0">
                      <img
                        src={item.avatar_url ?? hermineIcon}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRecentClick(item)}
                    className="flex-1 min-w-0 text-left focus-visible:outline-none"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-xs text-muted-foreground truncate italic">
                        {item.sublabel}
                      </p>
                    )}
                  </button>
                  {/* Badge groupe pour les espèces dans l'historique */}
                  {item.type === 'species' && item.group && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      · {GROUP_LABEL[(item.group ?? 'other').toLowerCase()] ?? item.group}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRecent(item.id)}
                    aria-label={`Supprimer "${item.label}" de l'historique`}
                    className="size-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                  >
                    <X className="size-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Skeleton loading ────────────────────────────────────────── */}
        {isLoading && hasQuery && (
          <div aria-label="Chargement en cours">
            <SkeletonRow />
            <div className="mx-5 h-px bg-border" aria-hidden="true" />
            <SkeletonRow />
            <div className="mx-5 h-px bg-border" aria-hidden="true" />
            <SkeletonRow />
          </div>
        )}

        {/* ── Aucun résultat ──────────────────────────────────────────── */}
        {/* BATCH 7 / T-020 : adoption primitive EmptyState (a11y role=status + aria-live) */}
        {noResults && <EmptyState title={`Aucun résultat pour « ${query} »`} className="py-8" />}

        {/* ── Résultats Espèces ───────────────────────────────────────── */}
        {hasQuery &&
          !isLoading &&
          (filter === 'all' || filter === 'species') &&
          hasSpeciesResults && (
            <div>
              {filter === 'all' && (
                <p className="px-5 pt-3 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Espèces
                </p>
              )}
              {filteredSpecies.map((s, i) => {
                const groupKey = (s.group_label ?? 'other').toLowerCase()
                return (
                  <div key={s.taxref_id}>
                    {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                    {/*
                     * Clic → Species Context Layer (PRD §3.3 Cas 2)
                     * Pas de navigation vers /species/:id
                     */}
                    <button
                      type="button"
                      onClick={() => handleSelectSpecies(s)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20 text-left"
                    >
                      <SpeciesCategoryIcon group={s.group_label} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {s.common_name ?? s.scientific_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate italic">
                          {s.scientific_name}
                        </p>
                      </div>
                      {/* Style Figma : "· Oiseaux" muted, aligné à droite */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {GROUP_LABEL[groupKey] ?? s.group_label ?? 'Espèce'}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

        {/* ── Résultats Comptes ───────────────────────────────────────── */}
        {hasQuery &&
          !isLoading &&
          (filter === 'all' || filter === 'accounts') &&
          hasAccountResults && (
            <div>
              {filter === 'all' && hasSpeciesResults && (
                <div className="h-px bg-border mx-5 mt-1" aria-hidden="true" />
              )}
              {filter === 'all' && (
                <p className="px-5 pt-3 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Comptes
                </p>
              )}
              {filteredUsers.map((u, i) => (
                <div key={u.id}>
                  {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={() => handleSelectAccount(u)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20"
                  >
                    <div className="size-10 rounded-full overflow-hidden bg-primary-light shrink-0">
                      <img
                        src={u.avatar_url ?? hermineIcon}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        @{u.username}
                      </p>
                      {(u.first_name || u.last_name) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  )

  return (
    <>
      {/*
       * ── Panel unique — position responsif via Tailwind ────────────────────
       *   Mobile  : FULL PAGE (inset-0). Évite le mouvement du sheet quand le
       *             clavier mobile s'ouvre. Plus lisible, plus conforme.
       *   Desktop : dropdown ancré au bouton (md:absolute + top/right).
       *
       * Un seul div = un seul role="dialog", un seul panelRef, un seul inputRef.
       * Pas de backdrop mobile : le panel couvre déjà tout l'écran.
       */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className={[
          // Mobile : full page, flex-col pour que la zone résultats scrolle
          // dans son flex-1 (header + champ + filtres restent fixes en haut).
          // pb-[env(safe-area-inset-bottom)] pour la home bar iPhone.
          'fixed inset-0 z-[60] flex flex-col pb-[env(safe-area-inset-bottom)]',
          // Desktop : reset full page → dropdown absolu ancré au bouton
          'md:absolute md:inset-auto md:top-[calc(100%+8px)] md:right-0 md:w-[480px] md:rounded-lg md:pb-0 md:block',
          // Style commun
          'bg-cream-lighter border border-border shadow-xl overflow-hidden',
        ].join(' ')}
      >
        {panelContent}
      </div>
    </>
  )
}
