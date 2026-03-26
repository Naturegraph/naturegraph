/**
 * OnboardingInterests — Étape 1 : Centres d'intérêt
 *
 * Multi-select de 9 catégories de biodiversité.
 * Emojis centralisés depuis CATEGORY_EMOJIS (source de vérité).
 *
 * Accessibilité :
 * - aria-pressed sur chaque bouton catégorie
 * - aria-hidden sur les emojis (décoratifs)
 * - role="progressbar" sur la barre de progression
 * - focus-visible ring sur les cartes
 * - prefers-reduced-motion respecté (via OnboardingButton)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import { OnboardingButton } from './OnboardingButton'

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Nombre maximum de centres d'intérêt sélectionnables.
 * Spec : max 3, bloque la sélection d'un 4e.
 * TODO [BACKEND] — Ce max sera validé côté serveur lors du upsert profil.
 */
const MAX_INTERESTS = 3

// ─── Données ─────────────────────────────────────────────────────────────────

const INTERESTS = [
  { id: 'birds', emoji: CATEGORY_EMOJIS.birds },
  { id: 'mammals', emoji: CATEGORY_EMOJIS.mammals },
  { id: 'insects', emoji: CATEGORY_EMOJIS.insects },
  { id: 'reptiles', emoji: CATEGORY_EMOJIS.reptiles },
  { id: 'amphibians', emoji: CATEGORY_EMOJIS.amphibians },
  { id: 'arachnids', emoji: CATEGORY_EMOJIS.arachnids },
  { id: 'mollusks', emoji: CATEGORY_EMOJIS.mollusks },
  { id: 'fish', emoji: CATEGORY_EMOJIS.fish },
  { id: 'plants', emoji: CATEGORY_EMOJIS.plants },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingInterestsProps {
  onContinue: (selectedInterests: string[]) => void
  onSkip: () => void
  onExit?: () => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function OnboardingInterests({ onContinue, onSkip, onExit }: OnboardingInterestsProps) {
  const { t } = useTranslation()
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  function toggleInterest(id: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      // Bloque la sélection d'un 4e centre d'intérêt
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, id]
    })
  }

  /** true si le max est atteint et que la carte n'est pas sélectionnée */
  const isAtMax = selectedInterests.length >= MAX_INTERESTS

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
                {t('onboarding.stepLabel')} 1/4
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

          {/* Barre de progression 1/4 avec rôle ARIA */}
          <div
            role="progressbar"
            aria-valuenow={1}
            aria-valuemax={4}
            aria-valuetext={t('onboarding.progressLabel', { current: 1, total: 4 })}
            className="flex gap-1 w-full"
          >
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
            <div className="flex-1 h-[6px] bg-border rounded-button" />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-foreground">{t('onboarding.interests.title')}</h3>
            <p className="text-text-dark">{t('onboarding.interests.description')}</p>
          </div>

          {/* Compteur de sélection — visible dès qu'au moins 1 centre d'intérêt est sélectionné */}
          {selectedInterests.length > 0 && (
            <p className="text-sm text-text-dark shrink-0" aria-live="polite">
              {t('onboarding.interests.counter', {
                count: selectedInterests.length,
                max: MAX_INTERESTS,
              })}
            </p>
          )}

          {/* Grille des catégories */}
          <div className="flex flex-wrap gap-2 items-start w-full shrink-0">
            {INTERESTS.map(({ id, emoji }) => {
              const isSelected = selectedInterests.includes(id)
              /** Carte désactivée : max atteint et non sélectionnée */
              const isDisabled = isAtMax && !isSelected
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleInterest(id)}
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  className={[
                    'flex flex-col gap-2 items-center justify-center p-4 rounded-xl h-24',
                    'w-[calc(50%-4px)] md:w-[calc(33.333%-5.333px)]',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isDisabled
                      ? 'bg-transparent border border-border opacity-40 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary-light border-2 border-primary motion-safe:hover:shadow-md motion-safe:active:scale-95'
                        : 'bg-transparent border border-border motion-safe:hover:shadow-md motion-safe:active:scale-95',
                  ].join(' ')}
                >
                  {/* Emoji décoratif — masqué aux lecteurs d'écran */}
                  <span className="text-2xl" aria-hidden="true">
                    {emoji}
                  </span>
                  <span className={isSelected ? 'text-primary' : 'text-foreground'}>
                    {t(`onboarding.interests.categories.${id}`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 md:gap-4 w-full shrink-0">
          <OnboardingButton variant="secondary" onClick={onSkip} className="flex-1">
            {t('onboarding.interests.skip')}
          </OnboardingButton>
          <OnboardingButton
            variant="primary"
            onClick={() => onContinue(selectedInterests)}
            className="flex-1"
          >
            {t('onboarding.interests.continue')}
          </OnboardingButton>
        </div>
      </div>
    </div>
  )
}
