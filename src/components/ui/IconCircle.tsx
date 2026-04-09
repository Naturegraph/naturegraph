/**
 * IconCircle — Cercle coloré avec icône centrée
 * ===============================================
 * Pattern visuel récurrent dans la landing page : un cercle de fond pastel
 * avec une icône au centre. Évite la duplication de 6+ occurrences inline.
 *
 * Variants couleur :
 * - `primary` : fond violet pâle (--color-action-light), icône violette
 * - `highlight` : fond menthe, icône teal foncé
 * - `warm` : fond crème, icône texte
 *
 * Sizes : sm (32px) | md (48px) | lg (64px) | xl (80px)
 *
 * A11y : décoratif par défaut (aria-hidden). Le sens doit être porté par le
 * texte adjacent (titre de FeatureCard, etc.).
 */

import type { ReactNode } from 'react'

export type IconCircleSize = 'sm' | 'md' | 'lg' | 'xl'
export type IconCircleColor = 'primary' | 'highlight' | 'warm' | 'solid'

export interface IconCircleProps {
  /** Icône à afficher (lucide-react ou SVG) */
  icon: ReactNode
  /** Variante couleur — défaut: primary */
  color?: IconCircleColor
  /** Taille du cercle — défaut: md */
  size?: IconCircleSize
  /** Classes additionnelles */
  className?: string
}

const sizeClasses: Record<IconCircleSize, string> = {
  sm: 'w-8 h-8 [&>svg]:w-4 [&>svg]:h-4',
  md: 'w-12 h-12 [&>svg]:w-6 [&>svg]:h-6',
  lg: 'w-16 h-16 [&>svg]:w-8 [&>svg]:h-8',
  xl: 'w-20 h-20 [&>svg]:w-10 [&>svg]:h-10',
}

const colorClasses: Record<IconCircleColor, string> = {
  primary: 'bg-[var(--color-action-light)] text-[var(--color-action-default)]',
  highlight: 'bg-[var(--color-bg-menthe)] text-[var(--color-highlight-primary)]',
  warm: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
  solid: 'bg-[var(--color-action-default)] text-[var(--color-text-white)]',
}

export function IconCircle({
  icon,
  color = 'primary',
  size = 'md',
  className = '',
}: IconCircleProps) {
  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    >
      {icon}
    </div>
  )
}
