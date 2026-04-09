/**
 * PhoneFrame — Cadre téléphone stylisé pour mockups
 * ====================================================
 * Bordure arrondie épaisse autour d'un screenshot d'app.
 * Utilisé dans la landing pour ProductFeatures (desktop + mobile slides)
 * et la section Discord.
 *
 * Sizes :
 * - sm : 140×303 (mobile slide ProductFeatures)
 * - md : 280×606 (desktop ProductFeatures)
 * - custom : passer width/height en props si besoin spécifique
 */

import type { ReactNode } from 'react'

export type PhoneFrameSize = 'sm' | 'md'

interface PhoneFrameProps {
  /** Contenu (généralement une <img>) */
  children: ReactNode
  /** Taille prédéfinie — défaut: md */
  size?: PhoneFrameSize
  /** Classes additionnelles pour le wrapper */
  className?: string
}

const sizeClasses: Record<PhoneFrameSize, string> = {
  sm: 'w-[140px] h-[303px] rounded-[20px] border-4',
  md: 'w-[280px] h-[606px] rounded-[40px] border-[6px] shadow-2xl',
}

export function PhoneFrame({ children, size = 'md', className = '' }: PhoneFrameProps) {
  return (
    <div
      className={`relative overflow-hidden border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] ${sizeClasses[size]} ${className}`}
    >
      {children}
    </div>
  )
}
