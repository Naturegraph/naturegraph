/**
 * OnboardingStep3 — Étape 3 : Motivations
 *
 * Multi-select de 4 motivations (checkboxes custom).
 * Layout identique aux étapes précédentes (730px min-height).
 *
 * Accessibilité :
 * - aria-pressed sur chaque option toggle-button
 * - role="group" sur le groupe de motivations
 * - <span> au lieu de <p> dans les boutons (phrasing content dans button)
 * - aria-label sur le bouton retour (icône seule sur mobile)
 * - focus-visible ring sur toutes les interactions clavier
 * - prefers-reduced-motion respecté
 */

import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OnboardingButton } from './OnboardingButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type MotivationKey = 'learn' | 'share' | 'community' | 'identify'

interface OnboardingStep3Props {
  onContinue: (motivations: string[]) => void
  onBack: () => void
  initialMotivations?: string[]
  onExit?: () => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function OnboardingStep3({
  onContinue,
  onBack,
  initialMotivations = [],
  onExit,
}: OnboardingStep3Props) {
  const { t } = useTranslation()
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>(initialMotivations)

  const motivationKeys: MotivationKey[] = ['learn', 'share', 'community', 'identify']

  function toggleMotivation(key: string) {
    setSelectedMotivations((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    )
  }

  return (
    <div className="flex flex-col overflow-clip w-full h-full">
      <div className="flex flex-col items-start p-6 md:p-8 gap-8 h-full min-h-[730px] max-h-screen">
        {/* Header : badge + étape + progression */}
        <div className="flex flex-col gap-3 w-full shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="bg-teal-dark flex h-8 items-center justify-center px-3 rounded-button shrink-0">
              <p className="text-text-light text-sm">{t('onboarding.categories.profile')}</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <p className="text-text-dark" aria-hidden="true">
                {t('onboarding.stepLabel')} 3/4
              </p>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  aria-label={t('onboarding.exitButtonLabel')}
                  className="bg-[#f0f0f5] flex items-center justify-center rounded-full shrink-0 size-8 hover:bg-[#e0e0eb] transition-colors motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="#090F0D"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Barre de progression 3/4 */}
          <div
            role="progressbar"
            aria-valuenow={3}
            aria-valuemax={4}
            aria-valuetext={t('onboarding.progressLabel', { current: 3, total: 4 })}
            className="flex gap-1 w-full"
          >
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-foreground">{t('onboarding.motivations.title')}</h3>
            <p className="text-text-dark">{t('onboarding.motivations.description')}</p>
          </div>

          {/* Options motivations — role="group" pour regrouper sémantiquement */}
          <div
            role="group"
            aria-label={t('onboarding.motivations.title')}
            className="flex flex-col gap-4 w-full shrink-0"
          >
            {motivationKeys.map((key) => {
              const isSelected = selectedMotivations.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMotivation(key)}
                  aria-pressed={isSelected}
                  className={[
                    'relative w-full rounded-button transition-all text-left',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-off-white border border-border hover:border-foreground/20',
                  ].join(' ')}
                >
                  <div className="flex gap-2 md:gap-3 h-[52px] items-center px-5 md:px-6 w-full">
                    {/* Checkbox visuelle — décorative (aria-pressed porte l'état) */}
                    <div
                      aria-hidden="true"
                      className={`flex items-center justify-center rounded-sm shrink-0 size-5 ${
                        isSelected ? 'bg-primary' : 'bg-off-white border-[1.5px] border-border'
                      }`}
                    >
                      {isSelected && (
                        <Check className="size-4 text-primary-foreground" strokeWidth={3} />
                      )}
                    </div>

                    {/*
                     * <span> au lieu de <p> : <p> est du flow content et est techniquement
                     * invalide dans <button> (qui accepte uniquement du phrasing content).
                     */}
                    <span
                      className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}
                    >
                      {t(`onboarding.motivations.options.${key}`)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 md:gap-4 w-full shrink-0">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('onboarding.back')}
            className="flex items-center justify-center gap-3 h-12 px-6 bg-off-white border border-border rounded-button hover:border-foreground/40 transition-all motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
            <span className="hidden md:inline text-foreground">{t('onboarding.back')}</span>
          </button>
          <OnboardingButton
            variant="primary"
            onClick={() => onContinue(selectedMotivations)}
            className="flex-1"
          >
            {t('onboarding.continue')}
          </OnboardingButton>
        </div>
      </div>
    </div>
  )
}
