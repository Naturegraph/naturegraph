/**
 * PaginationDots : Indicateurs de pagination cliquables
 * =======================================================
 * Pattern dots pour sliders horizontaux. Le dot actif s'allonge
 * (largeur 50px) pour signaler visuellement la position.
 *
 * A11y : chaque dot est un <button> avec aria-label fourni par le parent
 * pour garantir l'i18n. Le label doit décrire la cible (ex: "Aller au slide 3").
 */

interface PaginationDotsProps {
  /** Nombre total de dots */
  count: number
  /** Index actif (0-based) */
  active: number
  /** Callback au clic sur un dot */
  onDotClick: (index: number) => void
  /** Fonction qui retourne le label aria pour un index donné */
  getLabel: (index: number) => string
  /** Classes additionnelles */
  className?: string
}

export function PaginationDots({
  count,
  active,
  onDotClick,
  getLabel,
  className = '',
}: PaginationDotsProps) {
  return (
    <div className={`flex justify-center gap-3 mt-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={`transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 ${
            i === active
              ? 'w-[50px] h-[10px] rounded-[100px] bg-[var(--color-action-default)]'
              : 'w-[10px] h-[10px] rounded-full bg-[var(--color-border)]'
          }`}
          aria-label={getLabel(i)}
          aria-current={i === active ? 'true' : undefined}
        />
      ))}
    </div>
  )
}
