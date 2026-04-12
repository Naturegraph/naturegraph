/**
 * SocialLink — Lien externe vers un réseau social
 * ==================================================
 * Wrapper standardisé pour les ancres sociales (Instagram, Discord, etc.).
 *  - target/_blank + rel sécurisés par défaut
 *  - aria-label obligatoire (icône seule, pas de texte)
 *  - couleur héritée + hover opacity uniforme
 */

import type { ReactNode } from 'react'

export interface SocialLinkProps {
  /** URL externe complète */
  href: string
  /** Label accessible (ex: "Instagram") — obligatoire car icône seule */
  label: string
  /** Icône (lucide-react ou SVG inline) */
  icon: ReactNode
  /** Classes additionnelles */
  className?: string
}

export function SocialLink({ href, label, icon, className = '' }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`text-[var(--color-text-white)] hover:opacity-80 transition-opacity ${className}`}
    >
      {icon}
    </a>
  )
}
