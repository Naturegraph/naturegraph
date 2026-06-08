/**
 * NotebookPanel, V1.2.0 (NG-005/006)
 *
 * Panneau "Carnet d'observations" (mode terrain). Reprend EXACTEMENT le shell
 * visuel des panneaux Rencontre/Instant (ContributeEncounterForm) pour la
 * coherence produit :
 *   - panneau droit fixe (desktop) / plein ecran (mobile), z-[60]
 *   - header : pill teal "Carnet d'observations" + "Etape X/2" + close rond
 *     #f0f0f5 + barre de progression a 2 segments
 *   - contenu scrollable avec titre d'etape (h2)
 *   - footer sticky avec CTA principal (effet btn-press via Button DS)
 *
 * Wizard 2 etapes (conforme Figma 6768-11833 / 6768-12287) :
 *   - Etape 1 "Demarre ta sortie nature" : titre + localisation (+ switch
 *     public) -> bouton "Demarrer le carnet" (cree le carnet).
 *   - Etape 2 "Qu'as-tu observe ?" : recherche espece + liste regroupee par
 *     classe (NotebookSpeciesList) -> "En pause" (draft) ou "Terminer"
 *     (-> dialog publication).
 *
 * Le carnet etant un objet persiste en continu, l'etape courante est DERIVEE
 * de l'existence d'un carnet actif (pas un simple compteur local) : pas de
 * carnet -> etape 1 ; carnet actif -> etape 2 (reprise naturelle apres pause).
 */

import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Funnel, Info, Loader2, MapPin, Pause, Play, Search, Trash2, X } from 'lucide-react'
import { useNotebook } from '@/contexts/NotebookContext'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import { NotebookSpeciesList } from './NotebookSpeciesList'
import { NotebookPublishDialog } from './NotebookPublishDialog'
import { Button } from '@/components/ui/Button'
import hermineImg from '@/assets/images/hermine-empty-state.png'

