/**
 * EncounterStep2 : Étape 2 : Carnet d'observations
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

import { useState, useId, useEffect, useMemo, useRef } from 'react'
import { Search, Trash2, HelpCircle, Filter, X, Check, Loader2, BookOpen } from 'lucide-react'
import { NOTEBOOKS_ENABLED } from '@/lib/featureFlags'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import { trackAction, trackFailure } from '@/lib/monitoring'
import { SUPPORT_EMAIL, mailtoLink } from '@/constants/contact'
import type { Notebook } from '@/services/notebookService'
import { highlightMatch } from '@/utils/highlightMatch'
import { Button } from '@/components/ui/Button'
import { CountStepper } from '@/components/ui/CountStepper'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'
import hermineImg from '@/assets/images/hermine-empty-state.png'

/**
 * Emoji + libellé FR d'un groupe taxonomique : strictement aligné sur le
 * rendu de `SearchPanel` côté Home (cohérence design produit demandée par
 * Nicolas 2026-05-21). Source de vérité unique : `TAXONOMIC_GROUP_CONFIG`.
 *
 * Fallback "Autre" (✨) si le groupe est null ou inconnu : évite l'emoji 🌍
 * générique des anciennes maps locales.
 */
function groupConfig(group: string | null): { emoji: string; label: string } {
  const key = (group ?? 'other').toLowerCase()
  return TAXONOMIC_GROUP_CONFIG[key] ?? TAXONOMIC_GROUP_CONFIG.other
}

/**
 * Regroupe les observations par groupe taxonomique (sections + pill de classe),
 * pour un affichage strictement aligne sur le Carnet d'observations
 * (NotebookSpeciesList). Especes non determinees -> groupe "Autre". L'ordre
 * suit la premiere apparition de chaque groupe.
 */
function groupObservations(
  entries: ObservationEntry[],
): { key: string; label: string; items: ObservationEntry[] }[] {
  const order: string[] = []
  const map = new Map<string, { key: string; label: string; items: ObservationEntry[] }>()
  for (const e of entries) {
    const key = e.isUnknown || !e.species ? 'other' : e.species.group
    if (!map.has(key)) {
      map.set(key, { key, label: groupConfig(key === 'other' ? null : key).label, items: [] })
      order.push(key)
    }
    map.get(key)!.items.push(e)
  }
  return order.map((k) => map.get(k)!)
}

/**
 * Icône catégorie espèce : emoji du groupe dans un cercle violet clair.
 * Composant local pour rester DRY avec `SearchPanel.SpeciesCategoryIcon`
 * (même dimensions, même tokens DS : pas de duplication visuelle entre
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
  species: {
    id: string
    commonName: string
    scientificName: string
    group: TaxonomicGroup
    /** V1.1.0 : 'species' = identification precise, 'family' = fallback famille */
    rank?: 'species' | 'family'
  } | null
  /** true = espèce non déterminée (mystère) */
  isUnknown: boolean
  count: number
  /** Si l'espèce vient d'un carnet importé : id du carnet source. Permet de
   *  remplacer uniquement les espèces du carnet (et garder les ajouts manuels)
   *  quand l'user change de carnet (Nicolas 2026-06-08). Absent = ajout manuel. */
  sourceNotebookId?: string
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/**
 * Groupes taxonomiques filtrables dans la recherche.
 * Aligné strictement sur `SPECIES_CATEGORIES` du `FeedFilterPanel` :
 * 5 catégories les plus courantes au MVP, sans emoji, pour cohérence
 * stricte produit (cf. second-agent/26 : itération Nicolas 2026-05-01).
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
  // V1.1.0 (Nicolas 2026-05-26) : nouvelles categories suite seed iNat
  { value: 'arachnids', labelKey: 'taxonomy.arachnids' },
  { value: 'mollusks', labelKey: 'taxonomy.mollusks' },
  { value: 'fish', labelKey: 'taxonomy.fish' },
]

/**
 * Barre de recherche avec autocomplétion + bouton filtre circulaire (Figma 6385-50262).
 *
 * Phase 1 (Nicolas 2026-05-19) : query species_master via searchService
 * (~200 espèces FR+QC en seed initial, extension Phase 2 via GBIF script).
 * Debounce 250ms pour limiter les appels DB lors d'une saisie rapide.
 * Si zéro résultat : on n'affiche rien (pas de fallback "Ajouter" pour
 * éviter les erreurs de saisie libre : la communauté ajoutera les espèces
 * manquantes via le workflow d'identification collaborative en Phase 2).
 * La portion du texte qui matche la requête est mise en gras (highlightMatch).
 */
