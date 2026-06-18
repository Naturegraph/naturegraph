/**
 * LocationVisibilityToggle : Choix de la visibilité de localisation
 * ==================================================================
 * 3 options : privé / région / ville+région
 *
 * Pattern ARIA : radiogroup + radio buttons.
 * Chaque option est un <button role="radio"> pour un contrôle
 * custom accessible sans contraindre le style natif du radio input.
 *
 * Accessibilité (WCAG AA) :
 *   - role="radiogroup" avec aria-label
 *   - role="radio" + aria-checked sur chaque option
 *   - Navigation clavier : Tab entre les groupes, Espace/Enter pour sélectionner
 *   - focus-visible ring sur chaque option
 *   - Icons aria-hidden (décoratives)
 *   - Contraste ≥ 4.5:1 sur les états actif/inactif
 */

import { useTranslation } from 'react-i18next'
import { EyeOff, Globe, MapPin } from 'lucide-react'
import type { LocationVisibility } from '@/types/location'

// ─── Configuration des options ────────────────────────────────

interface VisibilityOption {
  value: LocationVisibility
  Icon: React.FC<{ size: number; className?: string }>
  labelKey: string
  descriptionKey: string
}

const OPTIONS: VisibilityOption[] = [
  {
    value: 'private',
    Icon: EyeOff,
    labelKey: 'location.visibility.private.label',
    descriptionKey: 'location.visibility.private.description',
  },
  {
    value: 'region',
    Icon: Globe,
    labelKey: 'location.visibility.region.label',
    descriptionKey: 'location.visibility.region.description',
  },
  {
    value: 'city',
    Icon: MapPin,
    labelKey: 'location.visibility.city.label',
    descriptionKey: 'location.visibility.city.description',
  },
]

// ─── Types ────────────────────────────────────────────────────

interface LocationVisibilityToggleProps {
  value: LocationVisibility
  onChange: (visibility: LocationVisibility) => void
  disabled?: boolean
}

// ─── Composant ───────────────────────────────────────────────

export function LocationVisibilityToggle({
  value,
  onChange,
  disabled = false,
}: LocationVisibilityToggleProps) {
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('location.visibility.ariaLabel')}
      className="flex flex-col gap-2 w-full"
    >
      {OPTIONS.map(({ value: optValue, Icon, labelKey, descriptionKey }) => {
        const isSelected = value === optValue

        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onChange(optValue)}
            disabled={disabled}
            className={[
              'flex items-start gap-3 p-3 rounded-lg border text-left w-full',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-1',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              isSelected
                ? 'border-[var(--color-action-default)] bg-[var(--color-action-light)]'
                : 'border-[var(--color-border)] bg-transparent hover:bg-[var(--color-bg-secondary)]',
            ].join(' ')}
          >
            {/* Indicateur radio custom + icône */}
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {/* Cercle radio */}
              <span
                aria-hidden="true"
                className={[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected
                    ? 'border-[var(--color-action-default)] bg-[var(--color-action-default)]'
                    : 'border-[var(--color-border)]',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
                )}
              </span>

              <Icon
                size={16}
                aria-hidden={true}
                className={
                  isSelected
                    ? 'text-[var(--color-action-default)]'
                    : 'text-[var(--color-text-secondary)]'
                }
              />
            </div>

            {/* Texte */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={[
                  'text-sm font-semibold',
                  isSelected
                    ? 'text-[var(--color-action-default)]'
                    : 'text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {t(labelKey)}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t(descriptionKey)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
