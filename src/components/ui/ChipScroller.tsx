/**
 * ChipScroller : groupe de chips (sélection unique par groupe).
 * =============================================================================
 * AFFICHAGE ACTUEL = wrap multi-lignes (identique a l'historique). La variante
 * "defilement horizontal" (une seule ligne a swipe, degrade + recentrage du chip
 * actif) a ete RETIREE a la demande de Nicolas (2026-08-05) : jugee moins pratique
 * et trop perturbante pour les habitudes des users. Les nouvelles OPTIONS
 * (habitat decoupe, centre de soins, phenomenes coucher de soleil / pleine lune,
 * meteo brumeux) restent en place.
 *
 * Le wrapper est conserve (DRY + reactivable en 1 fichier) : pour revenir au
 * scroll horizontal, restaurer le rendu overflow-x + mask + effet de recentrage
 * sur `activeKey` (cf historique git de ce fichier). En attendant, `activeKey`
 * est accepte mais inutilise.
 */

interface ChipScrollerProps {
  children: React.ReactNode
  /** Libelle du groupe pour les lecteurs d'ecran. */
  ariaLabel?: string
  /** Reserve pour la variante scroll (recentrage du chip actif) : inactif en wrap. */
  activeKey?: string | null
}

export function ChipScroller({ children, ariaLabel }: ChipScrollerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
