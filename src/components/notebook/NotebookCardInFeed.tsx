/**
 * NotebookCardInFeed, V1.2.0 (NG-005)
 *
 * Affichage carnet d observations dans une carte feed (post publie avec
 * notebook_id non null). Fetch les observations a la volee + affiche la
 * liste categorisee par classe taxonomique, avec bouton reduire/etendre.
 *
 * Place dans FeedPost entre la rangee meteo et la galerie photos, en
 * remplacement des chips espece/categorie classiques.
 */

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { listNotebookObservations, type NotebookObservation } from '@/services/notebookService'
import { NotebookSpeciesList } from './NotebookSpeciesList'

interface NotebookCardInFeedProps {
  notebookId: string
  /** Compteur d especes pre-charge (depuis notebooks.species_count) pour eviter
   *  un fetch supplementaire avant l ouverture du bloc. Sinon affiche "?". */
  speciesCount?: number
  /** Par defaut REPLIE (Nicolas 2026-06-08 : ne pas derouler 80 especes
   *  d'office, l'user choisit de deplier le carnet du post). */
  defaultOpen?: boolean
}

export function NotebookCardInFeed({
  notebookId,
  speciesCount,
  defaultOpen = false,
}: NotebookCardInFeedProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [observations, setObservations] = useState<NotebookObservation[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || observations) return
    let cancelled = false
    // setState async-wrapped pour eviter cascading renders (regle eslint
    // react-hooks/set-state-in-effect). Pas de micro-flash UX visible : le
    // chevron d ouverture rend instantanement, le loader apparait au tick
    // suivant si le fetch n est pas encore retourne.
    queueMicrotask(() => {
      if (cancelled) return
      setIsLoading(true)
      setError(null)
      listNotebookObservations(notebookId)
        .then((data) => {
          if (cancelled) return
          setObservations(data)
        })
        .catch((e) => {
          if (cancelled) return
          setError(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [notebookId, open, observations])

  const count = speciesCount ?? observations?.length ?? null

  // Structure conforme Figma : entete (Especes (N) + toggle "Carnet
  // d'observations") HORS carte, puis la carte bordee qui contient la liste,
  // affichee uniquement quand le carnet est deplie.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-body font-bold text-base text-foreground">
          Espèces{count !== null ? ` (${count})` : ''}
        </span>

        {/* Toggle : label "Carnet d'observations" (souligne, action) + bouton X
            rond quand c'est deplie (= replier). Toute la zone toggle. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Replier le carnet' : 'Déplier le carnet'}
          className="inline-flex items-center gap-2 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-base font-bold leading-tight text-[var(--color-action-default)] border-b-[1.5px] border-[var(--color-action-default)]">
            Carnet d&apos;observations
          </span>
          {/* Chevron (plus clair que le X pour ouvrir/fermer), Nicolas 2026-06-08 */}
          {open ? (
            <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div className="rounded-md border-[0.5px] border-border bg-background p-4">
          {isLoading && (
            <div className="text-center py-4 text-sm text-muted-foreground">Chargement…</div>
          )}
          {error && (
            <div className="text-sm text-destructive py-2 inline-flex items-center gap-2">
              <X className="size-4" aria-hidden="true" />
              Impossible de charger les espèces : {error}
            </div>
          )}
          {observations && !isLoading && !error && (
            <NotebookSpeciesList observations={observations} compact />
          )}
        </div>
      )}
    </div>
  )
}
