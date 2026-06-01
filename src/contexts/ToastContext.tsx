/**
 * ToastContext - Systeme de toasts globaux (notifications transitoires UI)
 *
 * BATCH 63 + V1.1.4 NG-004 Phase 1 :
 *   - 4 variants : success / error / warning / info
 *   - Options : description + persistent (clic pour fermer, pas d auto-dismiss)
 *   - Persistent = obligatoire pour erreurs reseau / submit (sinon l user
 *     manque l info et croit que ca a marche). Toast.error par defaut reste
 *     auto-dismiss 4.5s, le caller decide via { persistent: true }.
 *   - Cohereence DS : uniquement tokens --color-* du theme.
 *
 * A ne pas confondre avec les notifications persistantes en cloche
 * (`src/services/notificationService.ts`).
 *
 * Usage :
 *   const toast = useToast()
 *   toast.success('Inscrit a la waitlist !')
 *   toast.error('Email invalide', 'Format attendu : nom@domaine.com')
 *   toast.error('Reseau indisponible', 'Verifie ta connexion', { persistent: true })
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

// --- Types ----------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  /** Si true, le toast reste a l ecran jusqu au clic sur la croix (pas d auto-dismiss).
   *  V1.1.4 NG-004 : a utiliser sur les erreurs reseau / submit critiques. */
  persistent?: boolean
}

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  persistent?: boolean
}

interface ToastContextValue {
  /** Toast de succes (vert) */
  success: (title: string, description?: string, options?: ToastOptions) => void
  /** Toast d'erreur (rouge) */
  error: (title: string, description?: string, options?: ToastOptions) => void
  /** Toast d'avertissement (orange) */
  warning: (title: string, description?: string, options?: ToastOptions) => void
  /** Toast d'information (bleu) */
  info: (title: string, description?: string, options?: ToastOptions) => void
}

// --- Mapping variant -> styles + icon -------------------------------------

const VARIANT_CONFIG: Record<
  ToastType,
  {
    Icon: typeof CheckCircle2
    iconBg: string
    iconColor: string
    progressColor: string
    ariaLive: 'polite' | 'assertive'
  }
> = {
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-[var(--color-success-bg)]',
    iconColor: 'text-[var(--color-success)]',
    progressColor: 'bg-[var(--color-success)]',
    ariaLive: 'polite',
  },
  error: {
    Icon: AlertCircle,
    iconBg: 'bg-[var(--color-error-bg)]',
    iconColor: 'text-[var(--color-error)]',
    progressColor: 'bg-[var(--color-error)]',
    ariaLive: 'assertive',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-[var(--color-warning-bg)]',
    iconColor: 'text-[var(--color-warning)]',
    progressColor: 'bg-[var(--color-warning)]',
    ariaLive: 'polite',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-[var(--color-info-bg)]',
    iconColor: 'text-[var(--color-info)]',
    progressColor: 'bg-[var(--color-info)]',
    ariaLive: 'polite',
  },
}

const AUTO_DISMISS_MS = 4500

// --- Context --------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null)

// --- Provider -------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (type: ToastType, title: string, description?: string, options?: ToastOptions) => {
      const id = Math.random().toString(36).slice(2)
      const persistent = !!options?.persistent
      setToasts((prev) => [...prev, { id, type, title, description, persistent }])
      // Auto-dismiss seulement si pas persistent (V1.1.4 NG-004 Phase 1).
      if (!persistent) {
        window.setTimeout(() => remove(id), AUTO_DISMISS_MS)
      }
    },
    [remove],
  )

  const success = useCallback(
    (title: string, description?: string, options?: ToastOptions) =>
      add('success', title, description, options),
    [add],
  )
  const error = useCallback(
    (title: string, description?: string, options?: ToastOptions) =>
      add('error', title, description, options),
    [add],
  )
  const warning = useCallback(
    (title: string, description?: string, options?: ToastOptions) =>
      add('warning', title, description, options),
    [add],
  )
  const info = useCallback(
    (title: string, description?: string, options?: ToastOptions) =>
      add('info', title, description, options),
    [add],
  )

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}

      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="Notifications"
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-[380px] w-[calc(100%-2rem)] pointer-events-none"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// --- Item -----------------------------------------------------------------

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { Icon, iconBg, iconColor, progressColor, ariaLive } = VARIANT_CONFIG[toast.type]

  return (
    <div
      role="alert"
      aria-live={ariaLive}
      className="
        pointer-events-auto
        flex items-start gap-3 p-4
        bg-[var(--color-bg-primary)]
        border border-[var(--color-border)]
        rounded-2xl
        shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)]
        relative overflow-hidden
        motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in-0 motion-safe:duration-300
      "
    >
      <div className={`shrink-0 size-9 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className={`size-5 ${iconColor}`} aria-hidden="true" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-semibold text-sm leading-snug text-[var(--color-text-primary)]">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-1 text-xs leading-snug text-[var(--color-text-secondary)]">
            {toast.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="
          shrink-0 size-6 rounded-full
          flex items-center justify-center
          text-[var(--color-text-secondary)]
          hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]
          transition-colors
        "
        aria-label="Fermer la notification"
      >
        <X size={14} aria-hidden="true" />
      </button>

      {/* Progress bar auto-dismiss masquee si persistent (V1.1.4 NG-004 Phase 1) */}
      {!toast.persistent && (
        <div
          aria-hidden="true"
          className={`absolute bottom-0 left-0 h-[3px] ${progressColor} opacity-70 motion-safe:animate-toast-progress`}
          style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
        />
      )}
    </div>
  )
}

// --- Hook -----------------------------------------------------------------

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
