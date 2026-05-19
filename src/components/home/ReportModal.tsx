/**
 * ReportModal — Modale de signalement d'une publication
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
import { X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { createReport } from '@/services/reportService'
import type { ReportReason } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportModalProps {
  postId: string
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

export function ReportModal({ postId, onClose }: ReportModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = reason ? t(REASON_OPTIONS.find((o) => o.value === reason)!.labelKey) : ''

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

  // Click extérieur ferme le dropdown des raisons
  useEffect(() => {
    if (!dropdownOpen) return
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const id = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', fn)
    }
  }, [dropdownOpen])

  /**
   * Soumission du signalement vers la table `reports` (Supabase).
   * En cas d'erreur : message visible, le bouton reste actif pour réessayer.
   */
  async function handleSubmit() {
    if (!reason || submitting) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await createReport({ postId, reason })
      setSubmitted(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t('home.post.reportModal.errorGeneric', {
              defaultValue: 'Une erreur est survenue. Réessaie.',
            }),
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
        Dropdown custom (second-agent/15) — Figma mobile 6385:91998 :
        liste s'ouvre AU-DESSUS du toggle, fond bg-primary-light/40 quand sélectionné,
        item actif dans la liste avec bg-primary-light + text-primary.
        Le <select> natif ne supporte pas ce styling — d'où le custom.
      */}
      <div className="relative mt-4" ref={dropdownRef}>
        {/* Liste — overlay au-dessus */}
        {dropdownOpen && (
          <div
            role="listbox"
            aria-label={t('home.post.reportModal.placeholder')}
            className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-2xl shadow-lg overflow-hidden z-10"
          >
            {REASON_OPTIONS.map((opt) => {
              const isSelected = opt.value === reason
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setReason(opt.value)
                    setDropdownOpen(false)
                  }}
                  className={[
                    'w-full text-left px-4 py-3 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    isSelected
                      ? 'bg-primary-light text-primary font-semibold'
                      : 'text-foreground hover:bg-muted/40',
                  ].join(' ')}
                >
                  {t(opt.labelKey)}
                </button>
              )
            })}
          </div>
        )}

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          className={[
            'w-full h-12 flex items-center justify-between gap-2 pl-4 pr-3 rounded-full border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            reason
              ? 'bg-primary-light/40 border-primary/30 text-foreground'
              : 'bg-background border-border text-muted-foreground hover:bg-muted/30',
          ].join(' ')}
        >
          <span className="truncate text-sm">
            {selectedLabel || t('home.post.reportModal.placeholder')}
          </span>
          {dropdownOpen ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>

      {errorMsg && (
        <p role="alert" className="text-xs text-red-600 mt-3">
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
