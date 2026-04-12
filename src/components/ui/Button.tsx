/**
 * Button — Composant bouton universel de Naturegraph
 * ====================================================
 * Gère 3 modes de rendu selon les props fournies :
 * - `to`   → <Link> React Router (navigation interne)
 * - `href` → <a> (lien externe, nouvel onglet par défaut)
 * - défaut → <button> natif
 *
 * Variants : primary | outline | secondary | ghost | danger
 * Sizes    : sm (h-10) | md (h-12) | lg (h-14)
 *
 * Les variants `primary` et `outline` appliquent l'effet 3D btn-press
 * défini dans landing.css — cohérence visuelle garantie sur toute l'app.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visuelle du bouton */
  variant?: ButtonVariant
  /** Taille du bouton — sm=40px | md=48px | lg=56px de hauteur */
  size?: ButtonSize
  /** Navigation interne via React Router — rend un <Link> */
  to?: string
  /** Lien externe — rend un <a> */
  href?: string
  /** Ouvre le lien dans un nouvel onglet (pertinent avec href) */
  newTab?: boolean
  /** Affiche un spinner et désactive le bouton */
  isLoading?: boolean
  /** Icône ou contenu extra à gauche du texte */
  icon?: React.ReactNode
}

// ── Classes par variant ──────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  /**
   * Bouton principal — violet solid, effet 3D btn-press.
   * Usage : CTA primaires, actions importantes.
   */
  primary:
    'btn-press btn-press-primary bg-[var(--color-action-default)] text-[var(--color-text-white)] rounded-full',

  /**
   * Bouton outline — transparent avec inset border via btn-press-outline.
   * Usage : actions secondaires sur fonds sombres (Hero, Discord).
   */
  outline: 'btn-press btn-press-outline bg-transparent text-[var(--color-text-white)] rounded-full',

  /**
   * Bouton secondaire — surface crème, sans effet 3D.
   * Usage : actions neutres dans l'interface app.
   */
  secondary:
    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:opacity-80 rounded-full',

  /**
   * Bouton fantôme — fond transparent, texte secondaire.
   * Usage : actions tertiaires, annulation, "Découvrir sans compte".
   */
  ghost:
    'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] rounded-full',

  /**
   * Bouton destructif — rouge, pour suppressions et actions irréversibles.
   */
  danger:
    'bg-[var(--color-error-action)] text-[var(--color-text-white)] hover:opacity-90 rounded-full',
}

// ── Classes par taille ───────────────────────────────────────────────────────

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm', // 40px — ex: Footer CTA
  md: 'h-12 px-6 text-base', // 48px — ex: Navbar, CTABanner, Discord
  lg: 'h-14 px-10 text-base', // 56px — ex: Hero CTA principal
}

// ── Classes de base communes ─────────────────────────────────────────────────

const baseClasses =
  'inline-flex items-center justify-center font-bold font-[var(--font-body)] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)] disabled:opacity-50 disabled:cursor-not-allowed'

// ── Composant ────────────────────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      to,
      href,
      newTab = false,
      isLoading = false,
      disabled,
      className = '',
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    const computedClass = [baseClasses, variantClasses[variant], sizeClasses[size], className]
      .filter(Boolean)
      .join(' ')

    const content = (
      <>
        {isLoading && (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
            aria-hidden="true"
          />
        )}
        {icon && !isLoading && <span className="mr-2 flex items-center">{icon}</span>}
        {children}
      </>
    )

    // Navigation interne — <Link> React Router
    if (to) {
      return (
        <Link to={to} className={computedClass}>
          {content}
        </Link>
      )
    }

    // Lien externe — <a>
    if (href) {
      return (
        <a
          href={href}
          className={computedClass}
          {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {content}
        </a>
      )
    }

    // Bouton natif (défaut)
    return (
      <button ref={ref} disabled={disabled || isLoading} className={computedClass} {...props}>
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'
export { Button }
