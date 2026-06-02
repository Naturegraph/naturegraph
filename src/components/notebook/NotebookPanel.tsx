/**
 * NotebookPanel, V1.2.0 (NG-005/006)
 *
 * Panneau principal du mode terrain. Permet :
 *   - Demarrer un carnet (si aucun actif) avec titre + lieu optionnel
 *   - Ajouter des especes via recherche TAXREF (taxonomy_nodes)
 *   - Voir + editer la liste regroupee par classe (NotebookSpeciesList)
 *   - Pause (-> draft) ou Terminer (-> finished + dialog publication)
 *   - Abandonner le brouillon
 *
 * Pattern : meme structure visuelle que ContributeEncounterForm (panneau
 * droit fixed sur desktop, fullscreen modal mobile). z-[60] pour passer
 * au-dessus du NotebookBanner (z-45) et de la MobileBottomNav (z-50).
 */

import { useEffect, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Loader2, Pause, Play, Search, Trash2, X } from 'lucide-react'
import { useNotebook } from '@/contexts/NotebookContext'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import { NotebookSpeciesList } from './NotebookSpeciesList'
import { NotebookPublishDialog } from './NotebookPublishDialog'

interface NotebookPanelProps {
  onClose: () => void
}

export function NotebookPanel({ onClose }: NotebookPanelProps) {
  const navigate = useNavigate()
  const {
    activeNotebook,
    isMutating,
    startNotebook,
    pauseNotebook,
    discardNotebook,
    patchNotebook,
    addSpecies,
    removeSpecies,
    setSpeciesCount,
  } = useNotebook()
  // finishNotebook : passe via le PublishDialog (handleFinish ouvre le dialog
  // qui appelle finishNotebook + creation post via createPost). Donc on n a
  // pas besoin de l importer ici directement.

  // Si pas de carnet actif -> ecran de demarrage
  const isStartView = !activeNotebook
  const [startTitle, setStartTitle] = useState('')
  const [startLocation, setStartLocation] = useState('')
  const [titleEditOpen, setTitleEditOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(activeNotebook?.title ?? '')
  const [publishOpen, setPublishOpen] = useState(false)

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleStart() {
    await startNotebook({
      title: startTitle.trim() || null,
      location_name: startLocation.trim() || null,
    })
  }

  async function handlePause() {
    await pauseNotebook()
    onClose()
  }

  async function handleFinish() {
    // Ouvre le dialog publication (Phase 4) plutot que de finir direct
    setPublishOpen(true)
  }

  async function handleDiscard() {
    if (!window.confirm('Supprimer ce carnet et toutes ses observations ? Action irréversible.')) {
      return
    }
    await discardNotebook()
    onClose()
  }

  async function handleSaveTitle() {
    await patchNotebook({ title: titleDraft.trim() || null })
    setTitleEditOpen(false)
  }

  return (
    <>
      {/* Backdrop desktop uniquement */}
      <div
        className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm md:block hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carnet d'observations"
        className="fixed inset-y-0 right-0 z-[60] w-full md:w-[460px] bg-background flex flex-col shadow-2xl"
      >
        {/* Header sticky */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="size-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
            <BookOpen className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-title font-bold text-lg leading-tight truncate">
              {isStartView
                ? 'Nouveau carnet'
                : activeNotebook!.title?.trim() || 'Carnet sans titre'}
            </h2>
            {!isStartView && (
              <p className="text-xs text-muted-foreground">
                {activeNotebook!.species_count} espèce
                {activeNotebook!.species_count > 1 ? 's' : ''} ·{' '}
                {activeNotebook!.observations_count} observation
                {activeNotebook!.observations_count > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="size-9 rounded-full flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {isStartView ? (
            <StartView
              title={startTitle}
              location={startLocation}
              onTitleChange={setStartTitle}
              onLocationChange={setStartLocation}
              onSubmit={handleStart}
              isMutating={isMutating}
            />
          ) : (
            <>
              {/* Edit titre */}
              {titleEditOpen ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="notebook-title-input">
                    Titre du carnet
                  </label>
                  <input
                    id="notebook-title-input"
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="ex : Forêt du Mont-Royal"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setTitleEditOpen(false)
                        setTitleDraft(activeNotebook!.title ?? '')
                      }}
                      className="px-4 h-9 rounded-full border border-border text-sm font-medium hover:bg-muted"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTitle}
                      disabled={isMutating}
                      className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(activeNotebook!.title ?? '')
                    setTitleEditOpen(true)
                  }}
                  className="text-left text-sm text-primary hover:underline"
                >
                  {activeNotebook!.title ? 'Modifier le titre' : 'Ajouter un titre'}
                </button>
              )}

              {/* Recherche + add */}
              <SpeciesSearch
                onAdd={async (hit) => {
                  await addSpecies({
                    taxref_id: hit.taxonomy_node_id,
                    species_name: hit.common_name_fr ?? hit.scientific_name,
                    scientific_name: hit.scientific_name,
                    vernacular_class: hit.class,
                    individuals_count: 1,
                  })
                }}
                isMutating={isMutating}
              />

              {/* Liste especes */}
              <div className="flex flex-col gap-3">
                <h3 className="font-title font-bold text-base">
                  Espèces ({activeNotebook!.species_count})
                </h3>
                <NotebookSpeciesList
                  observations={activeNotebook!.observations}
                  onRemove={(obs) => removeSpecies(obs.taxref_id)}
                  onCountChange={(obs, delta) =>
                    setSpeciesCount(obs.id, Math.max(1, obs.individuals_count + delta))
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isStartView && (
          <footer className="border-t border-border bg-background px-5 py-3 flex items-center gap-2 sticky bottom-0">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isMutating}
              aria-label="Supprimer le carnet"
              className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive shrink-0"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handlePause}
              disabled={isMutating}
              className="flex-1 h-11 rounded-full border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Pause className="size-4" aria-hidden="true" />
              Mettre en pause
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={isMutating || activeNotebook!.species_count === 0}
              className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              Terminer
            </button>
          </footer>
        )}
      </div>

      {publishOpen && activeNotebook && (
        <NotebookPublishDialog
          onClose={() => setPublishOpen(false)}
          onPublished={async (postId) => {
            setPublishOpen(false)
            onClose()
            navigate(`/post/${postId}`)
          }}
        />
      )}
    </>
  )
}

