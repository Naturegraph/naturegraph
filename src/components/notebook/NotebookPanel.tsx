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
  Link2,
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
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import type { CityResult } from '@/types/location'
import { NotebookSpeciesList } from './NotebookSpeciesList'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
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

// 'draft' et 'active' fusionnes visuellement en 'En cours' (Nicolas 2026-06-08).
// La distinction (un seul carnet actif a la fois) reste geree en interne mais
// n'est plus exposee a l'utilisateur : plus simple a comprendre.
const STATUS_LABEL: Record<string, string> = {
  active: 'En cours',
  draft: 'En cours',
  finished: 'Terminé',
  published: 'Publié',
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
    patchNotebook,
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
  // Ville choisie dans l'autocomplete (coords/region/pays) ou null si saisie libre.
  const [startCity, setStartCity] = useState<CityResult | null>(null)
  // Mode de l'etape 1 : 'new' = nouveau carnet (startNotebook) ; 'edit' = etape
  // 1 d'un carnet deja actif (patchNotebook). Nicolas 2026-06-08.
  const [createMode, setCreateMode] = useState<'new' | 'edit'>('new')
  // Action destructive en attente de confirmation (modal DS, comme la
  // suppression d'un post). 'delete' = depuis la liste, 'discard' = Abandonner.
  const [pending, setPending] = useState<
    { kind: 'delete'; nb: Notebook } | { kind: 'discard' } | null
  >(null)

  const reloadList = useCallback(async () => {
    if (!user?.id) {
      setListLoading(false)
      return
    }
    setListLoading(true)
    try {
      const nbs = await listUserNotebooks(user.id, {
        // Carnets de TRAVAIL uniquement (Nicolas 2026-06-09). Les carnets
        // 'published' sont les donnees dediees des posts (independantes) : ils
        // ne sont pas geres ici (sinon liste infinie + risque de supprimer les
        // donnees d'un post). Ils s'editent/suppriment via la publication.
        statuses: ['draft', 'active', 'finished'],
        limit: 50,
      })
      // 'En cours' (draft/active) toujours en premier, puis Termine, puis Publie
      // (Nicolas 2026-06-08). Tri stable -> ordre recent conserve dans chaque
      // groupe.
      const rank = (s: string) => (s === 'active' || s === 'draft' ? 0 : s === 'finished' ? 1 : 2)
      nbs.sort((a, b) => rank(a.status) - rank(b.status))
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
    const wasInProgress = nb.status === 'active' || nb.status === 'draft'
    try {
      await resumeNotebook(nb.id)
      if (wasInProgress) {
        // 'En cours' -> on reprend directement a l'etape 2 (especes), la ou
        // l'utilisateur en etait (Nicolas 2026-06-08).
        setView('edit')
      } else {
        // Carnet 'Termine' re-ouvert -> etape 1 par defaut (revue titre/lieu).
        setStartTitle(nb.title ?? '')
        setStartLocation(nb.location_name ?? '')
        setStartCity(null)
        setCreateMode('edit')
        setView('create')
      }
    } catch (err) {
      console.error('[NotebookPanel] resumeNotebook failed', err)
      toast.error('Impossible d’ouvrir ce carnet', 'Réessaie dans un instant.')
    }
  }

  function handleDeleteNotebook(nb: Notebook) {
    // Ouvre la modal de double confirmation (style DS, comme la suppression
    // d'un post). La suppression effective se fait dans confirmPending().
    setPending({ kind: 'delete', nb })
  }

  // ── Handlers creation ─────────────────────────────────────────────────────

  async function handleStart() {
    // Titre par defaut "Carnet #N" si vide, pour faciliter le suivi (Nicolas).
    const fallbackTitle = `Carnet #${notebooks.length + 1}`
    // Coords/region/pays uniquement si la ville choisie correspond au texte
    // courant (sinon saisie libre -> pas de coordonnees).
    const city = startCity && startCity.name === startLocation.trim() ? startCity : null
    const locationFields = {
      location_name: startLocation.trim() || null,
      latitude: city?.centroidLat ?? null,
      longitude: city?.centroidLng ?? null,
      city: city?.name ?? null,
      region: city?.regionName ?? null,
      country: city?.country ?? null,
    }
    try {
      if (createMode === 'edit' && activeNotebook) {
        // Etape 1 d'un carnet deja actif -> mise a jour (pas de nouveau carnet).
        await patchNotebook({
          title: startTitle.trim() || activeNotebook.title || fallbackTitle,
          ...locationFields,
        })
      } else {
        await startNotebook({
          title: startTitle.trim() || fallbackTitle,
          ...locationFields,
        })
      }
      setView('edit')
    } catch (err) {
      // Ne JAMAIS echouer en silence (ex: tables carnet absentes sur la base
      // ciblee). Toast explicite + log pour diagnostic.
      console.error('[NotebookPanel] startNotebook failed', err)
      toast.error('Impossible de continuer le carnet à ce stade', 'Réessaie dans un instant.')
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

  function handleDiscard() {
    setPending({ kind: 'discard' })
  }

  // Confirme l'action destructive en attente (modal DS).
  async function confirmPending() {
    const action = pending
    if (!action) return
    try {
      if (action.kind === 'delete') {
        await deleteNotebook(action.nb.id)
        await reloadList()
      } else {
        await discardNotebook()
        await reloadList()
        setView('manage')
      }
    } catch (err) {
      console.error('[NotebookPanel] suppression carnet échouée', err)
      toast.error('Suppression impossible', 'Réessaie dans un instant.')
    } finally {
      setPending(null)
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
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:block hidden"
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

          {/* Barre de progression : uniquement dans le wizard */}
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
              onCityPick={setStartCity}
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
                setStartCity(null)
                setCreateMode('new')
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
              <div className="flex items-center gap-3">
                {/* Retour a l'etape 1 (titre/localisation du carnet actif),
                    Nicolas 2026-06-08. Le carnet reste sauvegarde (auto-save). */}
                <button
                  type="button"
                  onClick={() => {
                    setStartTitle(activeNotebook?.title ?? '')
                    setStartLocation(activeNotebook?.location_name ?? '')
                    setStartCity(null)
                    setCreateMode('edit')
                    setView('create')
                  }}
                  aria-label="Retour à l'étape précédente"
                  className="size-11 shrink-0 rounded-full btn-press btn-press-secondary bg-transparent flex items-center justify-center text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
                {/* Abandonner = supprime le carnet (corbeille neutre) */}
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isMutating}
                  aria-label="Abandonner le carnet"
                  className="size-11 shrink-0 rounded-full btn-press btn-press-secondary bg-transparent flex items-center justify-center text-[var(--color-text-primary)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
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
                    Sauvegarder
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

      {/* Double confirmation de suppression (style DS, comme la suppression
          d'un post). Couvre la suppression depuis la liste + l'abandon. */}
      {pending && (
        <ConfirmModal
          variant="danger"
          title="Supprimer définitivement ce carnet ?"
          description={
            pending.kind === 'delete' && (pending.nb.status === 'published' || !!pending.nb.post_id)
              ? "Cette action est définitive. Elle n'aura aucun impact sur la publication associée à ce carnet : elle conserve ses propres données."
              : 'Cette action est définitive : le carnet et toutes ses observations seront supprimés.'
          }
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          onCancel={() => setPending(null)}
          onConfirm={confirmPending}
        />
      )}
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
        {notebooks.map((nb) => {
          // Carnet rattache a une Rencontre publiee : ses observations SONT le
          // contenu multi-especes du post (la carte feed les lit via
          // notebook_id). Le supprimer detruirait donc les especes du post
          // (Nicolas 2026-06-09). -> lecture seule + PAS de suppression ici :
          // pour le retirer, l'utilisateur supprime la publication elle-meme.
          const linked = nb.status === 'published' || !!nb.post_id
          const statusStyle = linked
            ? 'bg-[#e5f7f7] text-[#006666]'
            : 'bg-[#e7e9f7] text-[var(--color-text-secondary)]'
          return (
            <li key={nb.id}>
              <div className="flex items-center gap-2 p-3 rounded-md border-[0.5px] border-border bg-background">
                {/* Zone cliquable : continuer/consulter (desactivee si publie) */}
                <button
                  type="button"
                  onClick={() => onContinue(nb)}
                  disabled={isMutating || linked}
                  className="flex-1 min-w-0 text-left flex items-center gap-3 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {nb.title?.trim() || 'Carnet sans titre'}
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full ${statusStyle} text-[11px] font-medium leading-none`}
                      >
                        {STATUS_LABEL[nb.status] ?? nb.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {nb.species_count} espèce{nb.species_count > 1 ? 's' : ''}
                      {nb.location_name ? ` · ${nb.location_name}` : ''}
                      {linked ? ' · Lié à une Rencontre' : ''}
                    </p>
                  </div>
                  {/* Lié = icône lien (lecture seule) ; sinon crayon (éditer) */}
                  {linked ? (
                    <Link2
                      className="size-5 text-[#006666] shrink-0"
                      aria-label="Lié à une Rencontre publiée"
                    />
                  ) : (
                    <SquarePen
                      className="size-5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {/* Supprimer : UNIQUEMENT pour les carnets non publies (un carnet
                    publie = donnees du post, non supprimable ici, Nicolas
                    2026-06-09). */}
                {!linked && (
                  <button
                    type="button"
                    onClick={() => onDelete(nb)}
                    disabled={isMutating}
                    aria-label={`Supprimer ${nb.title?.trim() || 'ce carnet'}`}
                    className="size-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          )
        })}
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
  onCityPick,
}: {
  title: string
  location: string
  locationPublic: boolean
  onTitleChange: (v: string) => void
  onLocationChange: (v: string) => void
  onLocationPublicChange: (v: boolean) => void
  /** Ville choisie dans l'autocomplete (coords/region/pays) ou null si saisie libre */
  onCityPick: (city: CityResult | null) => void
}) {
  const titleId = useId()
  const locId = useId()
  const switchId = useId()

  // Autocomplete ville FR + QC, identique a Rencontre nature (API Adresse +
  // fallback RPC search_cities). Nicolas 2026-06-08.
  const { suggestions, isLoading: locLoading } = useLocationAutocomplete(location)
  const [showSuggestions, setShowSuggestions] = useState(false)

  function handlePickCity(city: CityResult) {
    onLocationChange(city.name)
    onCityPick(city)
    setShowSuggestions(false)
  }

  const suggestionsVisible =
    showSuggestions && location.trim().length >= 2 && suggestions.length > 0

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
          // Cap aligne sur la colonne DB notebooks.title varchar(120) : empeche
          // de heurter une erreur SQL « value too long » (retour testeur).
          maxLength={120}
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
            autoComplete="off"
            onChange={(e) => {
              onLocationChange(e.target.value)
              // Saisie libre : on invalide la ville choisie (coords obsoletes).
              onCityPick(null)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Laisse le temps au clic sur une suggestion (mousedown) de passer.
              window.setTimeout(() => setShowSuggestions(false), 120)
            }}
            // Cap aligne sur la colonne DB notebooks.location_name varchar(255).
            maxLength={255}
            className="w-full pl-11 pr-10 h-12 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
          />
          {locLoading && location.trim().length >= 2 && (
            <Loader2
              className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-primary motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}

          {/* Suggestions de villes (FR + QC), comme Rencontre nature */}
          {suggestionsVisible && (
            <ul
              role="listbox"
              aria-label="Suggestions de localisation"
              className="absolute z-30 left-0 right-0 top-full mt-1 rounded-md border border-border bg-background shadow-xl overflow-hidden divide-y divide-border max-h-60 overflow-y-auto"
            >
              {suggestions.map((city) => (
                <li key={`${city.name}-${city.regionName}-${city.centroidLat}-${city.centroidLng}`}>
                  <button
                    type="button"
                    // mousedown (avant blur) pour ne pas fermer la liste avant le clic
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePickCity(city)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-foreground">{city.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {[city.regionName, city.country !== 'France' ? city.country : null]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
  // Filtre par groupe (entonnoir) : meme principe que Rencontre nature.
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

        {/* Popover filtre : chips de groupe (single-select) */}
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
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-light text-[var(--color-link)] text-sm font-body font-medium leading-none">
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
