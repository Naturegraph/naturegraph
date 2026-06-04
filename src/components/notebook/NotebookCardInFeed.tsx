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
  /** Par defaut deplie. Si false, replie. */
  defaultOpen?: boolean
}

export function NotebookCardInFeed({
  notebookId,
  speciesCount,
  defaultOpen = true,
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

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <span className="font-title font-bold text-base">
          Espèces{count !== null ? ` (${count})` : ''}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-sm font-medium text-primary border-b border-primary">
            Carnet d&apos;observations
          </span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
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
