/**
 * useHorizontalTabScroll : confort d'une barre d'onglets horizontale scrollable.
 * =============================================================================
 * Deux comportements, partages par le panneau cloche et la page /notifications
 * (une seule source, pas de divergence NG-046) :
 *
 *   1. RECENTRE l'onglet ACTIF quand il change : sans ca, un onglet en bord de
 *      barre (ex "Systeme", le dernier) reste coupe a droite quand on le
 *      selectionne (retour Nicolas 2026-08-24). On le ramene au centre.
 *   2. Molette VERTICALE -> scroll HORIZONTAL (desktop souris) : sur une barre
 *      qui deborde, la molette classique ne scrollait pas les onglets. Le tactile
 *      (tablette/mobile) marche deja via overflow-x-auto + touch-pan-x.
 *
 * Le scroll est scope a la barre (scrollTo/scrollLeft sur l'element), il ne fait
 * jamais defiler la page.
 */

import { useEffect, useRef } from 'react'

export function useHorizontalTabScroll<T extends HTMLElement = HTMLDivElement>(activeKey: string) {
  const ref = useRef<T | null>(null)

  // 1. Recentre l'onglet actif a chaque changement d'onglet.
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const active = bar.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active) return
    const target = active.offsetLeft - (bar.clientWidth - active.clientWidth) / 2
    bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [activeKey])

  // 2. Molette verticale -> horizontale. Listener NON passif pour pouvoir
  // preventDefault et ne pas faire defiler la page en meme temps.
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || bar.scrollWidth <= bar.clientWidth) return
      e.preventDefault()
      bar.scrollLeft += e.deltaY
    }
    bar.addEventListener('wheel', onWheel, { passive: false })
    return () => bar.removeEventListener('wheel', onWheel)
  }, [])

  return ref
}