// Mapping iNat class -> taxonomic_group (preserve cohenrence UI existante).
const CLASS_TO_GROUP: Record<string, TaxonomicGroup> = {
  Aves: 'birds',
  Mammalia: 'mammals',
  Insecta: 'insects',
  Amphibia: 'amphibians',
  Reptilia: 'reptiles',
  Actinopterygii: 'fish',
  Arachnida: 'arachnids',
  Mollusca: 'mollusks',
}

function SpeciesSearchBar({
  onAdd,
  onSearchActiveChange,
  inputRef,
  notebooks,
  onPickNotebook,
}: {
  onAdd: (species: ObservationEntry['species']) => void
  /** Fire avec true des que l user tape (query non vide), false quand vide.
   *  Permet au parent de masquer le placeholder "Aucun résultat" pendant la recherche. */
  onSearchActiveChange?: (active: boolean) => void
  /** Ref optionnelle vers l'input : permet au parent (bouton "Ajouter une
   *  espèce") de redonner le focus a la barre de recherche. */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Carnets existants selectionnables (bouton livre + dropdown). */
  notebooks: Notebook[]
  /** Ajoute toutes les especes d'un carnet existant aux observations. */
  onPickNotebook: (notebookId: string) => Promise<void> | void
}) {
  const { t } = useTranslation()
  const listId = useId()
  const [query, setQuery] = useState('')
  // Filtres par groupe taxonomique : Set vide = tous les groupes acceptés.
  const [groupFilters, setGroupFilters] = useState<Set<TaxonomicGroup>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  // Dropdown "carnet existant" (bouton livre, a droite du filtre).
  const [notebookOpen, setNotebookOpen] = useState(false)
  const [pickingId, setPickingId] = useState<string | null>(null)

  async function handlePickNotebook(notebookId: string) {
    setPickingId(notebookId)
    try {
      await onPickNotebook(notebookId)
      setNotebookOpen(false)
    } finally {
      setPickingId(null)
    }
  }
  const [results, setResults] = useState<TaxonomyHit[]>([])
  // V1.1.0 (Nicolas 2026-05-26) : toggles precision identification cumulatifs.
  // L user peut cocher les 2 pour cumuler les resultats (especes + familles
  // dans la meme recherche). Au moins 1 actif obligatoire (sinon zero resultats).
  const [includeSpecies, setIncludeSpecies] = useState(true)
  const [includeFamily, setIncludeFamily] = useState(false)
  // Nicolas 2026-05-22 : loader visible pendant le fetch + état d'erreur explicite
  // si l'espèce n'est pas trouvée, plutôt que de laisser le user sans feedback.
  const [isLoading, setIsLoading] = useState(false)
  // V1.1.4 NG-027 (Nicolas 2026-06-03) : etat erreur reseau distinct du
  // "aucun resultat". Avant : tout fetch raté retombait sur "Aucun
  // resultat" silencieux. Maintenant on differencie pour afficher
  // "Connexion lente, reessaye".
  const [hasNetworkError, setHasNetworkError] = useState(false)

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
   * Met à jour la query et reset les résultats si vide.
   * Nicolas 2026-05-22 : seuil abaissé à 1 lettre (vs 2 avant). La table
   * species_master a des indexes trigram (gin_trgm_ops) → recherche rapide
   * même sur 1 caractère, et user vient pour du feedback immédiat.
   */
  function handleQueryChange(value: string) {
    setQuery(value)
    onSearchActiveChange?.(value.trim().length > 0)
    if (value.trim().length === 0) {
      setResults([])
      setIsLoading(false)
    }
  }

  // Mapping group filter UI -> iNat class pour searchTaxonomy
  const GROUP_TO_CLASS: Record<string, string> = {
    birds: 'Aves',
    mammals: 'Mammalia',
    insects: 'Insecta',
    amphibians: 'Amphibia',
    reptiles: 'Reptilia',
    fish: 'Actinopterygii',
    arachnids: 'Arachnida',
    mollusks: 'Mollusca',
  }

  // Debounced query -> searchTaxonomy (taxonomy_nodes V1.1.0)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 1) return

    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      setIsLoading(true)
      const classFilter = singleGroup ? (GROUP_TO_CLASS[singleGroup] ?? null) : null
      // Cumul des rangs selon les checkboxes de precision (Nicolas 2026-05-26)
      const ranks: Array<'species' | 'family'> = []
      if (includeSpecies) ranks.push('species')
      if (includeFamily) ranks.push('family')
      if (ranks.length === 0) {
        // Defensif : si user decoche tout, on remet especes par defaut
        ranks.push('species')
      }
      setHasNetworkError(false)
      searchTaxonomy(trimmed, {
        ranks,
        classFilter,
        // V1.1.0 (Nicolas 2026-05-26) : limit augmente a 20 pour donner plus
        // de choix aux utilisateurs, surtout en mode combo especes + familles.
        limit: 20,
      })
        .then((hits) => {
          if (cancelled) return
          // Si plusieurs filtres actifs : filter cote client par class
          const filtered =
            groupFilters.size > 1
              ? hits.filter((h) =>
                  groupFilters.has(
                    (h.class && CLASS_TO_GROUP[h.class]
                      ? CLASS_TO_GROUP[h.class]
                      : 'other') as TaxonomicGroup,
                  ),
                )
              : hits
          // V1.1.0 : slice 16 (vs 6 avant) pour afficher au moins le double
          setResults(filtered.slice(0, 16))
          setIsLoading(false)
        })
        .catch((err) => {
          if (cancelled) return
          // V1.1.4 NG-027 (Nicolas 2026-06-03) : exception = panne reseau
          // ou Supabase indisponible. On marque l etat pour affichage.
          console.error('[EncounterStep2] searchTaxonomy failed', err)
          // C'est le "ca chargeait et me disait de me connecter a un reseau"
          // (soft launch) : on trace la longueur de la requete + le message pour
          // savoir si c'est un cold start, un timeout, ou une vraie panne.
          trackFailure('search.species', err instanceof Error ? err.message : 'inconnue', {
            queryLen: trimmed.length,
          })
          setResults([])
          setIsLoading(false)
          setHasNetworkError(true)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, singleGroup, groupFilters, includeSpecies, includeFamily])

  /** Convertit un TaxonomyHit en ObservationEntry.species pour le carnet. */
  function hitToSpecies(hit: TaxonomyHit): ObservationEntry['species'] {
    const cls = hit.class
    const group = cls && CLASS_TO_GROUP[cls] ? CLASS_TO_GROUP[cls] : ('other' as TaxonomicGroup)
    // Pour les familles : pas de nom commun FR le plus souvent, on utilise le
    // nom scientifique avec prefixe "Famille " pour clarte UI.
    const isFamily = hit.rank === 'family'
    const commonName = isFamily
      ? (hit.common_name_fr ?? `Famille ${hit.scientific_name}`)
      : (hit.common_name_fr ?? hit.scientific_name)
    return {
      id: hit.taxonomy_node_id,
      commonName,
      scientificName: hit.scientific_name,
      group,
      rank: isFamily ? 'family' : 'species',
    }
  }

  function handleSelect(hit: TaxonomyHit) {
    onAdd(hitToSpecies(hit))
    setQuery('')
    setResults([])
    onSearchActiveChange?.(false)
  }

  // Helper rendu : true quand l'utilisateur a tapé quelque chose. Les états
  // « pas encore tapé » / « en cours de recherche » / « aucun résultat » sont
  // distingués pour donner un feedback clair sur ce qu'il se passe.
  const hasQuery = query.trim().length >= 1
  const showEmpty = hasQuery && !isLoading && !hasNetworkError && results.length === 0

  // NG-064 : monitoring des termes qui ne renvoient AUCUNE espèce. Ces termes
  // alimentent la liste d'enrichissement de la base (lié NG-057). On dédoublonne
  // par terme (ref) pour ne logguer chaque terme sans résultat qu'une seule fois,
  // et seulement une fois la recherche stabilisée (showEmpty, donc hors chargement
  // et hors erreur réseau) : pas de bruit Sentry à chaque frappe.
  const lastZeroLoggedRef = useRef<string | null>(null)
  useEffect(() => {
    const term = query.trim()
    if (!showEmpty || !term) return
    if (lastZeroLoggedRef.current === term) return
    lastZeroLoggedRef.current = term
    trackAction('search.species.zero_result', { term })
  }, [showEmpty, query])

  return (
    <div className="flex flex-col gap-3">
      {/* Row search + filter : `relative z-30` ancre le panel filtres
          (rendu plus bas en absolute top-full) directement sous la row,
          pas sous le listbox de resultats. Sinon le panel se decalait
          sous les resultats (feedback Nicolas 2026-05-26). z-30 le passe
          au-dessus du listbox (z auto). */}
      {/* gap reduit + min-w-0 sur l'input : sur mobile etroit, le champ se
          retrecit pour que les 2 boutons (filtre + livre) restent visibles
          sans scroll horizontal (Nicolas 2026-06-09). */}
      <div className="relative z-30 flex items-center gap-2 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2 h-12 px-4 sm:px-5 rounded-full border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
            <Search className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={t('contribute.panel.searchSpecies')}
              role="combobox"
              aria-expanded={hasQuery}
              aria-autocomplete="list"
              aria-controls={listId}
              autoComplete="off"
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {/* Spinner inline pendant le fetch : feedback immédiat à l'user
                qu'on cherche dans la base. */}
            {isLoading && (
              <Loader2
                className="size-4 text-[var(--color-link)] motion-safe:animate-spin shrink-0"
                aria-label={t('common.loading')}
              />
            )}
          </div>
        </div>

        {/* Bouton filtre : BATCH 99 : border ajoutée pour cohérence avec autres icon buttons */}
        <button
          type="button"
          onClick={() => {
            setFilterOpen((v) => !v)
            setNotebookOpen(false)
          }}
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
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-[var(--color-link)] text-[11px] font-bold leading-none border border-background"
            >
              {groupFilters.size}
            </span>
          )}
        </button>

        {/* Bouton "carnet existant" : meme DS que le filtre (icone livre).
            Ouvre un dropdown des carnets enregistres ; en choisir un injecte
            toutes ses especes dans les observations (Nicolas 2026-06-08).
            NG (2026-06-11) : masque en prod (NOTEBOOKS_ENABLED) -> pas d'import
            de carnet dans une Rencontre. */}
        {NOTEBOOKS_ENABLED && (
          <button
            type="button"
            onClick={() => {
              setNotebookOpen((v) => !v)
              setFilterOpen(false)
            }}
            aria-label="Ajouter un carnet existant"
            aria-expanded={notebookOpen}
            className={[
              'relative size-12 shrink-0 rounded-full flex items-center justify-center',
              'border border-[var(--color-border)]',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              notebookOpen
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-foreground hover:bg-muted/50 hover:border-foreground/40',
            ].join(' ')}
          >
            <BookOpen className="size-5" aria-hidden="true" />
          </button>
        )}

        {/* Dropdown carnets existants : meme ancrage que le panel filtres */}
        {notebookOpen && (
          <div className="absolute left-0 right-0 top-full mt-3 z-20 rounded-2xl border-[0.5px] border-border bg-background shadow-xl overflow-hidden">
            {notebooks.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground text-center">
                Aucun carnet enregistré pour le moment.
              </p>
            ) : (
              <ul
                role="listbox"
                aria-label="Carnets existants"
                className="max-h-64 overflow-y-auto"
              >
                {notebooks.map((nb) => (
                  <li key={nb.id}>
                    <button
                      type="button"
                      onClick={() => handlePickNotebook(nb.id)}
                      disabled={pickingId !== null}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/50 disabled:opacity-50 focus-visible:outline-none focus-visible:bg-muted/50 border-b border-border last:border-b-0"
                    >
                      <span className="font-bold text-sm text-foreground truncate">
                        {nb.title?.trim() || 'Carnet sans titre'}
                      </span>
                      <span className="shrink-0 flex items-center gap-2 text-sm text-muted-foreground">
                        {nb.species_count} espèce{nb.species_count > 1 ? 's' : ''}
                        {pickingId === nb.id && (
                          <Loader2
                            className="size-4 text-[var(--color-link)] motion-safe:animate-spin"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Panel filtres : ancre `top-full` dans la row (parent relative z-30)
            pour etre un vrai dropdown overlay au-dessus du listbox de
            resultats, pas un bloc qui pousse le layout (feedback Nicolas
            2026-05-26). Structure : header + chips catégorie + checkboxes
            précision + footer (Sauvegarder + Réinitialiser). */}
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

            {/* Section 1 : Par catégorie d'espèces */}
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

            {/* Section 2 : Précision identification (V1.1.0 checkbox cumulatif) */}
            <div className="flex flex-col gap-3">
              <p className="font-body text-base text-muted-foreground">
                {t('contribute.panel.filterPrecisionTitle', {
                  defaultValue: "Précision de l'identification",
                })}
              </p>
              <p className="text-xs text-muted-foreground -mt-2">
                {t('contribute.panel.filterPrecisionHint', {
                  defaultValue: 'Tu peux cumuler les deux pour voir espèces + familles',
                })}
              </p>
              <div
                className="flex flex-col gap-2"
                role="group"
                aria-label={t('contribute.panel.filterPrecisionTitle', {
                  defaultValue: "Précision de l'identification",
                })}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={includeSpecies}
                  onClick={() => setIncludeSpecies((v) => !v)}
                  className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'flex items-center justify-center size-5 rounded-[4px] shrink-0 transition-colors',
                      includeSpecies
                        ? 'bg-primary border border-primary'
                        : 'bg-background border-[1.5px] border-border',
                    ].join(' ')}
                  >
                    {includeSpecies && (
                      <Check
                        className="size-3.5 text-primary-foreground"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="text-sm text-foreground">
                    {t('contribute.panel.precisionExact', { defaultValue: 'Espèce précise' })}
                  </span>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={includeFamily}
                  onClick={() => setIncludeFamily((v) => !v)}
                  className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'flex items-center justify-center size-5 rounded-[4px] shrink-0 transition-colors',
                      includeFamily
                        ? 'bg-primary border border-primary'
                        : 'bg-background border-[1.5px] border-border',
                    ].join(' ')}
                  >
                    {includeFamily && (
                      <Check
                        className="size-3.5 text-primary-foreground"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="text-sm text-foreground">
                    {t('contribute.panel.precisionFamily', { defaultValue: 'Famille seulement' })}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer : Sauvegarder + Réinitialiser */}
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
                  'font-body font-bold text-base leading-[1.5] text-[var(--color-link)] underline underline-offset-4',
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

      {/* ── Résultats de recherche INLINE : Nicolas 2026-05-22 ──────────────
          Avant : dropdown `absolute` au-dessus de la searchbar (caché par
          d'autres éléments en mobile et confusant car user n'avait aucun
          feedback). Maintenant : bloc inline qui pousse le contenu en
          dessous, toujours visible. Trois états :
            - Loading (delegé au spinner dans l'input) + skeleton de 3 lignes
            - Résultats > 0 : liste empilée
            - Résultats = 0 + fetch terminé : message « Aucune espèce trouvée »
              avec hint pour signaler une espèce manquante. */}
      {hasQuery && (
        <div
          id={listId}
          role="listbox"
          className="rounded-2xl border border-border bg-background overflow-hidden"
        >
          {isLoading && results.length === 0 && (
            <div className="px-5 py-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2
                className="size-4 text-[var(--color-link)] motion-safe:animate-spin"
                aria-hidden="true"
              />
              <span>
                {t('contribute.panel.searchLoading', {
                  defaultValue: 'Recherche en cours…',
                })}
              </span>
            </div>
          )}

          {/* V1.1.0 (Nicolas 2026-05-26) : si combo especes + familles, regroupe
              avec un header de section. Familles en haut (plus utiles comme
              fallback) puis especes en bas. */}
          {results.length > 0 &&
            (() => {
              const families = results.filter((h) => h.rank === 'family')
              const species = results.filter((h) => h.rank !== 'family')
              const showSeparator = families.length > 0 && species.length > 0
              const sections: Array<{ label: string; items: TaxonomyHit[] }> = []
              if (families.length > 0) {
                sections.push({
                  label: t('contribute.panel.sectionFamilies', { defaultValue: 'Familles' }),
                  items: families,
                })
              }
              if (species.length > 0) {
                sections.push({
                  label: t('contribute.panel.sectionSpecies', { defaultValue: 'Espèces' }),
                  items: species,
                })
              }
              return sections.map((section) => (
                <div key={section.label}>
                  {showSeparator && (
                    <div className="px-5 py-2 bg-muted/30 border-b border-border">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </p>
                    </div>
                  )}
                  {section.items.map((hit, i) => {
                    const groupLabel =
                      hit.class && CLASS_TO_GROUP[hit.class] ? CLASS_TO_GROUP[hit.class] : null
                    const isFamily = hit.rank === 'family'
                    const commonName = isFamily
                      ? (hit.common_name_fr ?? `Famille ${hit.scientific_name}`)
                      : (hit.common_name_fr ?? hit.scientific_name)
                    return (
                      <div key={hit.taxonomy_node_id} role="option" aria-selected={false}>
                        {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
                        <button
                          type="button"
                          onClick={() => handleSelect(hit)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/20 text-left"
                        >
                          <SpeciesCategoryIcon group={groupLabel} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {highlightMatch(commonName, query)}
                              {isFamily && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary-light text-[var(--color-link)] align-middle">
                                  {t('contribute.panel.familyBadge', { defaultValue: 'Famille' })}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate italic">
                              {highlightMatch(hit.scientific_name, query)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            : {groupConfig(groupLabel).label}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))
            })()}

          {showEmpty && (
            <div className="px-5 py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t('contribute.panel.noSpeciesFound', {
                  query,
                  defaultValue: 'Aucune espèce trouvée pour « {{query}} »',
                })}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {t('contribute.panel.noSpeciesHint', {
                  defaultValue:
                    "Vérifie l'orthographe ou utilise « Je ne connais pas l'espèce » en bas pour partager quand même.",
                })}
              </p>
              {/* NG-064 : signaler une espèce manquante. mailto vers le support
                  avec le terme cherché pré-rempli. Ne bloque jamais la
                  publication (l'utilisateur peut publier via « Je ne connais
                  pas l'espèce »). */}
              <a
                href={mailtoLink(
                  t('contribute.panel.reportMissingSubject', {
                    defaultValue: 'Espèce manquante sur Naturegraph',
                  }),
                  SUPPORT_EMAIL,
                  t('contribute.panel.reportMissingBody', {
                    query,
                    defaultValue:
                      'Bonjour,\n\nJe n’ai pas trouvé cette espèce dans la recherche : « {{query}} ».\n\nMerci de l’ajouter à la base si possible.\n\n(Écris ci-dessous le nom exact ou un lien si tu en as un.)',
                  }),
                )}
                className="mt-1 rounded text-xs font-medium text-[var(--color-link)] underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-link)]"
              >
                {t('contribute.panel.reportMissingSpecies', {
                  defaultValue: 'Signaler une espèce manquante',
                })}
              </a>
            </div>
          )}
          {/* V1.1.4 NG-027 (Nicolas 2026-06-03) : panne reseau affichee
              explicitement au lieu du faux "Aucun resultat" silencieux. */}
          {hasNetworkError && (
            <div
              role="alert"
              className="mx-3 my-3 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900"
            >
              {t('contribute.errors.speciesNetworkError', {
                defaultValue:
                  'Connexion lente ou interrompue. Verifie ta connexion ou reessaye dans un instant.',
              })}
            </div>
          )}
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
    // Ligne alignee sur le carnet (NotebookSpeciesList) pour une coherence
    // d'affichage totale entre Rencontre nature et Carnet d'observations.
    <li className="flex items-center gap-2">
      {/* Identite : avatar emoji 40px (#E7E9F7) + nom + nom latin */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="size-10 shrink-0 rounded-full bg-primary-light flex items-center justify-center text-lg leading-none"
          aria-hidden="true"
        >
          {entry.isUnknown ? (
            <HelpCircle className="size-5 text-[var(--color-link)]" />
          ) : (
            groupConfig(entry.species?.group ?? null).emoji
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-foreground truncate">
            {entry.isUnknown ? t('contribute.panel.unknownSpecies') : entry.species?.commonName}
            {entry.species?.rank === 'family' && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-primary-light text-[var(--color-link)] align-middle">
                {t('contribute.panel.familyBadge', { defaultValue: 'Famille' })}
              </span>
            )}
          </span>
          <span className="text-xs italic text-[var(--color-text-secondary)] truncate tracking-wide">
            {entry.isUnknown
              ? t('contribute.panel.unknownSubtitle')
              : entry.species?.scientificName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Compteur : saisie directe possible (CountStepper, identique carnet) */}
        <CountStepper
          value={entry.count}
          onChange={(next) => onCountChange(entry.id, next - entry.count)}
          label={t('contribute.panel.individualCount')}
        />

        {/* Supprimer : neutre (pas de rouge, coherence carnet) */}
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          aria-label={`Supprimer ${entry.species?.commonName ?? 'cette observation'}`}
          className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </li>
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
  /** Carnets existants selectionnables via le bouton livre. */
  notebooks: Notebook[]
  /** Injecte toutes les especes d'un carnet existant dans les observations. */
  onPickNotebook: (notebookId: string) => Promise<void> | void
}

export function EncounterStep2({
  observations,
  onAdd,
  onRemove,
  onCountChange,
  // helpIdentification + onHelpIdentificationChange : props gardées dans
  // l'interface pour ne pas casser ContributeEncounterForm : le toggle UI a
  // été masqué (workflow aide collaborative reporté en P2).
  helpIdentification: _helpIdentification,
  onHelpIdentificationChange: _onHelpIdentificationChange,
  notebooks,
  onPickNotebook,
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
  // Masque le placeholder "Aucun résultat" pendant que l user tape une recherche
  // (sinon il s affichait sous les suggestions, paradoxal : feedback Nicolas 2026-05-26).
  const [isSearching, setIsSearching] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche.
          NG (Nicolas 2026-06-11) : sur le site public (mono-espece), on la
          masque des qu'une espece est ajoutee -> pas de multi-especes/carnet.
          Remplacee par un encart "Bientot" (ci-dessous). En dev/staging :
          comportement multi-especes complet inchange. */}
      {(NOTEBOOKS_ENABLED || !hasObservations) && (
        <SpeciesSearchBar
          onAdd={handleAddSpecies}
          onSearchActiveChange={setIsSearching}
          notebooks={notebooks}
          onPickNotebook={onPickNotebook}
        />
      )}

      {/* État vide : carte blanche bordurée (Figma Frame 4621) :
          hermine + pill menthe "Aucun résultat" + hint en Quicksand Bold.
          Masqué pendant la recherche active pour ne pas dupliquer le feedback. */}
      {!hasObservations && !isSearching && (
        <div className="rounded-xl border-[0.5px] border-border bg-background flex flex-col items-center overflow-hidden">
          <img src={hermineImg} alt="" width={230} height={128} className="mt-6" loading="lazy" />
          <div className="flex flex-col items-center gap-3 p-6 w-full">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-light text-[var(--color-link)] text-sm font-body font-medium leading-none">
              {t('contribute.panel.noResultsBadge', { defaultValue: 'Aucun résultat' })}
            </span>
            <p className="font-title font-bold text-lg text-foreground text-center">
              {t('contribute.panel.emptyHint')}
            </p>
          </div>
        </div>
      )}

      {/* Carnet d'observations : groupe par classe (pills) + lignes, aligne
          sur NotebookSpeciesList pour une coherence d'affichage totale. */}
      {hasObservations && (
        <div className="flex flex-col gap-4">
          <p className="font-body text-base text-foreground">
            {t('contribute.panel.notebook')} ({observations.length})
          </p>
          {groupObservations(observations).map((grp) => (
            <section key={grp.key} aria-label={grp.label} className="flex flex-col gap-4">
              {/* Pill de groupe : token theme-aware (avant : bg #E7E9F7 en dur +
                  text-foreground = pilule blanche a texte invisible en dark,
                  retour Nicolas 2026-07-30). Meme combo prouve que les autres
                  pilules : bg-primary-light + texte --color-link. */}
              <span className="inline-flex items-center self-start h-8 px-3 rounded-full bg-primary-light text-[var(--color-link)] text-sm font-bold">
                {grp.label}
              </span>
              <ul className="flex flex-col gap-4">
                {grp.items.map((entry) => (
                  <ObservationRow
                    key={entry.id}
                    entry={entry}
                    onCountChange={onCountChange}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Bouton "Ajouter une nouvelle observation" RETIRE (Nicolas 2026-06-08) :
          redondant avec la barre de recherche, toujours accessible en haut. */}

      {/* NG (Nicolas 2026-06-11) : sur le site public, mono-espece -> la barre de
          recherche est masquee des qu'une espece est ajoutee (cf. plus haut).
          Pas d'encart "Bientot" (eviter les faux espoirs, decision Nicolas). */}

      {/* Toggle "Activer l'aide à l'identification" : masqué pour le moment,
          sera retravaillé plus tard (workflow d'aide collaborative en P2).
          Logique gardée côté state (helpIdentification + handlers) pour ne
          pas casser ContributeEncounterForm. JSX archivé dans le bloc JSDoc
          ci-dessous : il suffira de le ré-introduire le jour venu.

          @example
          <label htmlFor={toggleId} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-background cursor-pointer">
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
          : hiérarchie de l'info claire + visible en permanence. */}
    </div>
  )
}
