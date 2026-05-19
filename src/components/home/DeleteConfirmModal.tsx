/**
 * DeleteConfirmModal — Confirmation de suppression d'une publication
 *
 * Affiche un avertissement irréversible avec Annuler / Confirmer (rouge).
 * Après confirmation : callback onConfirm puis fermeture.
 *
 * Design : modal centré sur desktop, bottom sheet sur mobile.
 *
 * TODO [BACKEND] — onConfirm → DELETE /posts/:id
 *   via postService.deletePost(postId)
 *   puis invalider le cache TanStack Query ['feed']
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  postId: string
  onClose: () => void
  /**
   * Appelé quand l'utilisateur confirme la suppression.
   * TODO [BACKEND] — connecter à postService.deletePost(postId)
   */
  onConfirm: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DeleteConfirmModal({ onClose, onConfirm }: DeleteConfirmModalProps) {
  const { t } = useTranslation()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Focus sur le bouton fermer à l'ouverture
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // ── Contenu partagé desktop/mobile ────────────────────────────────────────

  const modalContent = (
    <>
      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed">
        {t('home.post.deleteModal.description')}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
        {t('home.post.deleteModal.warning')}
      </p>

      {/*
        Actions — BATCH 87 : style DS aligne sur LogoutModal et le reste de l'app.
        Annuler : secondary (btn-press) / Confirmer : destructive flat avec --color-error-action
      */}
      <div className="flex flex-col gap-2.5 mt-6">
        <button
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="
            w-full h-12 px-6 rounded-full
            bg-[var(--color-error-action)] text-[var(--color-text-white)]
            font-bold text-base
            transition-all
            hover:opacity-90 active:scale-[0.98]
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[var(--color-error-action)] focus-visible:ring-offset-2
          "
        >
          {t('home.post.deleteModal.confirm')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="
            w-full h-12 px-6 rounded-full
            btn-press btn-press-secondary
            bg-transparent text-[var(--color-text-primary)]
            font-bold text-base
            transition-all
          "
        >
          {t('home.post.deleteModal.cancel')}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Backdrop plein écran */}
      <div
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : modal centré ────────────────────────────────────────── */}
      <div className="hidden md:flex fixed inset-0 z-[80] items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.post.deleteModal.title')}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {t('home.post.deleteModal.title')}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>
          {modalContent}
        </div>
      </div>

      {/* ── Mobile : bottom sheet ─────────────────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[80] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.post.deleteModal.title')}
          className="bg-background rounded-t-2xl shadow-2xl px-5 pt-4 pb-8"
        >
          {/* Handle bar */}
          <div className="flex justify-center mb-4" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {t('home.post.deleteModal.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>
          {modalContent}
        </div>
      </div>
    </>
  )
}
