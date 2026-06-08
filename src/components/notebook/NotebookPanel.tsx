/**
 * NotebookPanel, V1.2.0 (NG-005/006)
 *
 * Panneau "Carnet d'observations". 3 vues enchainees :
 *   - 'manage' : vue de GESTION (liste des carnets enregistres : consulter /
 *     continuer / supprimer) + bouton "Creer un nouveau carnet". C'est l'ecran
 *     d'entree (Nicolas 2026-06-08).
 *   - 'create' : titre + localisation -> bouton "Continuer" (cree le carnet).
 *   - 'edit'   : "Qu'as-tu observe ?" (recherche + filtre + liste especes) ->
 *     "Abandonner" / "Terminer". "Terminer" ENREGISTRE le carnet (jamais de
 *     publication) : il pourra etre rattache plus tard a une Rencontre nature.
 *
 * Habillage strictement aligne sur les panneaux Rencontre/Instant
 * (ContributeEncounterForm) pour la coherence produit.
 */

import { useCallback, useEffect, useId, useState } from 'react'
import {
  ArrowLeft,
  Funnel,
  Info,
  Loader2,
  MapPin,
  Play,
  Save,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react'
import { useNotebook } from '@/contexts/NotebookContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import { listUserNotebooks, deleteNotebook, type Notebook } from '@/services/notebookService'
import { NotebookSpeciesList } from './NotebookSpeciesList'
import { Button } from '@/components/ui/Button'
import hermineImg from '@/assets/images/hermine-empty-state.png'

const TOTAL_STEPS = 2

// Groupes filtrables dans la recherche (aligne sur Rencontre nature). Le filtre
// envoie la classe iNat correspondante a searchTaxonomy (p_class_filter).
const SEARCH_GROUP_FILTERS: { key: string; label: string; class: string }[] = [
  { key: 'birds', label: 'Oiseaux', class: 'Aves' },
  { key: 'mammals', label: 'Mammifères', class: 'Mammalia' },
  { key: 'insects', label: 'Insectes', class: 'Insecta' },
  { key: 'amphibians', label: 'Amphibiens', class: 'Amphibia' },
  { key: 'reptiles', label: 'Reptiles', class: 'Reptilia' },
  { key: 'arachnids', label: 'Arachnides', class: 'Arachnida' },
  { key: 'mollusks', label: 'Mollusques', class: 'Mollusca' },
  { key: 'fish', label: 'Poissons', class: 'Actinopterygii' },
]

const STATUS_LABEL: Record<string, string> = {
  active: 'En cours',
  draft: 'Brouillon',
  finished: 'Terminé',
}

interface NotebookPanelProps {
  onClose: () => void
}

type View = 'manage' | 'create' | 'edit'

export function NotebookPanel({ onClose }: NotebookPanelProps) {
  const { user } = useAuth()
  const toast = useToast()
  const {
    activeNotebook,
    isMutating,
    startNotebook,
    resumeNotebook,
    finishNotebook,
    discardNotebook,
    addSpecies,
    removeSpecies,
    setSpeciesCount,
  } = useNotebook()

  // Vue courante. On entre TOUJOURS par la gestion (Nicolas 2026-06-08).
  const [view, setView] = useState<View>('manage')

  // Liste des carnets enregistres (gestion).
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [listLoading, setListLoading] = useState(true)

  // Etat formulaire de creation (vue 'create').
  const [startTitle, setStartTitle] = useState('')
  const [startLocation, setStartLocation] = useState('')
  const [locationPublic, setLocationPublic] = useState(true)

  const reloadList = useCallback(async () => {
    if (!user?.id) {
      setListLoading(false)
      return
    }
    setListLoading(true)
    try {
      const nbs = await listUserNotebooks(user.id, {
        statuses: ['draft', 'active', 'finished'],
        limit: 50,
      })
      setNotebooks(nbs)
    } catch {
      setNotebooks([])
    } finally {
      setListLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void reloadList()
  }, [reloadList])

  // Fermer sur Escape + bloquer le scroll body (coherence Encounter).
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // ── Handlers gestion ──────────────────────────────────────────────────────

  async function handleContinue(nb: Notebook) {
    try {
      await resumeNotebook(nb.id)
      setView('edit')
    } catch (err) {
      console.error('[NotebookPanel] resumeNotebook failed', err)
      toast.error('Impossible d’ouvrir ce carnet', 'Réessaie dans un instant.')
    }
  }

  async function handleDeleteNotebook(nb: Notebook) {
    if (!window.confirm('Supprimer ce carnet et toutes ses observations ? Action irréversible.')) {
      return
    }
    try {
      await deleteNotebook(nb.id)
      await reloadList()
    } catch (err) {
      console.error('[NotebookPanel] deleteNotebook failed', err)
      toast.error('Suppression impossible', 'Réessaie dans un instant.')
    }
  }

  // ── Handlers creation ─────────────────────────────────────────────────────

  async function handleStart() {
    // Titre par defaut "Carnet #N" si vide, pour faciliter le suivi (Nicolas).
    const fallbackTitle = `Carnet #${notebooks.length + 1}`
    try {
      await startNotebook({
        title: startTitle.trim() || fallbackTitle,
        location_name: startLocation.trim() || null,
      })
      setView('edit')
    } catch (err) {
      // Ne JAMAIS echouer en silence (ex: tables carnet absentes sur la base
      // ciblee). Toast explicite + log pour diagnostic.
      console.error('[NotebookPanel] startNotebook failed', err)
      toast.error('Impossible de démarrer le carnet', 'Réessaie dans un instant.')
    }
  }

  // ── Handlers edition ──────────────────────────────────────────────────────

  async function handleFinish() {
    // "Terminer" ENREGISTRE le carnet (status=finished), ne publie jamais.
    try {
      const saved = await finishNotebook()
      toast.success(
        'Carnet enregistré',
        `Ton carnet « ${saved.title?.trim() || 'sans titre'} » est sauvegardé. Tu pourras l'ajouter à une prochaine Rencontre nature ou le modifier quand tu veux.`,
      )
      onClose()
    } catch (err) {
      console.error('[NotebookPanel] finishNotebook failed', err)
      toast.error('Enregistrement impossible', 'Réessaie dans un instant.')
    }
  }

  async function handleDiscard() {
    if (!window.confirm('Supprimer ce carnet et toutes ses observations ? Action irréversible.')) {
      return
    }
    try {
      await discardNotebook()
      await reloadList()
      setView('manage')
    } catch (err) {
      console.error('[NotebookPanel] discardNotebook failed', err)
      toast.error('Suppression impossible', 'Réessaie dans un instant.')
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  // L'indicateur d'etape ne s'affiche que dans le wizard create/edit.
  const showSteps = view === 'create' || view === 'edit'
  const step = view === 'create' ? 1 : 2
  const headerTitle =
    view === 'manage'
      ? 'Tes carnets d’observations'
      : view === 'create'
        ? 'Démarre ta sortie nature'
        : "Qu'as-tu observé ?"

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:block hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carnet d'observations"
        className="fixed inset-y-0 right-0 z-[60] w-full md:w-[440px] bg-background flex flex-col shadow-2xl"
      >
        {/* ── Header sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-[#20203d] text-[#f0f0f5] text-sm leading-none">
              <span className="font-body">Carnet d&apos;observations</span>
            </span>

            <div className="flex items-center gap-4">
              {showSteps && (
                <span
                  className="font-body text-base text-foreground whitespace-nowrap"
                  aria-live="polite"
                >
                  Étape {step}/{TOTAL_STEPS}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="size-8 shrink-0 rounded-full bg-[#f0f0f5] hover:bg-[#e5e5ea] flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Barre de progression — uniquement dans le wizard */}
          {showSteps && (
            <div
              className="flex gap-1"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}
            >
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={[
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    step >= i ? 'bg-[#20203d]' : 'bg-border',
                  ].join(' ')}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          {/* mb-2 (8px) : espacement titre/sous-titre conforme Figma carnet
              (avant mb-4/16px, juge trop grand par Nicolas 2026-06-08). */}
          <h2 className="font-title font-bold text-lg text-foreground mb-2">{headerTitle}</h2>

          {view === 'manage' && (
            <ManageView
              notebooks={notebooks}
              loading={listLoading}
              isMutating={isMutating}
              onContinue={handleContinue}
              onDelete={handleDeleteNotebook}
            />
          )}

          {view === 'create' && (
            <StartView
              title={startTitle}
              location={startLocation}
              locationPublic={locationPublic}
              onTitleChange={setStartTitle}
              onLocationChange={setStartLocation}
              onLocationPublicChange={setLocationPublic}
            />
          )}

          {view === 'edit' && activeNotebook && (
            <div className="flex flex-col gap-4">
              <SpeciesSearch
                hasSpecies={activeNotebook.species_count > 0}
                isMutating={isMutating}
                onAdd={async (hit) => {
                  await addSpecies({
                    taxref_id: hit.taxonomy_node_id,
                    species_name: hit.common_name_fr ?? hit.scientific_name,
                    scientific_name: hit.scientific_name,
                    vernacular_class: hit.class,
                    individuals_count: 1,
                  })
                }}
              />

              {activeNotebook.species_count > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-body text-base text-foreground">
                    Carnet d&apos;observations ({activeNotebook.species_count})
                  </h3>
                  <NotebookSpeciesList
                    observations={activeNotebook.observations}
                    onRemove={(obs) => removeSpecies(obs.taxref_id)}
                    onCountChange={(obs, delta) =>
                      setSpeciesCount(obs.id, Math.max(1, obs.individuals_count + delta))
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-4 flex flex-col gap-2">
          {view === 'manage' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                setStartTitle('')
                setStartLocation('')
                setLocationPublic(true)
                setView('create')
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Play className="size-4" aria-hidden="true" />
                Démarrer un nouveau carnet
              </span>
            </Button>
          )}

          {view === 'create' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('manage')}
                aria-label="Retour à mes carnets"
                className="size-11 shrink-0 rounded-full btn-press btn-press-secondary bg-transparent flex items-center justify-center text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={isMutating}
                aria-busy={isMutating}
                onClick={handleStart}
              >
                <span className="inline-flex items-center gap-2">
                  {isMutating && (
                    <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  )}
                  Continuer
                </span>
              </Button>
            </div>
          )}

          {view === 'edit' && (
            <>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  disabled={isMutating}
                  onClick={handleDiscard}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Abandonner
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={isMutating || !activeNotebook || activeNotebook.species_count === 0}
                  onClick={handleFinish}
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="size-4" aria-hidden="true" />
                    Terminer
                  </span>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Données espèces : iNaturalist (CC-BY) + GBIF + Wikidata
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Vue GESTION : liste des carnets enregistres ─────────────────────────────

function ManageView({
  notebooks,
  loading,
  isMutating,
  onContinue,
  onDelete,
}: {
  notebooks: Notebook[]
  loading: boolean
  isMutating: boolean
  onContinue: (nb: Notebook) => void
  onDelete: (nb: Notebook) => void
}) {
  // Sous-titre commun (explique la nature de la liste).
  const subtitle = (
    <p className="text-sm text-[var(--color-text-secondary)] leading-normal mb-4">
      Retrouve tes sorties enregistrées : reprends-en une pour la compléter, ou démarre un nouveau
      carnet. Tu pourras les rattacher à une Rencontre nature quand tu veux.
    </p>
  )

  if (loading) {
    return (
      <>
        {subtitle}
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        </div>
      </>
    )
  }

  if (notebooks.length === 0) {
    return (
      <>
        {subtitle}
        <div className="rounded-md border-[0.5px] border-border bg-background flex flex-col items-center overflow-hidden">
          <img src={hermineImg} alt="" width={230} height={128} className="mt-6" loading="lazy" />
          <div className="flex flex-col items-center gap-3 p-6 w-full text-center">
            <p className="font-title font-bold text-lg text-foreground">
              Aucun carnet pour le moment
            </p>
            <p className="text-sm text-muted-foreground">
              Crée ton premier carnet pour noter les espèces observées au fil de tes sorties.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {subtitle}
      <ul className="flex flex-col gap-3">
        {notebooks.map((nb) => (
          <li key={nb.id}>
            <div className="flex items-center gap-2 p-3 rounded-md border-[0.5px] border-border bg-background">
              {/* Zone cliquable : continuer / consulter le carnet */}
              <button
                type="button"
                onClick={() => onContinue(nb)}
                disabled={isMutating}
                className="flex-1 min-w-0 text-left flex items-center gap-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">
                      {nb.title?.trim() || 'Carnet sans titre'}
                    </span>
                    <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-full bg-[#e7e9f7] text-[var(--color-text-secondary)] text-[11px] font-medium leading-none">
                      {STATUS_LABEL[nb.status] ?? nb.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {nb.species_count} espèce{nb.species_count > 1 ? 's' : ''}
                    {nb.location_name ? ` · ${nb.location_name}` : ''}
                  </p>
                </div>
                {/* Icône édition : ouvrir / continuer le carnet */}
                <SquarePen className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
              </button>

              {/* Supprimer — neutre */}
              <button
                type="button"
                onClick={() => onDelete(nb)}
                disabled={isMutating}
                aria-label={`Supprimer ${nb.title?.trim() || 'ce carnet'}`}
                className="size-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ─── Vue CREATION : titre + localisation ─────────────────────────────────────

function StartView({
  title,
  location,
  locationPublic,
  onTitleChange,
  onLocationChange,
  onLocationPublicChange,
}: {
  title: string
  location: string
  locationPublic: boolean
  onTitleChange: (v: string) => void
  onLocationChange: (v: string) => void
  onLocationPublicChange: (v: boolean) => void
}) {
  const titleId = useId()
  const locId = useId()
  const switchId = useId()

  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-[var(--color-text-secondary)] leading-normal">
        Ajoute les espèces que tu observes au fil de ta sortie. Ton carnet est sauvegardé en
        continu, tu pourras le publier quand tu veux.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-sm text-[var(--color-text-secondary)]">
          Titre de ta sortie
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full h-12 px-5 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
          Localisation
          <Info className="size-4 text-primary" aria-hidden="true" />
        </span>

        <div className="relative">
          <MapPin
            className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={locId}
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full pl-11 pr-4 h-12 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
          />
        </div>

        <label
          htmlFor={switchId}
          className="flex items-center justify-between gap-3 cursor-pointer pt-2"
        >
          <span className="text-xs text-[var(--color-text-secondary)] tracking-wide">
            Activer pour rendre la localisation publique
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              id={switchId}
              type="checkbox"
              role="switch"
              checked={locationPublic}
              onChange={(e) => onLocationPublicChange(e.target.checked)}
              className="sr-only peer"
            />
            <span
              aria-hidden="true"
              className={[
                'w-10 h-5 rounded-full transition-colors',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1',
                locationPublic ? 'bg-primary' : 'bg-border',
              ].join(' ')}
            />
            <span
              aria-hidden="true"
              className={[
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
                locationPublic ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </span>
        </label>
      </div>
    </div>
  )
}

// ─── Recherche + ajout d'espece (vue edition) ────────────────────────────────

function SpeciesSearch({
  hasSpecies,
  onAdd,
  isMutating,
}: {
  hasSpecies: boolean
  onAdd: (hit: TaxonomyHit) => Promise<void>
  isMutating: boolean
}) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaxonomyHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Filtre par groupe (entonnoir) — meme principe que Rencontre nature.
  const [groupKey, setGroupKey] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 1
  const classFilter = groupKey
    ? (SEARCH_GROUP_FILTERS.find((g) => g.key === groupKey)?.class ?? null)
    : null

  useEffect(() => {
    if (!hasQuery) {
      setResults([])
      setIsLoading(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      setIsLoading(true)
      try {
        const hits = await searchTaxonomy(trimmed, {
          ranks: ['species'],
          classFilter: classFilter ?? undefined,
          limit: 12,
        })
        if (cancelled) return
        setResults(hits)
      } catch {
        if (cancelled) return
        setResults([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, hasQuery, classFilter])

  async function handlePick(hit: TaxonomyHit) {
    await onAdd(hit)
    setQuery('')
    setResults([])
  }

  const showResults = hasQuery && results.length > 0
  const showInlineEmpty = hasQuery && !isLoading && results.length === 0
  const showHermine = !hasQuery && !hasSpecies

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="sr-only">
        Rechercher une espèce
      </label>
      <div className="relative flex items-center gap-4">
        <div className="flex flex-1 min-w-0 items-center gap-2 h-12 px-5 rounded-full border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
          <Search className="size-6 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom de l'espèce…"
            autoComplete="off"
            disabled={isMutating}
            className="flex-1 min-w-0 bg-transparent text-base text-foreground placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none"
          />
          {isLoading && (
            <Loader2
              className="size-4 text-primary motion-safe:animate-spin shrink-0"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Bouton filtre par groupe (fonctionnel, comme Rencontre nature) */}
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-label="Filtrer par groupe"
          aria-expanded={filterOpen}
          className={[
            'relative size-12 shrink-0 rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            groupKey
              ? 'border-primary text-primary bg-primary-light/40'
              : 'border-border text-foreground bg-background hover:bg-muted/50',
          ].join(' ')}
        >
          <Funnel className="size-6" aria-hidden="true" />
          {groupKey && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 size-3 rounded-full bg-primary border border-background"
            />
          )}
        </button>

        {/* Popover filtre — chips de groupe (single-select) */}
        {filterOpen && (
          <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-md border-[0.5px] border-border bg-background p-3 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Filtrer par groupe</span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Fermer"
                className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEARCH_GROUP_FILTERS.map((g) => {
                const active = groupKey === g.key
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGroupKey(active ? null : g.key)}
                    className={[
                      'h-8 px-3 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[#e7e9f7] text-foreground hover:opacity-80',
                    ].join(' ')}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
            {groupKey && (
              <button
                type="button"
                onClick={() => setGroupKey(null)}
                className="self-start text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none"
              >
                Réinitialiser le filtre
              </button>
            )}
          </div>
        )}
      </div>

      {showResults && (
        <ul
          role="listbox"
          aria-label="Résultats de recherche"
          className="rounded-md border border-border bg-background overflow-hidden divide-y divide-border"
        >
          {results.map((hit) => (
            <li key={hit.taxonomy_node_id}>
              <button
                type="button"
                onClick={() => handlePick(hit)}
                disabled={isMutating}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/50 disabled:opacity-50 focus-visible:outline-none focus-visible:bg-muted/50"
              >
                <p className="text-sm font-medium text-foreground">
                  {hit.common_name_fr ?? hit.scientific_name}
                </p>
                {hit.common_name_fr && (
                  <p className="text-xs text-muted-foreground italic">{hit.scientific_name}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showInlineEmpty && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun résultat pour « {trimmed} »
        </p>
      )}

      {showHermine && (
        <div className="rounded-md border-[0.5px] border-border bg-background flex flex-col items-center overflow-hidden">
          <img src={hermineImg} alt="" width={230} height={128} className="mt-6" loading="lazy" />
          <div className="flex flex-col items-center gap-3 p-6 w-full">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-light text-[var(--color-action-default)] text-sm font-body font-medium leading-none">
              Aucun résultat
            </span>
            <p className="font-title font-bold text-lg text-foreground text-center">
              Tape quelques lettres pour voir les suggestions !
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
