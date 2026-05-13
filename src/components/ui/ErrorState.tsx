/**
 * ErrorState — Primitive d'état d'erreur unifié
 * ============================================================================
 *
 * Standard pour "Une erreur est survenue", "Connexion perdue", etc.
 * Toujours avec un bouton "Réessayer" pour donner du contrôle à l'utilisateur.
 *
 * Usage :
 *
 * ```tsx
 * <ErrorState
 *   title={t('feed.error.title')}
 *   description={t('feed.error.description')}
 *   onRetry={refetch}
 *   retryLabel={t('common.retry')}
 * />
 * ```
 *
 * A11Y : role="alert" + aria-live="assertive" pour annonces lecteurs d'écran.
 *
 * Refs : T-018 (MASTER_TODO) + QW-UX19 (QUICK_WINS) + PS-5 (AUDIT_DS)
 */

import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

export interface ErrorStateProps {
  /** Icône custom (défaut : AlertCircle rouge) */
  icon?: ReactNode
  /** Titre principal (court, factuel) */
  title: string
  /** Description complémentaire (optionnel) */
  description?: string
  /** Handler pour le bouton "Réessayer" */
  onRetry?: () => void
  /** Label du bouton retry (i18n recommandé) */
  retryLabel?: string
  /** Action additionnelle (lien support, etc.) */
  secondaryAction?: ReactNode
  /** Classes additionnelles */
  className?: string
}

export function ErrorState({
  icon,
  title,
  description,
  onRetry,
  retryLabel = 'Réessayer',
  secondaryAction,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 gap-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="text-[var(--color-error,#dc2626)]" aria-hidden="true">
        {icon ?? <AlertCircle className="size-12" strokeWidth={1.5} />}
      </div>
      <div className="flex flex-col gap-1.5 max-w-md">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(onRetry || secondaryAction) && (
        <div className="mt-2 flex gap-3 items-center">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {retryLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
