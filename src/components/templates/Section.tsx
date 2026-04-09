/**
 * Section — Wrapper standard pour les sections de la landing
 * ============================================================
 * Mutualise le pattern récurrent :
 *   bg-bg-primary + w-full + flex justify-center + padding responsive
 *   + max-w-1728 + gap vertical
 *
 * Utilisé par toutes les sections de la landing.
 *
 * Props :
 * - `id` : ancre HTML pour navigation interne (optionnel)
 * - `as` : balise HTML — défaut 'section'
 * - `background` : token de fond — défaut 'primary'
 * - `padding` : 'default' (px responsive + my responsive) | 'none' (le parent gère)
 * - `dataName` : annotation Figma pour debug visuel
 */

import type { ReactNode } from 'react'

type Background = 'primary' | 'tertiary' | 'highlight'

const bgClasses: Record<Background, string> = {
  primary: 'bg-[var(--color-bg-primary)]',
  tertiary: 'bg-[var(--color-bg-tertiary)]',
  highlight: 'bg-[var(--color-highlight-primary)]',
}

interface SectionProps {
  children: ReactNode
  id?: string
  background?: Background
  /** Padding horizontal + marge verticale standardisés (default) ou aucun (none) */
  padding?: 'default' | 'none'
  dataName?: string
  className?: string
  /** Classes appliquées au container interne (max-w-1728) */
  innerClassName?: string
}

export function Section({
  children,
  id,
  background = 'primary',
  padding = 'default',
  dataName,
  className = '',
  innerClassName = '',
}: SectionProps) {
  const paddingClasses =
    padding === 'default' ? 'px-5 md:px-10 lg:px-32 my-10 md:my-16 lg:my-40' : ''

  return (
    <section
      id={id}
      className={`${bgClasses[background]} w-full flex justify-center ${paddingClasses} ${className}`}
      data-name={dataName}
    >
      <div className={`w-full max-w-[1728px] ${innerClassName}`}>{children}</div>
    </section>
  )
}
