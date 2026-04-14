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
 * - prefers-reduced-motion respecté (via Button partagé)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import { Button } from '@/components/ui/Button'
import { OnboardingHeader } from './OnboardingHeader'

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
        <OnboardingHeader current={1} total={4} onExit={onExit} />

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-[var(--color-text-primary)]">{t('onboarding.interests.title')}</h3>
            <p className="text-[var(--color-text-secondary)]">
              {t('onboarding.interests.description')}
            </p>
          </div>

          {/* Compteur de sélection — visible dès qu'au moins 1 centre d'intérêt est sélectionné */}
          {selectedInterests.length > 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] shrink-0" aria-live="polite">
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
              /** Numéro d'ordre de sélection (1, 2, 3) — null si non sélectionné */
              const selectionOrder = isSelected ? selectedInterests.indexOf(id) + 1 : null
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
                    'relative flex flex-col gap-2 items-center justify-center p-4 rounded-xl h-24',
                    'w-[calc(50%-4px)] md:w-[calc(33.333%-5.333px)]',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2',
                    isDisabled
                      ? 'bg-transparent border border-[var(--color-border)] opacity-40 cursor-not-allowed'
                      : isSelected
                        ? 'bg-[var(--color-action-light)] border-2 border-[var(--color-action-default)] motion-safe:hover:shadow-md motion-safe:active:scale-95'
                        : 'bg-transparent border border-[var(--color-border)] motion-safe:hover:shadow-md motion-safe:active:scale-95',
                  ].join(' ')}
                >
                  {/* Badge numéroté — affiché dans le coin supérieur droit quand sélectionné */}
                  {selectionOrder !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-action-default)] text-[var(--color-text-white)] text-xs font-bold flex items-center justify-center leading-none"
                    >
                      {selectionOrder}
                    </span>
                  )}

                  {/* Emoji décoratif — masqué aux lecteurs d'écran */}
                  <span className="text-2xl" aria-hidden="true">
                    {emoji}
                  </span>
                  <span
                    className={
                      isSelected
                        ? 'text-[var(--color-action-default)]'
                        : 'text-[var(--color-text-primary)]'
                    }
                  >
                    {t(`onboarding.interests.categories.${id}`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 md:gap-4 w-full shrink-0">
          <Button variant="secondary" onClick={onSkip} className="flex-1">
            {t('onboarding.interests.skip')}
          </Button>
          <Button
            variant="primary"
            onClick={() => onContinue(selectedInterests)}
            className="flex-1"
          >
            {t('onboarding.interests.continue')}
          </Button>
        </div>
      </div>
    </div>
  )
}
