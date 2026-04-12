/**
 * FeatureCard — Carte feature avec icône, titre et description
 * =============================================================
 * Pattern récurrent dans la landing (FeaturesCards, ProductFeatures, Storytelling).
 *
 * Props :
 * - `boxed` : ajoute fond + padding + arrondi (carte autonome). Sinon plain text.
 * - `align` : 'left' (défaut) ou 'center' (icône + texte centrés)
 * - `iconColor` : variante IconCircle (primary, solid, highlight-solid…)
 *
 * A11y : utilise <h3> pour s'inscrire dans la hiérarchie des sections landing.
 */

import type { ReactNode } from 'react'
import { IconCircle, type IconCircleColor } from './IconCircle'

export interface FeatureCardProps {
  /** Icône (lucide-react ou SVG) */
  icon: ReactNode
  /** Titre de la feature */
  title: string
  /** Description courte */
  description: string
  /** Variante couleur de l'IconCircle — défaut: primary */
  iconColor?: IconCircleColor
  /** Variante visuelle : boxed = fond + padding, plain = sans (défaut: plain) */
  boxed?: boolean
  /** Alignement du contenu — défaut: left */
  align?: 'left' | 'center'
  /** Classes additionnelles sur le wrapper */
  className?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  iconColor = 'primary',
  boxed = false,
  align = 'left',
  className = '',
}: FeatureCardProps) {
  const layoutClasses = align === 'center' ? 'items-center text-center' : 'items-start'
  const boxedClasses = boxed ? 'bg-[var(--color-bg-primary)] rounded-[32px] p-8' : ''

  return (
    <div className={`flex flex-col gap-4 ${layoutClasses} ${boxedClasses} ${className}`}>
      <IconCircle icon={icon} color={iconColor} size="lg" />
      <h3 className="text-[var(--color-text-primary)] font-bold font-[var(--font-title)]">
        {title}
      </h3>
      <p className="text-[var(--color-text-secondary)] font-[var(--font-body)]">{description}</p>
    </div>
  )
}
