/**
 * OnboardingExitModal — Modal de confirmation de sortie d'onboarding
 *
 * 3 options : quitter vers l'accueil, aller au login, continuer l'onboarding.
 * Overlay avec backdrop blur, fermeture par ESC ou clic sur l'overlay.
 *
 * Accessibilité :
 * - Focus trap complet dans la modal (Tab/Shift+Tab)
 * - Focus déplacé sur le premier bouton à l'ouverture
 * - Focus restauré sur l'élément déclencheur à la fermeture
 * - Scroll body bloqué pendant l'ouverture
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { OnboardingButton } from './OnboardingButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingExitModalProps {
  isOpen: boolean
  onClose: () => void
  onGoHome: () => void
  onGoLogin: () => void
}

// ─── Sélecteur des éléments focusables dans la modal ─────────────────────────

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// ─── Composant ───────────────────────────────────────────────────────────────

export function OnboardingExitModal({
  isOpen,
  onClose,
  onGoHome,
  onGoLogin,
}: OnboardingExitModalProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  // Sauvegarde de l'élément focusé avant l'ouverture pour le restaurer à la fermeture
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Sauvegarder l'élément actif avant l'ouverture
    previousFocusRef.current = document.activeElement

    // Déplacer le focus sur le premier élément focusable de la modal
    const firstFocusable = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()

    // Bloquer le scroll du body
    document.body.style.overflow = 'hidden'

    // ESC : fermer la modal
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap : Tab / Shift+Tab cycle dans la modal uniquement
      if (e.key === 'Tab') {
        const focusable = Array.from(
          containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          // Shift+Tab : si on est sur le premier, aller au dernier
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          // Tab : si on est sur le dernier, aller au premier
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''

      // Restaurer le focus sur l'élément qui a déclenché la modal
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="dialog" est interactif en ARIA ; Escape géré par useEffect + onKeyDown */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      {/* Overlay semi-transparent avec flou */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Card modale — stopPropagation pour éviter la fermeture au clic interne */}
      {/* role="presentation" : conteneur décoratif, pas d'interaction propre */}
      <div
        ref={containerRef}
        className="relative bg-off-white rounded-card shadow-elevation-sm w-full max-w-md"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-6 p-6 md:p-8">
          {/* En-tête */}
          <div className="flex flex-col gap-3">
            <h3 id="exit-modal-title" className="text-foreground">
              {t('onboarding.exitModal.title')}
            </h3>
            <p className="text-text-dark">{t('onboarding.exitModal.description')}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <OnboardingButton variant="primary" onClick={onGoHome} className="w-full">
              {t('onboarding.exitModal.goHome')}
            </OnboardingButton>
            <OnboardingButton variant="secondary" onClick={onGoLogin} className="w-full">
              {t('onboarding.exitModal.goLogin')}
            </OnboardingButton>
            <OnboardingButton variant="ghost" onClick={onClose} className="w-full">
              {t('onboarding.exitModal.continue')}
            </OnboardingButton>
          </div>
        </div>
      </div>
    </div>
  )
}
