/**
 * EncounterStep2 — Étape 2 : Carnet d'observations
 *
 * Permet d'ajouter une ou plusieurs espèces observées à l'observation :
 *   - Recherche par nom commun ou scientifique (données TAXREF mock)
 *   - Chaque entrée comporte un compteur d'individus modifiable
 *   - Option "Je ne connais pas l'espèce" pour une entrée inconnue
 *   - Toggle "Activer l'aide à l'identification" pour les mystères
 *
 * Design inspiré du pattern "Carnet d'observations" Figma.
 * TODO [BACKEND] — Brancher sur la vraie API TAXREF (voir SpeciesSearch.tsx).
 */

import { useState, useId } from 'react'
import { Search, Trash2, Plus, Minus, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'
import { TAXREF_SPECIES } from '@/constants/taxrefSpecies'
import hermineImg from '@/assets/images/hermine-empty-state.png'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ObservationEntry {
  /** Identifiant temporaire local */
  id: string
  species: { id: string; commonName: string; scientificName: string; group: TaxonomicGroup } | null
  /** true = espèce non déterminée (mystère) */
  isUnknown: boolean
  count: number
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Barre de recherche avec autocomplétion pour ajouter une espèce */
function SpeciesSearchBar({ onAdd }: { onAdd: (species: ObservationEntry['species']) => void }) {
  const { t } = useTranslation()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results =
    query.length >= 2
      ? TAXREF_SPECIES.filter(
          (s) =>
            s.commonName.toLowerCase().includes(query.toLowerCase()) ||
            s.scientificName.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 6)
      : []

  function handleSelect(species: (typeof TAXREF_SPECIES)[0]) {
    onAdd(species)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-cream-lighter focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
        <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('contribute.panel.searchSpecies')}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
          aria-controls={listId}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Résultats */}
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
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary-light/30 transition-colors text-left"
              >
                <span>
                  <span className="text-sm font-medium text-foreground block">{s.commonName}</span>
                  <span className="text-xs text-muted-foreground italic">{s.scientificName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Aucun résultat */}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-20 w-full mt-1 rounded-xl border border-border bg-cream-lighter shadow-sm px-4 py-3">
          <p className="text-sm text-muted-foreground">{t('contribute.panel.noResults')}</p>
        </div>
      )}
    </div>
  )
}

/** Ligne d'une observation dans le carnet */
function ObservationRow({
  entry,
  onCountChange,
  onRemove,
}: {
  entry: ObservationEntry
  onCountChange: (id: string, delta: number) => void
  onRemove: (id: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-cream-lighter">
      {/* Icône espèce */}
      <div
        className="size-9 rounded-full bg-primary-light/40 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        {entry.isUnknown ? (
          <HelpCircle className="size-4 text-primary" />
        ) : (
          <span className="text-sm">🐾</span>
        )}
      </div>

      {/* Nom + groupe */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.isUnknown ? t('contribute.panel.unknownSpecies') : entry.species?.commonName}
        </p>
        <p className="text-xs text-muted-foreground italic truncate">
          {entry.isUnknown ? t('contribute.panel.unknownSubtitle') : entry.species?.scientificName}
        </p>
      </div>

      {/* Compteur individus */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        role="group"
        aria-label={t('contribute.panel.individualCount')}
      >
        <button
          type="button"
          onClick={() => onCountChange(entry.id, -1)}
          disabled={entry.count <= 1}
          aria-label="Diminuer"
          className="size-6 rounded-full border border-border flex items-center justify-center hover:border-primary/60 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Minus className="size-3" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium w-5 text-center tabular-nums">{entry.count}</span>
        <button
          type="button"
          onClick={() => onCountChange(entry.id, +1)}
          aria-label="Augmenter"
          className="size-6 rounded-full border border-border flex items-center justify-center hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-3" aria-hidden="true" />
        </button>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={`Supprimer ${entry.species?.commonName ?? 'cette observation'}`}
        className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface EncounterStep2Props {
  observations: ObservationEntry[]
  onAdd: (entry: ObservationEntry) => void
  onRemove: (id: string) => void
  onCountChange: (id: string, delta: number) => void
  helpIdentification: boolean
  onHelpIdentificationChange: (v: boolean) => void
}

export function EncounterStep2({
  observations,
  onAdd,
  onRemove,
  onCountChange,
  helpIdentification,
  onHelpIdentificationChange,
}: EncounterStep2Props) {
  const { t } = useTranslation()
  const toggleId = useId()

  /** Crée une nouvelle entrée espèce et l'ajoute au carnet */
  function handleAddSpecies(species: ObservationEntry['species']) {
    onAdd({
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      species,
      isUnknown: false,
      count: 1,
    })
  }

  const hasObservations = observations.length > 0
  const hasUnknown = observations.some((o) => o.isUnknown)

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche */}
      <SpeciesSearchBar onAdd={handleAddSpecies} />

      {/* État vide — hermine + hint */}
      {!hasObservations && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <img
            src={hermineImg}
            alt=""
            width={80}
            height={80}
            className="opacity-70"
            loading="lazy"
          />
          <p className="text-sm text-muted-foreground px-4">{t('contribute.panel.emptyHint')}</p>
        </div>
      )}

      {/* Carnet d'observations */}
      {hasObservations && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('contribute.panel.notebook')} ({observations.length})
          </p>
          {observations.map((entry) => (
            <ObservationRow
              key={entry.id}
              entry={entry}
              onCountChange={onCountChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Ajouter une nouvelle observation */}
      {hasObservations && (
        <button
          type="button"
          onClick={() => {
            /* scrolls to search bar — handled by focus on search */
          }}
          className="flex items-center gap-2 text-sm text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('contribute.panel.addObservation')}
        </button>
      )}

      {/* Toggle aide à l'identification — visible si mystère présent */}
      {hasUnknown && (
        <label
          htmlFor={toggleId}
          aria-label={t('contribute.panel.helpIdentification')}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-cream-lighter cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground">
            {t('contribute.panel.helpIdentification')}
          </span>
          <input
            id={toggleId}
            type="checkbox"
            checked={helpIdentification}
            onChange={(e) => onHelpIdentificationChange(e.target.checked)}
            role="switch"
            aria-checked={helpIdentification}
            className="sr-only peer"
          />
          {/* Toggle visuel */}
          <div
            aria-hidden="true"
            className={[
              'relative w-10 h-5 rounded-full transition-colors shrink-0',
              helpIdentification ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
                helpIdentification ? 'translate-x-5' : 'translate-x-0.5',
              ].join(' ')}
            />
          </div>
        </label>
      )}

      {/* Attribution TAXREF obligatoire — voir CLAUDE.md */}
      <p className="text-[10px] text-muted-foreground">{t('contribute.species.taxrefCredit')}</p>
    </div>
  )
}
