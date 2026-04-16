/**
 * LocationPermissionModal — Modale de demande d'autorisation géolocalisation
 * ===========================================================================
 * Affichée une seule fois par session (via useLocationCTA) aux utilisateurs
 * connectés non encore localisés.
 *
 * Value proposition claire :
 *   - Feed personnalisé dans un rayon de 75 km
 *   - Seule la ville est utilisée (jamais la position exacte)
 *
 * Accessibilité :
 *   - role="dialog", aria-modal="true", aria-labelledby
 *   - Focus trap : Tab et Shift+Tab restent dans la modale
 *   - Escape ferme la modale
 *   - Focus initial sur le CTA principal
 *
 * Design :
 *   - Overlay semi-transparent (var(--color-*) tokens uniquement)
 *   - Card centrée, responsive mobile
 *   - Fermeture au clic hors de la card
 */

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Shield, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

interface LocationPermissionModalProps {
  /** Contrôle la visibilité de la modale */
  isOpen: boolean
  /** Callback CTA "Activer la localisation" */
  onActivate: () => void
  /** Callback CTA "Plus tard" (ou Escape / clic overlay) */
  onSkip: () => void
}

// ─── Composant ───────────────────────────────────────────────

/**
 * Modale de permission géolocalisation — privacy-first.
 * Ne s'affiche jamais si isOpen === false.
 * Le parent (FeedSection via useLocationCTA) gère l'état d'ouverture.
 *
 * @example
 * <LocationPermissionModal
 *   isOpen={showModal}
 *   onActivate={handleActivate}
 *   onSkip={dismissModal}
 * />
 */
export function LocationPermissionModal({
  isOpen,
  onActivate,
  onSkip,
}: LocationPermissionModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const activateBtnRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // ─── Focus trap ────────────────────────────────────────────
  // Garde le focus dans la modale pendant qu'elle est ouverte.
  // À l'ouverture, focus sur le CTA principal (accessibilité WCAG 2.5).
  useEffect(() => {
    if (!isOpen) return

    // Focus initial sur le bouton CTA principal
    activateBtnRef.current?.focus()

    // Bloquer le scroll du body pendant l'ouverture
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // ─── Gestion Escape ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        onSkip()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onSkip])

  // Focus trap via Tab / Shift+Tab
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return

    // Tous les éléments focusables dans la modale
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

  return (
    /*
     * Overlay semi-transparent — aria-hidden car le dialog est le vrai point de focus.
     * Fermeture via Escape (useEffect) ou boutons "Plus tard" / croix.
     * Pas de onClick sur l'overlay : pattern ARIA dialog recommandé + évite
     * les fermetures accidentelles au tap mobile.
     */
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      {/* Card — dialog ARIA */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
          Le pattern ARIA dialog (WAI-ARIA 1.2 §6.5) requiert onKeyDown sur le container
          pour implémenter le focus trap (Tab/Shift+Tab). tabIndex=-1 le rend focusable. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={[
          'relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5',
          'bg-[var(--color-bg-primary)] border border-[var(--color-border)]',
          'shadow-2xl',
        ].join(' ')}
      >
        {/* Bouton fermeture (coin haut-droit) */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onSkip}
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

        {/* Icône + titre */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="size-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-action-light)' }}
            aria-hidden="true"
          >
            <MapPin size={24} style={{ color: 'var(--color-action-default)' }} />
          </div>

          <h2
            id="location-modal-title"
            className="font-bold text-lg leading-tight text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t('location.permissionModal.title')}
          </h2>
        </div>

        {/* Description valeur utilisateur */}
        <p className="text-sm text-[var(--color-text-secondary)] text-center leading-relaxed">
          {t('location.permissionModal.description')}
        </p>

        {/* Note privacy — mise en avant */}
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Shield
            size={14}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('location.permissionModal.privacyNote')}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          {/* CTA principal */}
          <button
            ref={activateBtnRef}
            type="button"
            onClick={onActivate}
            className={[
              'w-full h-11 rounded-lg font-semibold text-sm transition-opacity',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'focus-visible:ring-[var(--color-action-default)]',
            ].join(' ')}
            style={{
              backgroundColor: 'var(--color-action-default)',
              color: 'var(--color-bg-primary)',
            }}
          >
            {t('location.permissionModal.activateCta')}
          </button>

          {/* CTA secondaire */}
          <button
            type="button"
            onClick={onSkip}
            className={[
              'w-full h-11 rounded-lg font-medium text-sm transition-colors',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-action-default)]',
            ].join(' ')}
          >
            {t('location.permissionModal.skipCta')}
          </button>
        </div>
      </div>
    </div>
  )
}
