/**
 * ToastContext — Système de toasts globaux (notifications transitoires UI)
 *
 * ⚠️ À ne pas confondre avec le système de **notifications persistantes** (cloche, panel)
 *    qui vit dans `src/services/notificationService.ts` + `src/hooks/useNotifications.ts`.
 *
 * Fournit `toast.success()` et `toast.error()` pour afficher des messages éphémères
 * (4 secondes, coin supérieur droit) lors d'actions ponctuelles (sauvegarde, erreur, etc.).
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  /** Afficher un toast de succès */
  success: (title: string, description?: string) => void
  /** Afficher un toast d'erreur */
  error: (title: string, description?: string) => void
}

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
      setTimeout(() => remove(id), 4000)
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

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}

      {/* Toast container — coin supérieur droit */}
      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="Notifications"
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm animate-in slide-in-from-right-4 fade-in-0 duration-300 ${
                toast.type === 'success'
                  ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)]'
                  : 'bg-[var(--color-error-bg)] border-[var(--color-error)] text-[var(--color-error)]'
              }`}
            >
              {/* Icône */}
              <span className="text-base leading-none mt-0.5">
                {toast.type === 'success' ? '✓' : '✕'}
              </span>

              {/* Texte */}
              <div className="flex-1">
                <p className="font-semibold leading-tight">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 opacity-80 leading-tight">{toast.description}</p>
                )}
              </div>

              {/* Fermer */}
              <button
                onClick={() => remove(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
