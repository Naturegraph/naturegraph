/**
 * LoadingState — Primitive d'état de chargement unifié
 * ============================================================================
 *
 * Standard pour les états de chargement, avec 2 variantes :
 * - 'spinner' : icône qui tourne (compact, action ponctuelle)
 * - 'skeleton' : squelette du contenu (plus moderne, feed/listes)
 *
 * Usage :
 *
 * ```tsx
 * // Variante spinner (default)
 * <LoadingState label={t('common.loading')} />
 *
 * // Variante skeleton (rangées personnalisables)
 * <LoadingState variant="skeleton" rows={5} />
 * ```
 *
 * A11Y : role="status" + aria-live="polite" + aria-label (annoncé).
 *
 * Refs : T-019 (MASTER_TODO) + QW-UX19 (QUICK_WINS) + PS-5 (AUDIT_DS)
 */

export interface LoadingStateProps {
  /** Variante d'affichage. Default 'spinner'. */
  variant?: 'spinner' | 'skeleton'
  /** Label aria pour les lecteurs d'écran (défaut : 'Chargement') */
  label?: string
  /** Nombre de lignes skeleton (variant='skeleton' seulement). Default 3. */
  rows?: number
  /** Classes additionnelles */
  className?: string
}

export function LoadingState({
  variant = 'spinner',
  label = 'Chargement',
  rows = 3,
  className = '',
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div
        className={`flex flex-col gap-3 px-6 py-4 ${className}`}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-1/2" />
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  // Default spinner
  return (
    <div
      className={`flex items-center justify-center px-6 py-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="size-6 border-2 border-primary border-t-transparent rounded-full motion-safe:animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
