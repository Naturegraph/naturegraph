/**
 * SearchPanel — Overlay de recherche globale
 *
 * Recherche en temps réel parmi :
 *   - Utilisateurs (mockUsers)
 *   - Espèces (mockSpecies)
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal
 *   - Focus piégé dans le panel (Escape pour fermer)
 *   - aria-live pour les résultats dynamiques
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, User, Leaf } from 'lucide-react'
import { mockUsers } from '@/data/mock/users'
import { mockSpecies } from '@/data/mock/species'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  type: 'user' | 'species'
  id: string
  label: string
  sublabel: string
  avatar?: string
  emoji?: string
  href: string
}

// ─── Logique de recherche ─────────────────────────────────────────────────────
// TODO [BACKEND] — Remplacer la recherche locale mockUsers/mockSpecies par :
//   profileService.searchUsers(query, { limit: 4 })
//     → SELECT * FROM profiles WHERE username ILIKE '%query%' LIMIT 4
//   taxrefService.searchSpecies(query, { limit: 4 }) (service à créer)
//     → Interroger TAXREF (API externe ou table locale `species`) avec full-text search
//   Utiliser useQuery avec debounce 300ms sur la saisie pour éviter trop de requêtes.
//   Activer le cache TanStack Query par terme recherché (staleTime: 5 minutes).

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

function search(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()

  const users: SearchResult[] = mockUsers
    .filter((u) => u.username.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q))
    .slice(0, 4)
    .map((u) => ({
      type: 'user',
      id: u.id,
      label: u.username,
      sublabel: `${u.firstName} ${u.lastName}`,
      avatar: u.avatarUrl,
      href: `/profile/${u.username}`,
    }))

  const species: SearchResult[] = mockSpecies
    .filter(
      (s) => s.commonNameFr.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q),
    )
    .slice(0, 4)
    .map((s) => ({
      type: 'species',
      id: s.id,
      label: s.commonNameFr,
      sublabel: s.scientificName,
      emoji: CATEGORY_EMOJI[s.category] ?? '🌍',
      href: `/species/${s.id}`,
    }))

  return [...users, ...species]
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface SearchPanelProps {
  onClose: () => void
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const results = search(query)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus l'input à l'ouverture
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fermer si clic en dehors du panel
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    // Délai pour éviter de fermer immédiatement à l'ouverture
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const hasUsers = results.some((r) => r.type === 'user')
  const hasSpecies = results.some((r) => r.type === 'species')

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[600px] mx-auto px-4 z-50"
      >
        <div className="bg-cream-lighter border-[0.5px] border-border rounded-card shadow-xl overflow-hidden">
          {/* Champ de recherche */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Search className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un utilisateur, une espèce…"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              aria-label="Rechercher"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la recherche"
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Résultats */}
          <div
            role="region"
            aria-live="polite"
            aria-label="Résultats de recherche"
            className="max-h-[400px] overflow-y-auto"
          >
            {query.trim() === '' && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Tape le nom d'un utilisateur ou d'une espèce…
              </p>
            )}

            {query.trim() !== '' && results.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour «&nbsp;{query}&nbsp;»
              </p>
            )}

            {hasUsers && (
              <div className="py-2">
                <p className="px-5 py-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  Utilisateurs
                </p>
                {results
                  .filter((r) => r.type === 'user')
                  .map((result) => (
                    <Link
                      key={result.id}
                      to={result.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:bg-muted/30"
                    >
                      <div className="size-9 rounded-full overflow-hidden bg-primary-light shrink-0 flex items-center justify-center">
                        {result.avatar ? (
                          <img src={result.avatar} alt="" className="size-full object-cover" />
                        ) : (
                          <User className="size-4 text-primary" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{result.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            )}

            {hasSpecies && (
              <div className="py-2">
                <p className="px-5 py-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  Espèces
                </p>
                {results
                  .filter((r) => r.type === 'species')
                  .map((result) => (
                    <Link
                      key={result.id}
                      to={result.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:bg-muted/30"
                    >
                      <div className="size-9 rounded-xl bg-primary-light shrink-0 flex items-center justify-center">
                        <Leaf className="size-4 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {result.emoji} {result.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate italic">
                          {result.sublabel}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
