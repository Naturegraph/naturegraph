/**
 * FeatureCard — Carte feature avec icône, titre et description
 * =============================================================
 * Pattern récurrent dans la landing page (3+ occurrences) :
 * IconCircle + heading + paragraphe descriptif.
 *
 * A11y : utilise <h3> pour s'inscrire dans la hiérarchie des sections landing.
 * Le icon est porté par IconCircle (déjà aria-hidden).
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
  /** Classes additionnelles sur le wrapper */
  className?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  iconColor = 'primary',
  className = '',
}: FeatureCardProps) {
  return (
    <div className={`flex flex-col items-start gap-4 ${className}`}>
      <IconCircle icon={icon} color={iconColor} size="lg" />
      <h3 className="text-[var(--color-text-primary)] font-bold font-[var(--font-title)]">
        {title}
      </h3>
      <p className="text-[var(--color-text-secondary)] font-[var(--font-body)]">{description}</p>
    </div>
  )
}
