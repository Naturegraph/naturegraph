/**
 * EmptyState : Primitive d'état vide unifié
 * ============================================================================
 *
 * Standard pour "Aucun résultat", "Pas encore de contenu", etc.
 * Élimine les empty states ad-hoc dispersés dans les composants
 * (Feed, Profile, Notifications, Search, etc.).
 *
 * Usage :
 *
 * ```tsx
 * <EmptyState
 *   icon={<Inbox className="size-12" />}
 *   title={t('notifications.empty.title')}
 *   description={t('notifications.empty.description')}
 *   action={
 *     <Button onClick={onExplore}>{t('common.explore')}</Button>
 *   }
 * />
 * ```
 *
 * Refs : T-017 (MASTER_TODO) + QW-UX19 (QUICK_WINS) + PS-5 (AUDIT_DS)
 */

import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** Icône ou illustration (optionnel : recommandé pour clarté visuelle) */
  icon?: ReactNode
  /** Titre principal (court, impératif ou descriptif) */
  title: string
  /** Description complémentaire (1-2 phrases, optionnel) */
  description?: string
  /** Action CTA principale (bouton, lien, etc.) */
  action?: ReactNode
  /** Classes additionnelles (override conteneur) */
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="text-muted-foreground/60" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-md">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
