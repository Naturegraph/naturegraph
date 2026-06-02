/**
 * NotebookBanner, V1.2.0 (NG-006)
 *
 * Bandeau sticky en haut de l app lorsque l user a un carnet actif (status
 * 'active'). Permet de rester dans le contexte terrain : 1 clic pour
 * reprendre la saisie, infos a jour (especes / observations / duree).
 *
 * Pas affiche si le carnet est en 'draft' (l user a paused) ou si aucun
 * carnet actif. Tap = reouvre le NotebookPanel pour continuer.
 *
 * Position : fixed top-0 z-[45] (au-dessus de la HomeNavbar z-40 mais
 * sous les dialogs critiques z-50+). Padding contenu pour ne pas masquer
 * la navbar derriere.
 *
 * Visibilite : MOBILE-ONLY (md:hidden). Decision Nicolas 2026-06-02 :
 * le mode terrain n a de sens que sur smartphone (on est dehors avec son
 * tel). Sur desktop, un carnet entame depuis mobile peut etre repris via
 * Rencontre nature (Phase 4+) mais le banner sticky n a pas lieu d etre.
 */

import { useEffect, useState } from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import { useNotebook } from '@/contexts/NotebookContext'
import { formatElapsedSinceStart } from '@/services/notebookService'

export function NotebookBanner() {
  const { activeNotebook } = useNotebook()
  // Re-render toutes les 60s pour rafraichir le timer "il y a 12 min"
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!activeNotebook || activeNotebook.status !== 'active') return
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [activeNotebook])

  if (!activeNotebook || activeNotebook.status !== 'active') return null

  const title = activeNotebook.title?.trim() || 'Sortie en cours'
  const elapsed = formatElapsedSinceStart(activeNotebook.started_at)

  function openPanel() {
    // Custom event ecoute par App / HomeNavbar pour ouvrir le NotebookPanel.
    window.dispatchEvent(new CustomEvent('naturegraph:open-notebook'))
  }

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label={`Reprendre le carnet ${title}`}
      className="fixed top-0 inset-x-0 z-[45] flex items-center gap-3 px-4 py-2 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
    >
      <div className="size-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <BookOpen className="size-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-title font-bold text-sm leading-tight truncate">Carnet : {title}</p>
        <p className="text-[11px] opacity-90 leading-tight">
          {activeNotebook.species_count} espèce
          {activeNotebook.species_count > 1 ? 's' : ''} · {activeNotebook.observations_count}{' '}
          observation
          {activeNotebook.observations_count > 1 ? 's' : ''}
          {elapsed ? ` · ${elapsed}` : ''}
        </p>
      </div>
      <ChevronRight className="size-5 opacity-80 shrink-0" aria-hidden="true" />
    </button>
  )
}
