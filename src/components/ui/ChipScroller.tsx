/**
 * ChipScroller : rangee de chips a defilement horizontal.
 * =============================================================================
 * Derniere etape de publication (Rencontre + Instant Nature) : les selecteurs
 * (habitat, phenomene, meteo, moment) etaient en `flex-wrap` -> plusieurs lignes
 * -> beaucoup de scroll vertical, surtout avec les nouvelles options.
 *
 * Ce wrapper met chaque groupe sur UNE seule ligne a defilement horizontal :
 *   - reduit fortement le scroll vertical SANS masquer aucune option (tous les
 *     choix restent accessibles au swipe, ce que Nicolas voulait : pas de
 *     collapsible qui cache et fait oublier les champs) ;
 *   - degrade discret sur les bords (indice "il y a d'autres choix a cote") ;
 *   - scrollbar masquee (l'affordance = chips partiellement coupes + degrade) ;
 *   - `activeKey` : quand la valeur selectionnee change (ou au montage, cas
 *     edition d'un post ou le chip actif serait hors ecran a droite), on recentre
 *     le chip actif DANS le conteneur, sans bouger la page.
 *
 * Non-cassant : memes chips, meme selection ; le defilement horizontal de chips
 * est un pattern mobile standard. Accessibilite : le focus clavier ramene
 * automatiquement le chip focus dans la zone visible (scroll natif).
 */
import { useEffect, useRef } from 'react'

interface ChipScrollerProps {
  children: React.ReactNode
  /** Libelle du groupe pour les lecteurs d'ecran. */
  ariaLabel?: string
  /** Valeur selectionnee : declenche le recentrage du chip actif quand elle change. */
  activeKey?: string | null
}

// Degrade sur les bords (les deux prefixes pour Safari iOS, plateforme principale).
const FADE_MASK =
  'linear-gradient(to right, transparent, #000 14px, #000 calc(100% - 24px), transparent)'

export function ChipScroller({ children, ariaLabel, activeKey }: ChipScrollerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container || !activeKey) return
    const el = container.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!el) return
    // Recentre le chip actif horizontalement, uniquement dans le conteneur
    // (scrollBy relatif -> ne scrolle jamais la page).
    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const delta = eRect.left - cRect.left - (container.clientWidth - el.clientWidth) / 2
    container.scrollBy({ left: delta, behavior: 'auto' })
  }, [activeKey])

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
    >
      {children}
    </div>
  )
}
