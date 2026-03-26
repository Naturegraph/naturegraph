/**
 * OnboardingStep2 — Étape 2 : Fréquence d'exploration
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
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OnboardingButton } from './OnboardingButton'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options de fréquence d'exploration.
 * TODO [BACKEND] — Mapper ces valeurs aux paramètres de notifications Supabase :
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
        {/* Header : badge + étape + progression */}
        <div className="flex flex-col gap-3 w-full shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="bg-teal-dark flex h-8 items-center justify-center px-3 rounded-button shrink-0">
              <p className="text-text-light text-sm">{t('onboarding.categories.profile')}</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <p className="text-text-dark" aria-hidden="true">
                {t('onboarding.stepLabel')} 2/4
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

          {/* Barre de progression 2/4 */}
          <div
            role="progressbar"
            aria-valuenow={2}
            aria-valuemax={4}
            aria-valuetext={t('onboarding.progressLabel', { current: 2, total: 4 })}
            className="flex gap-1 w-full"
          >
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-foreground">{t('onboarding.frequency.title')}</h3>
            <p className="text-text-dark">{t('onboarding.frequency.description')}</p>
          </div>

          {/* Options de fréquence — role="radiogroup" pour grouper sémantiquement */}
          <div
            role="radiogroup"
            aria-label={t('onboarding.frequency.title')}
            className="flex flex-col gap-3 w-full shrink-0"
          >
            {options.map((option) => {
              const isSelected = selectedFrequency === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedFrequency(option)}
                  aria-pressed={isSelected}
                  className={[
                    'relative w-full rounded-card p-6 border text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-primary-light border-primary'
                      : 'bg-transparent border-border hover:border-foreground/20',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 w-full">
                    {/* Titre + indicateur radio custom */}
                    <div className="flex items-center justify-between w-full">
                      {/*
                       * <span> stylisé au lieu de <h5> : les headings (h1-h6) sont
                       * du flow content et ne peuvent pas être placés dans un <button>
                       * (qui accepte uniquement du phrasing content, spec HTML5).
                       */}
                      <span
                        className={`font-bold leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}
                        style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: 'var(--text-h5)',
                        }}
                      >
                        {t(`onboarding.frequency.options.${option}.title`)}
                      </span>

                      {/* Indicateur radio custom — décoratif (aria-pressed porte l'état) */}
                      <div
                        aria-hidden="true"
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary' : 'bg-off-white border-[1.5px] border-border'
                        }`}
                      >
                        {isSelected && <div className="w-3 h-3 rounded-full bg-off-white" />}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-text-dark">
                      {t(`onboarding.frequency.options.${option}.description`)}
                    </p>
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
            {/* Texte visible sur desktop, masqué sur mobile (aria-label compense) */}
            <span className="hidden md:inline text-foreground">{t('onboarding.back')}</span>
          </button>
          <OnboardingButton
            variant="primary"
            onClick={() => selectedFrequency && onNext(selectedFrequency)}
            disabled={!selectedFrequency}
            className="flex-1"
          >
            {t('onboarding.continue')}
          </OnboardingButton>
        </div>
      </div>
    </div>
  )
}
