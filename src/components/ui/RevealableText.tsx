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
 * Accessibilite : le noeud texte contient toujours le libelle complet (la troncature
 * est purement CSS), donc les lecteurs d'ecran lisent l'integralite.
 */

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'

interface RevealableTextProps {
  /** Texte a afficher (et a reveler en entier si tronque). */
  text: string
  /** Classes utilitaires optionnelles (la largeur est geree par le conteneur, pas ici). */
  className?: string
}

/** Duree d'appui (ms) au-dela de laquelle on considere un clic long sur tactile. */
const LONG_PRESS_MS = 450

export function RevealableText({ text, className = '' }: RevealableTextProps) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [visible, setVisible] = useState(false)
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
      {visible && isTruncated && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 max-w-[92vw] whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium normal-case text-[var(--color-text-inverse)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}
