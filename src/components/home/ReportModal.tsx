/**
 * ReportModal — Modale de signalement d'une publication
 *
 * Affiche un sélecteur de raison + boutons Annuler / Soumettre.
 * Après soumission : état de succès pendant 2s puis fermeture automatique.
 *
 * Design : modal centré avec backdrop sur desktop, bottom sheet sur mobile.
 *
 * TODO [BACKEND] — handleSubmit → POST /reports { postId, reason }
 *   via reportService.createReport({ postId, reason })
 *   Table concernée : `reports` (postId, reporterId, reason, status, createdAt)
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, CheckCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportModalProps {
  postId: string
  onClose: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ReportModal({ postId: _postId, onClose }: ReportModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const REASONS = [
    t('home.post.reportModal.reason1'),
    t('home.post.reportModal.reason2'),
    t('home.post.reportModal.reason3'),
    t('home.post.reportModal.reason4'),
    t('home.post.reportModal.reason5'),
  ]

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

  /**
   * Soumission du signalement
   * TODO [BACKEND] — reportService.createReport({ postId, reason })
   * POST /reports → 201 Created → afficher confirmation
   */
  function handleSubmit() {
    if (!reason) return
    // TODO [BACKEND] — reportService.createReport({ postId, reason }) → POST /reports
    setSubmitted(true)
    setTimeout(() => onClose(), 2000)
  }

  // ── Contenu partagé desktop/mobile ────────────────────────────────────────

  const modalContent = submitted ? (
    /* État succès */
    <div className="flex flex-col items-center gap-4 py-8 px-6 text-center">
      <CheckCircle className="size-12 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-bold text-foreground text-lg">
          {t('home.post.reportModal.successTitle')}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('home.post.reportModal.successDesc')}
        </p>
      </div>
    </div>
  ) : (
    /* Formulaire */
    <>
      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed">
        {t('home.post.reportModal.description')
          .split('*')
          .map((part, i) => (i === 1 ? <em key={i}>{part}</em> : part))}
      </p>

      {/* Select raison */}
      <div className="relative mt-4">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t('home.post.reportModal.placeholder')}
          className={[
            'w-full h-12 pl-4 pr-10 rounded-full border border-border bg-background text-base appearance-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            reason ? 'text-foreground' : 'text-muted-foreground',
          ].join(' ')}
        >
          <option value="" disabled>
            {t('home.post.reportModal.placeholder')}
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-11 rounded-button border border-border text-foreground font-semibold text-sm hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('home.post.reportModal.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason}
          className="flex-1 h-11 rounded-button bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('home.post.reportModal.submit')}
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
        onClick={submitted ? undefined : onClose}
      />

      {/* ── Desktop : modal centré ────────────────────────────────────────── */}
      <div className="hidden md:flex fixed inset-0 z-[80] items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.post.reportModal.title')}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {t('home.post.reportModal.title')}
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
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[80]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.post.reportModal.title')}
          className="bg-background rounded-t-2xl shadow-2xl px-5 pt-4 pb-8"
        >
          {/* Handle bar */}
          <div className="flex justify-center mb-4" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {t('home.post.reportModal.title')}
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
