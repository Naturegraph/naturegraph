/**
 * OnboardingHeader : Header partagé du flow d'onboarding
 * ========================================================
 * Regroupe le pattern dupliqué dans les 4 étapes :
 *   - badge catégorie (gauche)
 *   - compteur "Étape X/Y" + bouton de sortie (droite)
 *   - StepIndicator (barre de progression)
 *
 * A11y :
 *  - Le compteur textuel est aria-hidden (redondant avec aria-valuetext du progressbar).
 *  - Le bouton exit a un aria-label explicite (icône seule).
 */

import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { StepIndicator } from '@/components/ui/StepIndicator'

export interface OnboardingHeaderProps {
  /** Étape courante (1-based) */
  current: number
  /** Nombre total d'étapes */
  total: number
  /** Clé i18n du label de catégorie : défaut: 'onboarding.categories.profile' */
  categoryKey?: string
  /** Callback du bouton de sortie. Si absent, le bouton n'est pas rendu. */
  onExit?: () => void
}

export function OnboardingHeader({
  current,
  total,
  categoryKey = 'onboarding.categories.profile',
  onExit,
}: OnboardingHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 w-full shrink-0">
      <div className="flex items-center justify-between w-full">
        {/* Badge catégorie */}
        <div className="bg-[var(--color-highlight-primary)] flex h-8 items-center justify-center px-3 rounded-full shrink-0">
          <p className="text-text-light text-sm">{t(categoryKey)}</p>
        </div>

        {/* Compteur + exit */}
        <div className="flex items-center gap-2 md:gap-3">
          <p className="text-[var(--color-text-secondary)]" aria-hidden="true">
            {t('onboarding.stepLabel')} {current}/{total}
          </p>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label={t('onboarding.exitButtonLabel')}
              className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] flex items-center justify-center rounded-full shrink-0 size-8 hover:bg-[var(--color-bg-tertiary)] transition-colors motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2"
            >
              <X className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <StepIndicator
        current={current}
        total={total}
        ariaLabel={t('onboarding.progressLabel', { current, total })}
      />
    </div>
  )
}