// ─── Vue demarrage (carnet pas encore cree) ──────────────────────────────────

function StartView({
  title,
  location,
  onTitleChange,
  onLocationChange,
  onSubmit,
  isMutating,
}: {
  title: string
  location: string
  onTitleChange: (v: string) => void
  onLocationChange: (v: string) => void
  onSubmit: () => Promise<void>
  isMutating: boolean
}) {
  const titleId = useId()
  const locId = useId()
  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="text-center">
        <div className="mx-auto size-16 rounded-full bg-primary-light flex items-center justify-center mb-3">
          <BookOpen className="size-8 text-primary" aria-hidden="true" />
        </div>
        <h3 className="font-title font-bold text-xl mb-2">Démarre ta sortie nature</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Ajoute les espèces que tu observes au fil de ta sortie. Ton carnet est sauvegardé en
          continu, tu pourras le publier quand tu veux.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={titleId} className="text-sm font-medium">
            Titre <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="ex : Forêt du Mont-Royal"
            className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={locId} className="text-sm font-medium">
            Lieu <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <input
            id={locId}
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="ex : Parc national de la Mauricie"
            className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isMutating}
        className="h-12 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2 mt-2"
      >
        {isMutating ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        Démarrer le carnet
      </button>
    </div>
  )
}

// ─── Barre de recherche espece (version simplifiee de EncounterStep2) ────────

function SpeciesSearch({
  onAdd,
  isMutating,
}: {
  onAdd: (hit: TaxonomyHit) => Promise<void>
  isMutating: boolean
}) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaxonomyHit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 1

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
        const hits = await searchTaxonomy(trimmed, { ranks: ['species'], limit: 12 })
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
  }, [trimmed, hasQuery])

  async function handlePick(hit: TaxonomyHit) {
    await onAdd(hit)
    setQuery('')
    setResults([])
  }

  const showEmpty = useMemo(
    () => hasQuery && !isLoading && results.length === 0,
    [hasQuery, isLoading, results.length],
  )

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="sr-only">
        Rechercher une espèce
      </label>
      <div className="flex items-center gap-2 h-12 px-4 rounded-full border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
        <Search className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une espèce à ajouter…"
          autoComplete="off"
          disabled={isMutating}
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {isLoading && (
          <Loader2
            className="size-4 text-primary motion-safe:animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
      </div>

      {hasQuery && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Résultats de recherche"
          className="rounded-lg border border-border bg-background overflow-hidden divide-y divide-border"
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

      {showEmpty && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun résultat pour « {trimmed} »
        </p>
      )}
    </div>
  )
}
