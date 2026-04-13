/**
 * ImageTextLayout — Layout image + contenu côte à côte
 * ======================================================
 * Pattern récurrent dans la landing : Mission, Values, FAQ, Discord.
 * - Mobile/Tablet : empilé (image en haut)
 * - Desktop (lg+) : image et contenu côte à côte avec gap configurable
 *
 * Props :
 * - `image` : node de l'image (déjà stylée — wrapper aspect/rounded)
 * - `imagePosition` : 'left' (défaut) ou 'right' — l'image passe à droite en desktop
 * - `gap` : 'md' (default 12/20) | 'lg' (12/32) — gap responsive
 * - `align` : 'center' (défaut) ou 'start' — alignement vertical desktop
 * - `imageWidth` : 'flex' (défaut, 50/50) ou 'fixed' (largeur image fixée par le caller)
 */

import type { ReactNode } from 'react'

interface ImageTextLayoutProps {
  image: ReactNode
  children: ReactNode
  imagePosition?: 'left' | 'right'
  gap?: 'md' | 'lg'
  align?: 'center' | 'start'
  /** flex = chaque colonne flex-1 ; fixed = image garde sa largeur intrinsèque */
  imageWidth?: 'flex' | 'fixed'
  className?: string
}

export function ImageTextLayout({
  image,
  children,
  imagePosition = 'left',
  gap = 'md',
  align = 'center',
  imageWidth = 'flex',
  className = '',
}: ImageTextLayoutProps) {
  const gapClasses = gap === 'lg' ? 'gap-12 lg:gap-32' : 'gap-10 lg:gap-20'
  const alignClasses = align === 'start' ? 'lg:items-start' : 'lg:items-center'
  const reverseClass = imagePosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'

  // En mode flex : image et contenu prennent chacun flex-1
  // En mode fixed : seule la zone contenu est flex-1, l'image garde sa largeur
  const imageWrapperClass =
    imageWidth === 'flex' ? 'w-full lg:flex-1' : 'w-full lg:w-auto lg:shrink-0'

  return (
    <div className={`flex flex-col ${reverseClass} ${alignClasses} ${gapClasses} ${className}`}>
      <div className={imageWrapperClass}>{image}</div>
      <div className="w-full lg:flex-1 flex flex-col">{children}</div>
    </div>
  )
}
