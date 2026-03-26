/**
 * OnboardingButton — Bouton pour le flow d'onboarding
 *
 * Variantes : primary (fond violet), secondary (bord), ghost (transparent).
 * Effet hover : cercle expansif depuis le centre (désactivé si prefers-reduced-motion).
 * Focus visible : ring primary sur navigation clavier (WCAG 2.4.7).
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface OnboardingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

export function OnboardingButton({
  variant = 'primary',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: OnboardingButtonProps) {
  const base = [
    'relative overflow-hidden transition-all',
    // Scale au clic — désactivé si l'utilisateur préfère les mouvements réduits
    'motion-safe:active:scale-[0.98]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    // Focus visible clavier (WCAG 2.4.7)
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' ')

  // Ripple hover : cercle expansif. Caché si prefers-reduced-motion (motion-reduce:after:hidden).
  const ripple = [
    "after:content-[''] after:absolute after:top-1/2 after:left-1/2",
    'after:-translate-x-1/2 after:-translate-y-1/2',
    'after:w-[200%] after:aspect-square after:rounded-full after:bg-black/20',
    'after:scale-0 hover:after:scale-100',
    'after:transition-transform after:duration-0 hover:after:duration-[1000ms] after:ease-in-out',
    // Supprime complètement l'animation si reduced-motion est activé
    'motion-reduce:after:hidden',
  ].join(' ')

  const variants = {
    primary: 'bg-primary text-primary-foreground rounded-button h-12 px-6',
    secondary:
      'bg-off-white border-[0.5px] border-border text-foreground rounded-button h-12 px-6 hover:border-foreground',
    ghost: 'text-text-dark hover:text-foreground h-12 px-6',
  }

  return (
    <button
      type={type}
      className={`${base} ${variant !== 'ghost' ? ripple : ''} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}
