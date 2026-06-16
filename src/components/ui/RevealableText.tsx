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
 *   - Le texte complet se revele alors UNIQUEMENT s'il est tronque, via le composant
 *     Tooltip partage (survol/focus desktop, clic long tactile), borne a l'ecran.
 *   - Pas de revelation / pas de troncature quand le texte tient : affichage simple.
 *
 * Accessibilite : le noeud texte contient toujours le libelle complet (la troncature
 * est purement CSS), donc les lecteurs d'ecran lisent l'integralite.
 */

import { useEffect, useRef, useState } from 'react'
import { Tooltip } from './Tooltip'

interface RevealableTextProps {
  /** Texte a afficher (et a reveler en entier si tronque). */
  text: string
  /** Classes utilitaires optionnelles (la largeur est geree par le conteneur, pas ici). */
  className?: string
}

export function RevealableText({ text, className = '' }: RevealableTextProps) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

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

  return (
    <Tooltip
      content={text}
      longPress
      disabled={!isTruncated}
      // Wrapper declencheur : largeur pilotee par le conteneur (chaine min-w-0),
      // et select-none + callout off pour que le clic long ne selectionne pas le texte.
      className={`inline-block min-w-0 max-w-full select-none align-middle [-webkit-touch-callout:none] ${className}`}
    >
      <span ref={labelRef} className="block truncate">
        {text}
      </span>
    </Tooltip>
  )
}
