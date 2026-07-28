/**
 * ReportModal : Modale de signalement d'une publication
 *
 * Affiche un sélecteur de raison + boutons Annuler / Soumettre.
 * Après soumission : POST sur la table `reports` puis état de succès 2s.
 *
 * Design : modal centré avec backdrop sur desktop, bottom sheet sur mobile.
 *
 * Backend : `reports` (migration 20260420). Voir second-agent/15.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle } from 'lucide-react'
import { createReport } from '@/services/reportService'
import { toSafeMessage } from '@/lib/sanitizeError'
import type { ReportReason } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportModalProps {
  postId: string
  /**
   * NG-049 : si renseigne, c'est l'ECHANGE qui est signale, pas la publication.
   * Le formulaire, les motifs et le retour restent identiques : signaler est le
   * meme geste, quelle que soit la cible.
   */
  commentId?: string
  onClose: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

/** Mapping option UI → valeur DB (enum reason) */
const REASON_OPTIONS: Array<{ value: ReportReason; labelKey: string }> = [
  { value: 'inappropriate_content', labelKey: 'home.post.reportModal.reason1' },
  { value: 'harassment', labelKey: 'home.post.reportModal.reason2' },
  { value: 'misinformation', labelKey: 'home.post.reportModal.reason3' },
  { value: 'spam', labelKey: 'home.post.reportModal.reason4' },
  { value: 'other', labelKey: 'home.post.reportModal.reason5' },
]

export function ReportModal({ postId, commentId, onClose }: ReportModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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

  /**
   * Soumission du signalement vers la table `reports` (Supabase).
   * En cas d'erreur : message visible, le bouton reste actif pour réessayer.
   */
  async function handleSubmit() {
    if (!reason || submitting) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await createReport(commentId ? { commentId, reason } : { postId, reason })
      setSubmitted(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      // Jamais de message technique brut (fuite schema) : toSafeMessage remonte
      // le detail seulement s'il est propre, sinon un libelle generique.
      console.error('[ReportModal] createReport failed', err)
      setErrorMsg(
        toSafeMessage(
          err,
          t('home.post.reportModal.errorGeneric', {
            defaultValue: 'Une erreur est survenue. Réessaie.',
          }),
        ),
      )
    } finally {
      setSubmitting(false)
    }
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

      {/*
        Liste de radios visible inline (Nicolas 2026-05-24) : remplace l'ancien
        dropdown custom dont le click-outside provoquait une race condition
        mobile qui empêchait la sélection. Les radio cards sont toujours
        visibles, plus fiables et plus accessibles.
      */}
      <fieldset
        className="mt-4 flex flex-col gap-2"
        aria-label={t('home.post.reportModal.placeholder')}
      >
        {REASON_OPTIONS.map((opt) => {
          const isSelected = opt.value === reason
          const id = `report-reason-${opt.value}`
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-colors',
                'focus-within:ring-2 focus-within:ring-primary',
                isSelected
                  ? 'bg-primary-light/60 border-primary text-foreground font-semibold'
                  : 'bg-background border-border text-foreground hover:bg-muted/30',
              ].join(' ')}
            >
              <input
                id={id}
                type="radio"
                name="report-reason"
                value={opt.value}
                checked={isSelected}
                onChange={() => setReason(opt.value)}
                className="sr-only"
              />
              {/* Indicateur radio personnalisé : cohérent avec le DS */}
              <span
                aria-hidden="true"
                className={[
                  'size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                  isSelected ? 'border-primary' : 'border-border',
                ].join(' ')}
              >
                {isSelected && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="text-sm flex-1">{t(opt.labelKey)}</span>
            </label>
          )
        })}
      </fieldset>

      {errorMsg && (
        <p role="alert" className="text-xs text-[var(--color-error)] mt-3">
          {errorMsg}
        </p>
      )}

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
          disabled={!reason || submitting}
          className="flex-1 h-11 rounded-button bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? t('home.post.reportModal.submitting', { defaultValue: 'Envoi…' })
            : t('home.post.reportModal.submit')}
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
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[80] pb-[env(safe-area-inset-bottom)]">
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
