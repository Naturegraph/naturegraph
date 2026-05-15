/**
 * ToastContext — Systeme de toasts globaux (notifications transitoires UI)
 *
 * BATCH 63 (Nicolas decision 2026-05-15) : refonte design moderne style Sonner.
 *   - Fond cream uniforme (--color-bg-primary) avec border subtile
 *   - Icon dans cercle de couleur (success/error/warning/info)
 *   - Title primary + description secondary
 *   - Bouton close discret avec hover
 *   - Animation slide-in droite + progress bar d'auto-dismiss
 *   - Variants etendus : success, error, warning, info
 *
 * Cohereence DS : utilise uniquement les tokens --color-* du theme.
 * Pas de couleurs en dur.
 *
 * A ne pas confondre avec le systeme de **notifications persistantes**
 * (cloche, panel) qui vit dans `src/services/notificationService.ts`.
 *
 * Usage :
 *   const toast = useToast()
 *   toast.success('Inscrit a la waitlist !')
 *   toast.error('Email invalide', 'Format attendu : nom@domaine.com')
 *   toast.warning('Quota beta presque atteint')
 *   toast.info('Une nouvelle version est disponible')
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  /** Toast de succes (vert) */
  success: (title: string, description?: string) => void
  /** Toast d'erreur (rouge) */
  error: (title: string, description?: string) => void
  /** Toast d'avertissement (orange) */
  warning: (title: string, description?: string) => void
  /** Toast d'information (bleu) */
  info: (title: string, description?: string) => void
}

// ─── Mapping variant -> styles + icon ──────────────────────────────────────

/**
 * Style par variant (BATCH 63).
 * - `iconBg` : couleur de fond du cercle icon (utilise les -bg tokens)
 * - `iconColor` : couleur du svg lucide
 * - `progressColor` : couleur de la barre de progression auto-dismiss
 */
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

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  /** Supprimer un toast par id */
  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /** Ajouter un toast avec auto-dismiss */
  const add = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, type, title, description }])
      window.setTimeout(() => remove(id), AUTO_DISMISS_MS)
    },
    [remove],
  )

  const success = useCallback(
    (title: string, description?: string) => add('success', title, description),
    [add],
  )
  const error = useCallback(
    (title: string, description?: string) => add('error', title, description),
    [add],
  )
  const warning = useCallback(
    (title: string, description?: string) => add('warning', title, description),
    [add],
  )
  const info = useCallback(
    (title: string, description?: string) => add('info', title, description),
    [add],
  )

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}

      {/* Container toasts — coin superieur droit, z-index max */}
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

// ─── Item ────────────────────────────────────────────────────────────────────

/**
 * Carte toast individuelle.
 * Extrait en composant separe pour permettre de futures animations exit
 * (framer-motion) sans complexifier le Provider.
 */
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
      {/* Icon dans cercle colore */}
      <div className={`shrink-0 size-9 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className={`size-5 ${iconColor}`} aria-hidden="true" strokeWidth={2.5} />
      </div>

      {/* Texte */}
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

      {/* Bouton close discret */}
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

      {/* Progress bar d'auto-dismiss en bas */}
      <div
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[3px] ${progressColor} opacity-70 motion-safe:animate-toast-progress`}
        style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
      />
    </div>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
