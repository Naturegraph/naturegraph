/**
 * OnboardingStep3 : Étape 3 : Motivations
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
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { OnboardingHeader } from './OnboardingHeader'

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
        <OnboardingHeader current={3} total={4} onExit={onExit} />

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-[var(--color-text-primary)]">
              {t('onboarding.motivations.title')}
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              {t('onboarding.motivations.description')}
            </p>
          </div>

          {/* Options motivations : role="group" pour regrouper sémantiquement */}
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
                    'relative w-full rounded-full transition-all text-left',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-[var(--color-action-default)]/10 border border-[var(--color-action-default)]'
                      : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-text-primary)]/20',
                  ].join(' ')}
                >
                  <div className="flex gap-2 md:gap-3 h-[52px] items-center px-5 md:px-6 w-full">
                    {/* Checkbox visuelle : décorative (aria-pressed porte l'état) */}
                    <div
                      aria-hidden="true"
                      className={`flex items-center justify-center rounded-sm shrink-0 size-5 ${
                        isSelected
                          ? 'bg-[var(--color-action-default)]'
                          : 'bg-[var(--color-bg-primary)] border-[1.5px] border-[var(--color-border)]'
                      }`}
                    >
                      {isSelected && (
                        <Check className="size-4 text-[var(--color-text-white)]" strokeWidth={3} />
                      )}
                    </div>

                    {/*
                     * <span> au lieu de <p> : <p> est du flow content et est techniquement
                     * invalide dans <button> (qui accepte uniquement du phrasing content).
                     */}
                    <span
                      className={`font-bold ${isSelected ? 'text-[var(--color-link)]' : 'text-[var(--color-text-primary)]'}`}
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
          <BackButton onClick={onBack} label={t('onboarding.back')} />
          <Button
            variant="primary"
            onClick={() => onContinue(selectedMotivations)}
            className="flex-1"
          >
            {t('onboarding.continue')}
          </Button>
        </div>
      </div>
    </div>
  )
}
