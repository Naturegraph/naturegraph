/**
 * StepIndicator — Barre de progression segmentée
 * ================================================
 * Affiche `current/total` étapes via une barre segmentée.
 * Utilisé dans l'onboarding (4 occurrences répétées avec dupplications).
 *
 * A11y : role="progressbar" + aria-valuenow/max/text natifs.
 */

export interface StepIndicatorProps {
  /** Étape courante (1-based) */
  current: number
  /** Nombre total d'étapes */
  total: number
  /** Texte ARIA descriptif (i18n) — ex: "Étape 2 sur 4" */
  ariaLabel?: string
  /** Classes additionnelles */
  className?: string
}

export function StepIndicator({ current, total, ariaLabel, className = '' }: StepIndicatorProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuetext={ariaLabel ?? `Étape ${current} sur ${total}`}
      className={`flex gap-1 w-full ${className}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i < current
        return (
          <div
            key={i}
            className={`flex-1 h-[6px] rounded-full ${
              isActive ? 'bg-[var(--color-highlight-primary)]' : 'bg-[var(--color-border)]'
            }`}
          />
        )
      })}
    </div>
  )
}
