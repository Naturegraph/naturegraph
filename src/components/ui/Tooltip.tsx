/**
 * Tooltip, bulle d'info flottante reutilisable (design system Naturegraph).
 *
 * - Couleurs DS : fond `--color-text-primary`, texte `--color-text-inverse`
 *   (coherent light/dark, comme le reste du produit).
 * - Rendu via portal en position `fixed`, position calculee depuis le rect du
 *   declencheur et BORNEE a l'ecran : la bulle reste toujours entierement visible
 *   (pas de debordement lateral, donc pas de scroll horizontal parasite).
 * - Petite fleche pointant vers le declencheur ; bascule au-dessus / en dessous
 *   selon la place disponible.
 * - Apparait au survol souris + focus clavier (desktop). Avec `longPress`, apparait
 *   aussi au clic long (~450ms) sur tactile, et supprime le clic synthetise qui
 *   suivrait (utile quand le declencheur est lui-meme cliquable).
 * - Se masque au scroll / resize (la position calculee deviendrait obsolete).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  /** Contenu de la bulle. */
  content: ReactNode
  /** Element declencheur. */
  children: ReactNode
  /** Active aussi le clic long sur tactile (et supprime le clic synthetise). */
  longPress?: boolean
  /** N'affiche jamais la bulle (rend juste le declencheur). */
  disabled?: boolean
  /** Classes du wrapper declencheur (display, largeur, select-none, etc.). */
  className?: string
  /** Classes supplementaires de la bulle. */
  contentClassName?: string
}

/** Duree d'appui (ms) au-dela de laquelle on considere un clic long sur tactile. */
const LONG_PRESS_MS = 450
/** Ecart vertical declencheur <-> bulle : assez grand pour ne pas etre cache par le doigt. */
const GAP = 16
/** Marge minimale avec les bords de l'ecran. */
const EDGE = 8
/** Demi-cote de la fleche (carre de 8px tourne a 45deg). */
const ARROW = 4

interface Coords {
  top: number
  left: number
  /** Position horizontale de la fleche, relative a la bulle. */
  arrowLeft: number
  placement: 'above' | 'below'
}

function Tooltip({
  content,
  children,
  longPress = false,
  disabled = false,
  className = 'inline-flex',
  contentClassName = '',
}: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  const hide = useCallback(() => setVisible(false), [])
  const show = useCallback(() => {
    if (!disabled) setVisible(true)
  }, [disabled])

  // Positionne la bulle une fois visible (apres rendu, pour mesurer ses dimensions),
  // en la bornant a l'ecran. useLayoutEffect : calcul avant peinture, pas de flicker.
  useLayoutEffect(() => {
    if (!visible) return
    const trigger = wrapperRef.current
    const tip = tipRef.current
    if (!trigger || !tip) return
    const r = trigger.getBoundingClientRect()
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const vw = window.innerWidth

    // Au-dessus par defaut ; bascule en dessous s'il n'y a pas la place en haut.
    let placement: 'above' | 'below' = 'above'
    let top = r.top - th - GAP
    if (top < EDGE) {
      placement = 'below'
      top = r.bottom + GAP
    }

    // Centre sur le declencheur, puis borne aux marges de l'ecran.
    const center = r.left + r.width / 2
    const left = Math.max(EDGE, Math.min(center - tw / 2, vw - tw - EDGE))
    // Fleche au centre du declencheur, mais jamais hors de la bulle.
    const arrowLeft = Math.max(12, Math.min(center - left, tw - 12))

    setCoords({ top, left, arrowLeft, placement })
  }, [visible, content])

  // Position fixe : on masque si l'utilisateur scrolle ou redimensionne.
  useEffect(() => {
    if (!visible) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [visible, hide])

  const clearTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Nettoyage du timer au demontage.
  useEffect(() => clearTimer, [clearTimer])

  const handleTouchStart = useCallback(() => {
    if (disabled) return
    longPressFired.current = false
    clearTimer()
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      setVisible(true)
    }, LONG_PRESS_MS)
  }, [disabled, clearTimer])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      clearTimer()
      if (longPressFired.current) {
        // Empeche le clic synthetise apres un clic long : sinon l'action du
        // declencheur (ex. filtre du chip) se declencherait en voulant juste lire.
        e.preventDefault()
        setVisible(false)
      }
    },
    [clearTimer],
  )

  const handleTouchMove = useCallback(() => {
    // Un deplacement = scroll, pas un clic long : on annule.
    clearTimer()
    setVisible(false)
  }, [clearTimer])

  return (
    <span
      ref={wrapperRef}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={longPress ? handleTouchStart : undefined}
      onTouchEnd={longPress ? handleTouchEnd : undefined}
      onTouchCancel={longPress ? handleTouchEnd : undefined}
      onTouchMove={longPress ? handleTouchMove : undefined}
    >
      {children}
      {visible &&
        !disabled &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className={`pointer-events-none fixed z-[100] max-w-[92vw] whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium normal-case text-[var(--color-text-inverse)] shadow-lg ${contentClassName}`}
            style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
          >
            {content}
            {coords && (
              <span
                aria-hidden="true"
                className="absolute size-2 rotate-45 bg-[var(--color-text-primary)]"
                style={
                  coords.placement === 'above'
                    ? { left: coords.arrowLeft - ARROW, bottom: -ARROW }
                    : { left: coords.arrowLeft - ARROW, top: -ARROW }
                }
              />
            )}
          </div>,
          document.body,
        )}
    </span>
  )
}

export { Tooltip }
export type { TooltipProps }
