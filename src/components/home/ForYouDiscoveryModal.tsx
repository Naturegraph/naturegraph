/**
 * ForYouDiscoveryModal — Modale d'invitation au compte (tab "Pour vous")
 * ========================================================================
 * S'affiche au clic sur le tab "Pour vous" pour un visiteur non connecté.
 * Présente la valeur de l'expérience personnalisée sans forcer l'inscription.
 *
 * Philosophie : proposer, jamais imposer.
 *   - CTA principal  : créer un compte → /signup
 *   - CTA secondaire : continuer sans personnalisation (ferme, reste sur Récent)
 *
 * Accessibilité :
 *   - role="dialog", aria-modal, aria-labelledby
 *   - Focus trap Tab / Shift+Tab
 *   - Escape ferme la modale
 *   - Focus initial sur le CTA principal
 */

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Props ────────────────────────────────────────────────────

interface ForYouDiscoveryModalProps {
  /** Contrôle la visibilité de la modale */
  isOpen: boolean
  /** Callback "Continuer sans personnalisation" — ferme sans rediriger */
  onContinue: () => void
}

// ─── Composant ───────────────────────────────────────────────

/**
 * Modale d'invitation à la création de compte via le tab "Pour vous".
 * Utilise les variants primary / secondary du composant Button du design system.
 *
 * @example
 * <ForYouDiscoveryModal isOpen={showModal} onContinue={handleContinue} />
 */
export function ForYouDiscoveryModal({ isOpen, onContinue }: ForYouDiscoveryModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryBtnRef = useRef<HTMLAnchorElement>(null)

  // ─── Focus initial + scroll lock ──────────────────────────
  useEffect(() => {
    if (!isOpen) return
    // Petit délai pour laisser le DOM se stabiliser avant le focus
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 50)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(id)
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // ─── Escape ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onContinue()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onContinue])

  // ─── Focus trap Tab / Shift+Tab ───────────────────────────
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a, button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  if (!isOpen) return null

  const keyPoints: string[] = [
    t('home.feed.forYouModal.point1'),
    t('home.feed.forYouModal.point2'),
    t('home.feed.forYouModal.point3'),
  ]

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
          WAI-ARIA 1.2 §6.5 : onKeyDown requis sur le container pour le focus trap */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="for-you-modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={[
          'relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5',
          'bg-[var(--color-bg-primary)] border border-[var(--color-border)]',
          'shadow-2xl',
        ].join(' ')}
      >
        {/* Bouton fermeture */}
        <button
          type="button"
          onClick={onContinue}
          aria-label={t('common.close')}
          className={[
            'absolute top-4 right-4 size-8 flex items-center justify-center rounded-full',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]',
            'transition-colors focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-action-default)]',
          ].join(' ')}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Titre */}
        <div className="flex flex-col items-center gap-2 text-center pr-4">
          <h2
            id="for-you-modal-title"
            className="font-bold text-lg leading-tight text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t('home.feed.forYouModal.title')}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {t('home.feed.forYouModal.description')}
          </p>
        </div>

        {/* Points clés */}
        <ul className="flex flex-col gap-2">
          {keyPoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {/* Puce colorée */}
              <span
                className="mt-1.5 size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--color-action-default)' }}
                aria-hidden="true"
              />
              {point}
            </li>
          ))}
        </ul>

        {/* CTAs — composants Button du design system */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            ref={primaryBtnRef as React.Ref<HTMLButtonElement>}
            variant="primary"
            size="sm"
            to="/signup"
            className="w-full"
          >
            {t('home.feed.forYouModal.createAccount')}
          </Button>

          <Button variant="secondary" size="sm" onClick={onContinue} className="w-full">
            {t('home.feed.forYouModal.continueDiscovery')}
          </Button>
        </div>
      </div>
    </div>
  )
}
