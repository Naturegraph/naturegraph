/**
 * ToggleSwitch — Switch ON/OFF accessible
 *
 * Composant générique réutilisable. Conforme WAI-ARIA :
 *   - role="switch" + aria-checked
 *   - clavier : Space / Enter pour basculer
 *   - focus-visible ring
 *
 * Style :
 *   - Track 40×24, rounded-full
 *   - Thumb 20×20, blanc, animé de gauche à droite
 *   - ON  : track bg primary (action-default), thumb à droite
 *   - OFF : track bg muted, thumb à gauche
 */

interface ToggleSwitchProps {
  /** Valeur courante (true = ON) */
  checked: boolean
  /** Callback appelé au toggle (nouvelle valeur fournie) */
  onChange: (next: boolean) => void
  /** Label pour les screen readers (obligatoire si pas de label visible) */
  ariaLabel?: string
  /** Lie le switch à un label visible via id (alternatif à ariaLabel) */
  ariaLabelledBy?: string
  /** Désactive le switch */
  disabled?: boolean
}

export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  disabled,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[var(--color-action-default)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
