/**
 * SelectOption — Option sélectionnable type radio/checkbox
 * =========================================================
 * Pattern récurrent dans l'onboarding (6 occurrences) :
 * carte cliquable avec état sélectionné, indicateur visuel et label.
 *
 * Modes :
 * - `radio` : indicateur rond (sélection unique)
 * - `checkbox` : indicateur carré avec Check (sélection multiple)
 *
 * A11y : `aria-pressed` porte l'état. Le wrapper reste un <button>.
 */

import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface SelectOptionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** État sélectionné */
  selected: boolean
  /** Mode visuel — défaut: radio */
  mode?: 'radio' | 'checkbox'
  /** Label principal (titre de l'option) */
  label: ReactNode
  /** Description optionnelle sous le label */
  description?: ReactNode
}

export function SelectOption({
  selected,
  mode = 'radio',
  label,
  description,
  className = '',
  type = 'button',
  ...props
}: SelectOptionProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'relative w-full p-6 border text-left transition-all',
        mode === 'radio' ? 'rounded-sm' : 'rounded-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2',
        selected
          ? 'bg-[var(--color-action-light)] border-[var(--color-action-default)]'
          : 'bg-transparent border-[var(--color-border)] hover:border-[var(--color-text-primary)]/20',
        className,
      ].join(' ')}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span
            className={`font-bold leading-tight ${
              selected ? 'text-[var(--color-action-default)]' : 'text-[var(--color-text-primary)]'
            }`}
          >
            {label}
          </span>
          {description && <p className="text-[var(--color-text-secondary)]">{description}</p>}
        </div>

        {/* Indicateur visuel — décoratif (aria-pressed porte l'état) */}
        {mode === 'radio' ? (
          <div
            aria-hidden="true"
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              selected
                ? 'bg-[var(--color-action-default)]'
                : 'bg-[var(--color-bg-primary)] border-[1.5px] border-[var(--color-border)]'
            }`}
          >
            {selected && <div className="w-3 h-3 rounded-full bg-[var(--color-bg-primary)]" />}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={`flex items-center justify-center rounded-sm shrink-0 size-5 ${
              selected
                ? 'bg-[var(--color-action-default)]'
                : 'bg-[var(--color-bg-primary)] border-[1.5px] border-[var(--color-border)]'
            }`}
          >
            {selected && (
              <Check className="size-4 text-[var(--color-text-white)]" strokeWidth={3} />
            )}
          </div>
        )}
      </div>
    </button>
  )
}
