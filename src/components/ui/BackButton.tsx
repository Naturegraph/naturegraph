/**
 * BackButton — Bouton "Retour" avec icône flèche
 * ================================================
 * Pattern récurrent dans le flow d'onboarding (3 occurrences) :
 * bouton outline avec ArrowLeft + texte caché sur mobile.
 *
 * A11y : aria-label compense l'absence de texte sur mobile.
 */

import { ArrowLeft } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

export interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texte affiché desktop + aria-label — défaut: "Retour" */
  label?: string
}

export function BackButton({
  label = 'Retour',
  className = '',
  type = 'button',
  ...props
}: BackButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`flex items-center justify-center gap-3 h-12 px-6 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-full hover:border-[var(--color-text-primary)]/40 transition-all motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      <ArrowLeft className="size-5 text-[var(--color-text-primary)]" aria-hidden="true" />
      <span className="hidden md:inline text-[var(--color-text-primary)]">{label}</span>
    </button>
  )
}
