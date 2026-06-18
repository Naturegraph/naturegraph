/**
 * OnboardingStep2 : Étape 2 : Fréquence d'exploration
 *
 * Sélection radio parmi 4 options de fréquence.
 * Layout identique à OnboardingInterests (730px min-height, 4 barres progression).
 *
 * Accessibilité :
 * - role="radiogroup" sur le groupe d'options
 * - aria-pressed sur chaque option (comportement toggle-button)
 * - Pas de <h5> dans <button> (heading invalide en phrasing context) → <span> stylisé
 * - aria-label sur le bouton retour (icône seule sur mobile)
 * - focus-visible ring sur toutes les interactions clavier
 * - prefers-reduced-motion respecté
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { SelectOption } from '@/components/ui/SelectOption'
import { OnboardingHeader } from './OnboardingHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options de fréquence d'exploration.
 * TODO [BACKEND] : Mapper ces valeurs aux paramètres de notifications Supabase :
 *   - 'daily'        → fréquence temps réel (notifications immédiates)
 *   - 'weekly'       → 1 digest par jour
 *   - 'monthly'      → 1 digest par semaine
 *   - 'occasionally' → aucune notification push (email uniquement, max 1/mois)
 *   Stocker dans `profiles.notification_frequency` (type ENUM côté DB).
 *   Appeler `supabase.from('notification_settings').upsert({ user_id, frequency })`
 *   après le choix, ou inclure dans l'upsert final du profil (étape 4).
 */
type FrequencyOption = 'daily' | 'weekly' | 'monthly' | 'occasionally'

interface OnboardingStep2Props {
  onNext: (frequency: FrequencyOption) => void
  onBack: () => void
  initialValue?: FrequencyOption
  onExit?: () => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function OnboardingStep2({ onNext, onBack, initialValue, onExit }: OnboardingStep2Props) {
  const { t } = useTranslation()
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyOption | null>(
    initialValue ?? null,
  )

  const options: FrequencyOption[] = ['daily', 'weekly', 'monthly', 'occasionally']

  return (
    <div className="flex flex-col overflow-clip w-full h-full">
      <div className="flex flex-col items-start p-6 md:p-8 gap-8 h-full min-h-[730px] max-h-screen">
        <OnboardingHeader current={2} total={4} onExit={onExit} />

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-[var(--color-text-primary)]">{t('onboarding.frequency.title')}</h3>
            <p className="text-[var(--color-text-secondary)]">
              {t('onboarding.frequency.description')}
            </p>
          </div>

          {/* Options de fréquence : role="radiogroup" pour grouper sémantiquement */}
          <div
            role="radiogroup"
            aria-label={t('onboarding.frequency.title')}
            className="flex flex-col gap-3 w-full shrink-0"
          >
            {options.map((option) => (
              <SelectOption
                key={option}
                mode="radio"
                selected={selectedFrequency === option}
                onClick={() => setSelectedFrequency(option)}
                label={t(`onboarding.frequency.options.${option}.title`)}
                description={t(`onboarding.frequency.options.${option}.description`)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 md:gap-4 w-full shrink-0">
          <BackButton onClick={onBack} label={t('onboarding.back')} />
          <Button
            variant="primary"
            onClick={() => selectedFrequency && onNext(selectedFrequency)}
            disabled={!selectedFrequency}
            className="flex-1"
          >
            {t('onboarding.continue')}
          </Button>
        </div>
      </div>
    </div>
  )
}
