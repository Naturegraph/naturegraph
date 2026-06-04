/**
 * NotebookResumePicker, V1.2.0 (NG-005/006)
 *
 * Affiche en haut de l Encounter Step 2 un bandeau "Reprendre un carnet en
 * cours" si l user a des carnets draft/active. Sur clic, recupere les
 * observations du carnet et les injecte dans le formulaire (via callback).
 *
 * Decision Nicolas 2026-06-02 : ce picker est visible meme sur desktop. Le
 * mode terrain (creation carnet) reste mobile-only, mais publier un carnet
 * deja entame peut se faire depuis n importe quel device.
 */

import { useState } from 'react'
import { BookOpen, ChevronDown, Loader2, X } from 'lucide-react'
import {
  getNotebookWithObservations,
  type Notebook,
  type NotebookObservation,
} from '@/services/notebookService'

interface NotebookResumePickerProps {
  notebooks: Notebook[]
  /** Carnet actuellement repris (null si aucun). */
  resumedNotebookId: string | null
  /** Charge un carnet -> remplace les observations du form + memorise l id. */
  onResume: (notebookId: string | null, observations: NotebookObservation[]) => void
}

export function NotebookResumePicker({
  notebooks,
  resumedNotebookId,
  onResume,
}: NotebookResumePickerProps) {
  const [open, setOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (notebooks.length === 0 && !resumedNotebookId) return null

  const resumed = notebooks.find((n) => n.id === resumedNotebookId) ?? null

  async function handlePick(notebookId: string) {
    setError(null)
    setLoadingId(notebookId)
    try {
      const full = await getNotebookWithObservations(notebookId)
      if (!full) throw new Error('Carnet introuvable')
      onResume(notebookId, full.observations)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingId(null)
    }
  }

  function handleClearResume() {
    onResume(null, [])
  }

  // Mode "carnet repris" : badge avec X pour debrancher
  if (resumed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light border border-primary/30">
        <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <BookOpen className="size-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Carnet repris</p>
          <p className="font-title font-bold text-sm leading-tight truncate">
            {resumed.title?.trim() || 'Sans titre'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearResume}
          aria-label="Ne pas reprendre ce carnet"
          className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  // Mode "selecteur" : dropdown avec la liste des carnets disponibles
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light border border-primary/30 hover:bg-primary-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left"
      >
        <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <BookOpen className="size-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-title font-bold text-sm leading-tight">Reprendre un carnet en cours</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {notebooks.length} carnet{notebooks.length > 1 ? 's' : ''} disponible
            {notebooks.length > 1 ? 's' : ''}
          </p>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          <ul role="listbox" aria-label="Carnets disponibles">
            {notebooks.map((nb) => (
              <li key={nb.id}>
                <button
                  type="button"
                  onClick={() => handlePick(nb.id)}
                  disabled={loadingId !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50 disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {nb.title?.trim() || 'Sans titre'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nb.species_count} espèce{nb.species_count > 1 ? 's' : ''} ·{' '}
                      {nb.observations_count} observation
                      {nb.observations_count > 1 ? 's' : ''} ·{' '}
                      <span className="capitalize">
                        {nb.status === 'active' ? 'En cours' : 'Brouillon'}
                      </span>
                    </p>
                  </div>
                  {loadingId === nb.id && (
                    <Loader2
                      className="size-4 text-primary animate-spin shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <div className="px-4 py-2 text-xs text-destructive bg-destructive/10">
              Erreur : {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
