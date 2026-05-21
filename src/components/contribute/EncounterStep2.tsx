/**
 * EncounterStep2 — Étape 2 : Carnet d'observations
 *
 * Permet d'ajouter une ou plusieurs espèces observées à l'observation :
 *   - Recherche par nom commun ou scientifique dans species_master Supabase
 *     (Phase 1 : seed ~200 espèces FR+QC, Phase 2 : expansion ~5 000 via GBIF)
 *   - Chaque entrée comporte un compteur d'individus modifiable
 *   - Option "Je ne connais pas l'espèce" pour une entrée inconnue
 *   - Toggle "Activer l'aide à l'identification" pour les mystères
 *
 * Design inspiré du pattern "Carnet d'observations" Figma.
 * Phase 1 (Nicolas 2026-05-19) : source de données = GBIF + Wikidata (CC0).
 * TAXREF/INPN retiré du produit (cf. PRD_SPECIES_DATABASE.md).
 */

import { useState, useId, useEffect, useMemo } from 'react'
import { Search, Trash2, Plus, Minus, HelpCircle, Filter, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'
import { searchSpecies, type SpeciesHit } from '@/services/searchService'
import { highlightMatch } from '@/utils/highlightMatch'
import { Button } from '@/components/ui/Button'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'
import hermineImg from '@/assets/images/hermine-empty-state.png'

/**
 * Emoji + libellé FR d'un groupe taxonomique — strictement aligné sur le
 * rendu de `SearchPanel` côté Home (cohérence design produit demandée par
 * Nicolas 2026-05-21). Source de vérité unique : `TAXONOMIC_GROUP_CONFIG`.
 *
 * Fallback "Autre" (✨) si le groupe est null ou inconnu — évite l'emoji 🌍
 * générique des anciennes maps locales.
 */
function groupConfig(group: string | null): { emoji: string; label: string } {
  const key = (group ?? 'other').toLowerCase()
  return TAXONOMIC_GROUP_CONFIG[key] ?? TAXONOMIC_GROUP_CONFIG.other
}

/**
 * Icône catégorie espèce — emoji du groupe dans un cercle violet clair.
 * Composant local pour rester DRY avec `SearchPanel.SpeciesCategoryIcon`
 * (même dimensions, même tokens DS — pas de duplication visuelle entre
 * la recherche globale et le partage d'observation).
 */
function SpeciesCategoryIcon({ group }: { group: string | null }) {
  return (
    <div
      className="size-10 rounded-full bg-primary-light flex items-center justify-center shrink-0 text-lg leading-none"
      aria-hidden="true"
    >
      {groupConfig(group).emoji}
    </div>
  )
}

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

/**
 * Groupes taxonomiques filtrables dans la recherche.
 * Aligné strictement sur `SPECIES_CATEGORIES` du `FeedFilterPanel` :
 * 5 catégories les plus courantes au MVP, sans emoji, pour cohérence
 * stricte produit (cf. second-agent/26 — itération Nicolas 2026-05-01).
 *
 * Les autres groupes (fish, plants, arachnids, mollusks, other) restent
 * supportés côté DB (`TaxonomicGroup`) mais ne sont pas exposés en filtre
 * tant que la masse critique de contributions n'est pas atteinte.
 */
const TAXONOMIC_FILTERS: { value: TaxonomicGroup; labelKey: string }[] = [
  { value: 'birds', labelKey: 'taxonomy.birds' },
  { value: 'mammals', labelKey: 'taxonomy.mammals' },
  { value: 'insects', labelKey: 'taxonomy.insects' },
  { value: 'amphibians', labelKey: 'taxonomy.amphibians' },
  { value: 'reptiles', labelKey: 'taxonomy.reptiles' },
]

/**
 * Barre de recherche avec autocomplétion + bouton filtre circulaire (Figma 6385-50262).
 *
 * Phase 1 (Nicolas 2026-05-19) : query species_master via searchService
 * (~200 espèces FR+QC en seed initial, extension Phase 2 via GBIF script).
 * Debounce 250ms pour limiter les appels DB lors d'une saisie rapide.
 * Si zéro résultat : on n'affiche rien (pas de fallback "Ajouter" pour
 * éviter les erreurs de saisie libre — la communauté ajoutera les espèces
 * manquantes via le workflow d'identification collaborative en Phase 2).
 * La portion du texte qui matche la requête est mise en gras (highlightMatch).
 */
function SpeciesSearchBar({ onAdd }: { onAdd: (species: ObservationEntry['species']) => void }) {
  const { t } = useTranslation()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // Filtres par groupe taxonomique — Set vide = tous les groupes acceptés.
  const [groupFilters, setGroupFilters] = useState<Set<TaxonomicGroup>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [results, setResults] = useState<SpeciesHit[]>([])

  function toggleGroup(g: TaxonomicGroup) {
    setGroupFilters((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  // Le filtre côté requête : si un seul groupe est sélectionné, on l'envoie
  // au backend (filtrage SQL). Si plusieurs, on filtre côté client après fetch.
  const singleGroup = useMemo(
    () => (groupFilters.size === 1 ? Array.from(groupFilters)[0] : undefined),
    [groupFilters],
  )

  /**
   * Met à jour la query et reset l'autocomplete si trop court.
   * Le clear est dans le handler (pas dans useEffect) pour respecter la
   * règle react-hooks/set-state-in-effect (pas de setState synchrone
   * dans le body d'un effet — sinon cascading renders).
   */
  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (value.trim().length < 2) {
      setResults([])
    }
  }

  // Debounced query → searchService.searchSpecies (species_master Supabase).
  // L'effet ne touche aux states que de façon asynchrone (dans la promise)
  // ou via les setters provenant de l'API externe — pas de setState sync
  // dans le body de l'effet (cf. react-hooks/set-state-in-effect).
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      searchSpecies(trimmed, 8, singleGroup)
        .then((hits) => {
          if (cancelled) return
          // Si plusieurs filtres actifs : filtrer côté client par group_label
          const filtered =
            groupFilters.size > 1
              ? hits.filter((h) => groupFilters.has((h.group_label ?? '') as TaxonomicGroup))
              : hits
          setResults(filtered.slice(0, 6))
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, singleGroup, groupFilters])

  /** Convertit un SpeciesHit en ObservationEntry.species pour le carnet. */
  function hitToSpecies(hit: SpeciesHit): ObservationEntry['species'] {
    return {
      id: hit.taxref_id,
      commonName: hit.common_name ?? hit.scientific_name,
      scientificName: hit.scientific_name,
      group: (hit.group_label ?? 'other') as TaxonomicGroup,
    }
  }

  function handleSelect(hit: SpeciesHit) {
    onAdd(hitToSpecies(hit))
    setQuery('')
    setOpen(false)
  }

  return (
    // `relative` sur le container racine permet au panel filtres d'être
    // positionné en absolute par-dessus le contenu suivant (cf. plus bas).
    <div className="relative flex flex-col gap-3">
      {/* Row : champ pill (flex-1) + bouton filtre circulaire — Figma 6385-50262 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <div className="flex items-center gap-2 h-12 px-5 rounded-full border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
            <Search className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={t('contribute.panel.searchSpecies')}
              role="combobox"
              aria-expanded={open && results.length > 0}
              aria-autocomplete="list"
              aria-controls={listId}
              autoComplete="off"
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>

          {/* Résultats autocomplete (species_master via searchService).
              Layout strictement aligné sur `SearchPanel` (Nicolas 2026-05-21) :
              icône catégorie (emoji groupe) + nom commun en gras + nom
              scientifique en italique + libellé FR du groupe à droite.
              La portion qui matche la requête est mise en gras via
              `highlightMatch` pour aider l'utilisateur à comprendre pourquoi
              le résultat remonte. */}
          {open && results.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 w-full mt-1 rounded-2xl border border-border bg-background shadow-lg overflow-hidden"
            >
              {results.map((hit, i) => {
                const commonName = hit.common_name ?? hit.scientific_name
                return (
                  <li key={hit.taxref_id} role="option" aria-selected={false}>
                    {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                    <button
                      type="button"
                      onMouseDown={() => handleSelect(hit)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20 text-left"
                    >
                      <SpeciesCategoryIcon group={hit.group_label} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {highlightMatch(commonName, query)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate italic">
                          {highlightMatch(hit.scientific_name, query)}
                        </p>
                      </div>
                      {/* Libellé FR du groupe taxonomique, muted, aligné à droite. */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {groupConfig(hit.group_label).label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Bouton filtre — BATCH 99 : border ajoutée pour cohérence avec autres icon buttons */}
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-label={t('contribute.panel.filterSpecies', { defaultValue: 'Filtrer' })}
          aria-expanded={filterOpen}
          className={[
            'relative size-12 shrink-0 rounded-full flex items-center justify-center',
            'border border-[var(--color-border)]',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            filterOpen
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-foreground hover:bg-muted/50 hover:border-foreground/40',
          ].join(' ')}
        >
          <Filter className="size-5" aria-hidden="true" />
          {groupFilters.size > 0 && (
            <span
              aria-label={t('contribute.panel.activeFiltersCount', {
                count: groupFilters.size,
                defaultValue: '{{count}} filtre(s) actif(s)',
              })}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-primary text-[11px] font-bold leading-none border border-background"
            >
              {groupFilters.size}
            </span>
          )}
        </button>
      </div>

      {/* Panel filtres — structuré comme FeedFilterPanel :
          - Header avec titre + close
          - Section "Par catégorie d'espèces" (chips toggleables)
          - Divider
          - Section "Précision de l'identification" (Bientôt — second-agent/26)
          - Footer : "Sauvegarder les filtres" + "Réinitialiser"
          Affiché en DROPDOWN absolute par-dessus le contenu suivant pour
          éviter le saut de mise en page (second-agent/26 itération
          2026-05-01). Shadow renforcée pour bien décoller du fond. */}
      {filterOpen && (
        <div className="absolute left-0 right-0 top-full mt-3 z-20 rounded-2xl border-[0.5px] border-border bg-background p-5 flex flex-col gap-5 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-title font-bold text-lg text-foreground">
              {t('contribute.panel.filtersTitle', { defaultValue: 'Filtres' })}
            </h4>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              aria-label={t('common.close', { defaultValue: 'Fermer' })}
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Section 1 — Par catégorie d'espèces */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-base text-muted-foreground">
              {t('contribute.panel.filterByCategory', {
                defaultValue: "Par catégorie d'espèces",
              })}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('contribute.panel.filterByCategory', {
                defaultValue: "Par catégorie d'espèces",
              })}
            >
              {TAXONOMIC_FILTERS.map((f) => {
                const active = groupFilters.has(f.value)
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    onClick={() => toggleGroup(f.value)}
                    className={[
                      // Style strictement identique à FilterChip du FeedFilterPanel
                      'inline-flex items-center justify-center h-8 px-3 rounded-full',
                      'font-body text-sm leading-[1.5] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      active
                        ? 'bg-primary-light border border-primary text-foreground'
                        : 'bg-transparent border border-border text-foreground hover:border-foreground/40',
                    ].join(' ')}
                  >
                    {t(f.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>

          <hr className="border-t-[0.5px] border-border" />

          {/* Section 2 — Précision de l'identification (Bientôt) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-base text-muted-foreground">
                {t('contribute.panel.filterPrecisionTitle', {
                  defaultValue: "Précision de l'identification",
                })}
              </p>
              <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wide">
                {t('home.filters.comingSoon')}
              </span>
            </div>
            <div className="flex flex-col gap-2 opacity-50 pointer-events-none">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex items-center justify-center size-5 rounded-[4px] bg-primary border border-primary shrink-0"
                >
                  <Check
                    className="size-3.5 text-primary-foreground"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm text-foreground">
                  {t('contribute.panel.precisionExact', { defaultValue: 'Espèce précise' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex items-center justify-center size-5 rounded-[4px] bg-background border-[1.5px] border-border shrink-0"
                />
                <span className="text-sm text-foreground">
                  {t('contribute.panel.precisionFamily', { defaultValue: 'Famille seulement' })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer — Sauvegarder + Réinitialiser
              Style strictement aligné sur FeedFilterPanel.panelFooter :
              Button DS variant="primary" + lien "Réinitialiser" en
              text-primary underline underline-offset-4 (toujours actif). */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setFilterOpen(false)}
              className="w-full"
            >
              {t('contribute.panel.saveFilters', { defaultValue: 'Sauvegarder les filtres' })}
            </Button>
            <button
              type="button"
              onClick={() => setGroupFilters(new Set())}
              className={[
                'font-body font-bold text-base leading-[1.5] text-primary underline underline-offset-4',
                'hover:opacity-80 transition-opacity',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
              ].join(' ')}
            >
              {t('common.reset', { defaultValue: 'Réinitialiser' })}
            </button>
          </div>
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
      {/* Icône espèce — emoji du groupe taxonomique pour cohérence avec le
          dropdown de recherche et SearchPanel (Nicolas 2026-05-21). */}
      <div
        className="size-9 rounded-full bg-primary-light flex items-center justify-center shrink-0 text-base leading-none"
        aria-hidden="true"
      >
        {entry.isUnknown ? (
          <HelpCircle className="size-4 text-primary" />
        ) : (
          <span>{groupConfig(entry.species?.group ?? null).emoji}</span>
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
  // helpIdentification + onHelpIdentificationChange : props gardées dans
  // l'interface pour ne pas casser ContributeEncounterForm — le toggle UI a
  // été masqué (workflow aide collaborative reporté en P2).
  helpIdentification: _helpIdentification,
  onHelpIdentificationChange: _onHelpIdentificationChange,
}: EncounterStep2Props) {
  const { t } = useTranslation()

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

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche */}
      <SpeciesSearchBar onAdd={handleAddSpecies} />

      {/* État vide — carte blanche bordurée (Figma Frame 4621) :
          hermine + pill menthe "Aucun résultat" + hint en Quicksand Bold. */}
      {!hasObservations && (
        <div className="rounded-xl border-[0.5px] border-border bg-background flex flex-col items-center overflow-hidden">
          <img src={hermineImg} alt="" width={230} height={128} className="mt-6" loading="lazy" />
          <div className="flex flex-col items-center gap-3 p-6 w-full">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-light text-[var(--color-action-default)] text-sm font-body font-medium leading-none">
              {t('contribute.panel.noResultsBadge', { defaultValue: 'Aucun résultat' })}
            </span>
            <p className="font-title font-bold text-lg text-foreground text-center">
              {t('contribute.panel.emptyHint')}
            </p>
          </div>
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

      {/* Ajouter une nouvelle observation — désactivé "Bientôt" pour MVP
          (logique multi-observation pas encore branchée côté backend). */}
      {hasObservations && (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={t('home.filters.comingSoon')}
          className="flex items-center gap-2 text-sm text-muted-foreground font-medium opacity-60 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('contribute.panel.addObservation')}
          <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wide ml-1">
            {t('home.filters.comingSoon')}
          </span>
        </button>
      )}

      {/* Toggle "Activer l'aide à l'identification" — masqué pour le moment,
          sera retravaillé plus tard (workflow d'aide collaborative en P2).
          Logique gardée côté state (helpIdentification + handlers) pour ne
          pas casser ContributeEncounterForm. JSX archivé dans le bloc JSDoc
          ci-dessous : il suffira de le ré-introduire le jour venu.

          @example
          <label htmlFor={toggleId} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-cream-lighter cursor-pointer">
            <span className="text-sm font-medium text-foreground">
              {t('contribute.panel.helpIdentification')}
            </span>
            <input id={toggleId} type="checkbox" checked={helpIdentification} onChange={(e) => onHelpIdentificationChange(e.target.checked)} role="switch" className="sr-only peer" />
            <div className={['relative w-10 h-5 rounded-full', helpIdentification ? 'bg-primary' : 'bg-muted'].join(' ')}>
              <span className={['absolute top-0.5 size-4 rounded-full bg-white shadow', helpIdentification ? 'translate-x-5' : 'translate-x-0.5'].join(' ')} />
            </div>
          </label>
       */}

      {/* Attribution sources (GBIF + Wikidata) affichée dans le footer
          de ContributeEncounterForm (sous les boutons Annuler/Suivant)
          — hiérarchie de l'info claire + visible en permanence. */}
    </div>
  )
}
