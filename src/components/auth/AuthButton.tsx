/**
 * AuthButton — Bouton pour les formulaires d'authentification
 * Variante primary : fond violet, pill shape
 * Variante secondary : fond transparent, bordure subtile
 */

interface AuthButtonProps {
  type?: 'submit' | 'button' | 'reset'
  variant?: 'primary' | 'secondary'
  isLoading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function AuthButton({
  type = 'button',
  variant = 'primary',
  isLoading,
  disabled,
  onClick,
  children,
  className = '',
}: AuthButtonProps) {
  const base =
    'w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:opacity-90 active:opacity-80',
    secondary:
      'bg-[var(--color-action-light)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] active:opacity-80',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {isLoading && (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