const TOTAL_STEPS = 2

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
    addSpecies,
    removeSpecies,
    setSpeciesCount,
  } = useNotebook()

  // Etape DERIVEE : pas de carnet -> 1 (demarrage) ; carnet actif -> 2 (especes).
  const isStartView = !activeNotebook
  const step = isStartView ? 1 : 2

  // Etat etape 1 (formulaire de demarrage).
  const [startTitle, setStartTitle] = useState('')
  const [startLocation, setStartLocation] = useState('')
  // Switch "rendre la localisation publique" (ON = publique). Le carnet ne
  // stocke pas encore ce flag ; il sera applique a la publication (dialog).
  const [locationPublic, setLocationPublic] = useState(true)

  const [publishOpen, setPublishOpen] = useState(false)

  // Fermer sur Escape (coherence avec ContributeEncounterForm).
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloque le scroll du body tant que le panneau est ouvert.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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

  function handleFinish() {
    // Ouvre le dialog publication (Phase 4) plutot que de finir directement.
    setPublishOpen(true)
  }

  async function handleDiscard() {
    if (!window.confirm('Supprimer ce carnet et toutes ses observations ? Action irréversible.')) {
      return
    }
    await discardNotebook()
    onClose()
  }

  const stepTitle = isStartView ? 'Démarre ta sortie nature' : "Qu'as-tu observé ?"

  return (
    <>
      {/* Backdrop desktop — clic ferme le panneau (identique Encounter). */}
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
        {/* ── Header sticky (shell partage Rencontre/Instant) ─────────────── */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {/* Badge type — pill bleu nuit (couleur d'identite du Carnet,
                #20203D = Content/Neutral/Secondary ; cf carte ContributeModal). */}
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-[#20203d] text-[#f0f0f5] text-sm leading-none">
              <span className="font-body">Carnet d&apos;observations</span>
            </span>

            <div className="flex items-center gap-4">
              <span
                className="font-body text-base text-foreground whitespace-nowrap"
                aria-live="polite"
              >
                Étape {step}/{TOTAL_STEPS}
              </span>
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

          {/* Barre de progression — 2 segments h-1.5 rounded-full */}
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
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          <h2 className="font-title font-bold text-lg text-foreground mb-4">{stepTitle}</h2>

          {isStartView ? (
            <StartView
              title={startTitle}
              location={startLocation}
              locationPublic={locationPublic}
              onTitleChange={setStartTitle}
              onLocationChange={setStartLocation}
              onLocationPublicChange={setLocationPublic}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <SpeciesSearch
                hasSpecies={activeNotebook!.species_count > 0}
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

              {activeNotebook!.species_count > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-body text-base text-foreground">
                    Carnet d&apos;observations ({activeNotebook!.species_count})
                  </h3>
                  <NotebookSpeciesList
                    observations={activeNotebook!.observations}
                    onRemove={(obs) => removeSpecies(obs.taxref_id)}
                    onCountChange={(obs, delta) =>
                      setSpeciesCount(obs.id, Math.max(1, obs.individuals_count + delta))
                    }
                  />

                  {/* Abandonner — discret (le footer Figma ne garde que
                      En pause / Terminer). Reste accessible pour ne pas perdre
                      la fonction de suppression du brouillon. */}
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isMutating}
                    className="self-center inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--color-error)] disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Abandonner ce carnet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-4 flex flex-col gap-2">
          {isStartView ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              disabled={isMutating}
              aria-busy={isMutating}
              onClick={handleStart}
            >
              <span className="inline-flex items-center gap-2">
                {isMutating ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="size-4" aria-hidden="true" />
                )}
                Démarrer le carnet
              </span>
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {/* En pause — variante secondaire (sauvegarde en draft) */}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  disabled={isMutating}
                  onClick={handlePause}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pause className="size-4" aria-hidden="true" />
                    En pause
                  </span>
                </Button>
                {/* Terminer — CTA principal (ouvre le dialog de publication) */}
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={isMutating || activeNotebook!.species_count === 0}
                  onClick={handleFinish}
                >
                  Terminer
                </Button>
              </div>
              {/* Attribution sources donnees especes (coherence EncounterStep2) */}
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Données espèces : iNaturalist (CC-BY) + GBIF + Wikidata
              </p>
            </>
          )}
        </div>
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

// ─── Etape 1 : demarrage du carnet ───────────────────────────────────────────

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
      {/* Description — Paragraph/Base 16px, Content/Neutral/Secondary #20203D */}
      <p className="text-base text-[var(--color-text-secondary)] leading-normal">
        Ajoute les espèces que tu observes au fil de ta sortie. Ton carnet est sauvegardé en
        continu, tu pourras le publier quand tu veux.
      </p>

      {/* Titre de la sortie — input pill 48px, Stroke/Light #C4C4CC */}
      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-sm text-[var(--color-text-secondary)]">
          Titre de ta sortie
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="ex : Sortie matinale en forêt"
          className="w-full h-12 px-5 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
        />
      </div>

      {/* Localisation + switch public (markup identique a EncounterStep3) */}
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
            placeholder="ex : Forêt de Brocéliande, Bretagne"
            className="w-full pl-11 pr-4 h-12 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
          />
        </div>

        {/* Switch : label avant, toggle apres — ON = publique (Caption 12px) */}
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
            {/* Switch 40x20 (Figma) — track + pastille 16px, ON = #5F5DD8 */}
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

// ─── Etape 2 : recherche + ajout d'espece ────────────────────────────────────

function SpeciesSearch({
  hasSpecies,
  onAdd,
  isMutating,
}: {
  /** true si le carnet contient deja des especes (masque l'empty-state hermine). */
  hasSpecies: boolean
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

  const showResults = hasQuery && results.length > 0
  const showInlineEmpty = hasQuery && !isLoading && results.length === 0
  // Empty-state hermine : seulement si rien n'est tape ET aucune espece encore
  // ajoutee (sinon la liste du carnet prend le relais visuel).
  const showHermine = !hasQuery && !hasSpecies

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="sr-only">
        Rechercher une espèce
      </label>
      {/* Recherche + filtre (Figma Frame 4505) : input pill + bouton entonnoir 48px */}
      <div className="flex items-center gap-4">
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
        {/* Bouton filtre — 48px, bordure 1px #C4C4CC, rounded-full (Figma).
            Filtre par groupe a cabler ultérieurement. */}
        <button
          type="button"
          aria-label="Filtrer par groupe"
          title="Filtrer par groupe (à venir)"
          className="size-12 shrink-0 rounded-full border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Funnel className="size-6" aria-hidden="true" />
        </button>
      </div>

      {/* Resultats de recherche (clic -> ajout au carnet) */}
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

      {/* Aucun resultat pour la recherche en cours */}
      {showInlineEmpty && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun résultat pour « {trimmed} »
        </p>
      )}

      {/* Empty-state hermine (carnet vide, pas de recherche) — identique a
          EncounterStep2 pour la coherence visuelle. */}
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
