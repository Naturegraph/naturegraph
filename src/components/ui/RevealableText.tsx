/**
 * RevealableText, texte tronque sur une ligne avec revelation du texte complet.
 *
 * Probleme resolu : certains libelles (ex. noms de familles taxonomiques qui
 * regroupent beaucoup de genres, "Halictes, lasioglosses, sphecodes et apparentees")
 * sont trop longs pour le chip espece et debordaient sur deux lignes serrees.
 *
 * Comportement (demande Nicolas / testeur 2026-06-15) :
 *   - Le texte s'affiche EN ENTIER tant qu'il tient dans l'espace disponible.
 *   - S'il deborde (ecran etroit), il passe sur UNE seule ligne tronquee (ellipsis),
 *     borne par la largeur du conteneur (chaine min-w-0), pas par une largeur fixe.
 *   - Le texte complet se revele alors UNIQUEMENT s'il est tronque :
 *       * au survol souris + au focus clavier (desktop),
 *       * au clic long (~450ms) sur ecran tactile (smartphone).
 *   - Pas de survol / pas de troncature quand le texte tient : affichage simple.
 *
 * Le tooltip est rendu via un portal en position `fixed`, calculee a partir du
 * rect du declencheur et BORNEE a l'ecran : il reste toujours entierement visible
 * (pas de debordement lateral, donc pas de scroll horizontal parasite qui ferait
 * "sauter" la barre de navigation mobile). Une petite fleche pointe vers le chip,
 * et l'ecart vertical est suffisant pour ne pas etre masque par le doigt.
 *
 * Accessibilite : le noeud texte contient toujours le libelle complet (la troncature
 * est purement CSS), donc les lecteurs d'ecran lisent l'integralite.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'

interface RevealableTextProps {
  /** Texte a afficher (et a reveler en entier si tronque). */
  text: string
  /** Classes utilitaires optionnelles (la largeur est geree par le conteneur, pas ici). */
  className?: string
}

/** Duree d'appui (ms) au-dela de laquelle on considere un clic long sur tactile. */
const LONG_PRESS_MS = 450
/** Ecart vertical chip <-> tooltip : assez grand pour ne pas etre cache par le doigt. */
const GAP = 16
/** Marge minimale avec les bords de l'ecran. */
const EDGE = 8
/** Demi-cote de la fleche (carre de 8px tourne a 45deg). */
const ARROW = 4

interface Coords {
  top: number
  left: number
  /** Position horizontale de la fleche, relative au tooltip. */
  arrowLeft: number
  placement: 'above' | 'below'
}

export function RevealableText({ text, className = '' }: RevealableTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  // Detecte si le texte deborde reellement (sinon, pas de revelation a proposer).
  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  // Positionne le tooltip une fois visible (apres rendu, pour mesurer ses dimensions),
  // en le bornant a l'ecran. useLayoutEffect : calcul avant peinture, pas de flicker.
  useLayoutEffect(() => {
    // Quand !visible le tooltip n'est pas rendu : inutile de reinitialiser coords
    // (il sera recalcule avant peinture a la prochaine ouverture, sans flicker).
    if (!visible) return
    const trigger = rootRef.current
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

    // Centre sur le chip, puis borne aux marges de l'ecran.
    const center = r.left + r.width / 2
    const left = Math.max(EDGE, Math.min(center - tw / 2, vw - tw - EDGE))
    // Fleche au centre du chip, mais jamais hors du tooltip.
    const arrowLeft = Math.max(12, Math.min(center - left, tw - 12))

    setCoords({ top, left, arrowLeft, placement })
  }, [visible, text])

  // Le tooltip est en position fixe : on le masque si l'utilisateur scrolle ou
  // redimensionne (la position calculee deviendrait obsolete).
  useEffect(() => {
    if (!visible) return
    const hide = () => setVisible(false)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [visible])

  const clearTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Nettoyage du timer au demontage.
  useEffect(() => clearTimer, [clearTimer])

  const handleTouchStart = useCallback(() => {
    if (!isTruncated) return
    longPressFired.current = false
    clearTimer()
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      setVisible(true)
    }, LONG_PRESS_MS)
  }, [isTruncated, clearTimer])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      clearTimer()
      if (longPressFired.current) {
        // Empeche le clic synthetise apres un clic long : sinon l'action du chip
        // parent (filtre par espece) se declencherait en voulant juste lire le texte.
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
      ref={rootRef}
      className={`relative inline-block min-w-0 max-w-full select-none align-middle ${className}`}
      // Sur tactile, le clic long declenche par defaut la selection de texte + le
      // menu natif (copier / loupe iOS), ce qui ecrase notre revelation. On bloque
      // donc selection et callout pour que le clic long ne fasse QUE reveler le texte.
      style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
      onMouseEnter={() => isTruncated && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => isTruncated && setVisible(true)}
      onBlur={() => setVisible(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <span ref={labelRef} className="block truncate">
        {text}
      </span>
      {visible &&
        isTruncated &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[100] max-w-[92vw] whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium normal-case text-[var(--color-text-inverse)] shadow-lg"
            style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
          >
            {text}
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
