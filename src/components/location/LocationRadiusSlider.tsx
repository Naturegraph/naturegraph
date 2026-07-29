/**
 * LocationRadiusSlider : Sélection du rayon de partage
 * ======================================================
 * Slider discret sur des valeurs prédéfinies : 75 / 100 / 150 / 250 / 500 km.
 *
 * Accessibilité (WCAG AA) :
 *   - role="slider" natif via <input type="range">
 *   - aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext
 *   - label visible associé via htmlFor
 *   - focus-visible ring accessible
 *   - prefers-reduced-motion : pas d'animation CSS supplémentaire
 *
 * Design :
 *   - CSS tokens exclusivement (var(--color-*))
 *   - Visuels des bornes min/max explicites pour l'UX
 *   - Affichage textuel du rayon sélectionné
 */

import { useTranslation } from 'react-i18next'
import { RADIUS_OPTIONS, type LocationRadius } from '@/types/location'

// ─── Types ────────────────────────────────────────────────────

interface LocationRadiusSliderProps {
  value: LocationRadius
  onChange: (radius: LocationRadius) => void
  disabled?: boolean
  id?: string
}

// ─── Composant ───────────────────────────────────────────────

export function LocationRadiusSlider({
  value,
  onChange,
  disabled = false,
  id = 'location-radius',
}: LocationRadiusSliderProps) {
  const { t } = useTranslation()

  // Index actuel dans les options (pour le slider 0 → N-1)
  const currentIndex = RADIUS_OPTIONS.findIndex((o) => o.value === value)
  const safeIndex = currentIndex < 0 ? 0 : currentIndex
  const maxIndex = RADIUS_OPTIONS.length - 1

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const index = Number(e.target.value)
    const option = RADIUS_OPTIONS[index]
    if (option) onChange(option.value)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Label + valeur affichée */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-text-primary)]">
          {t('location.radius.label')}
        </label>
        <span
          className="text-sm font-semibold text-[var(--color-link)]"
          aria-live="polite"
          aria-atomic="true"
        >
          {RADIUS_OPTIONS[safeIndex]?.label ?? `${value} km`}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        id={id}
        min={0}
        max={maxIndex}
        step={1}
        value={safeIndex}
        onChange={handleChange}
        disabled={disabled}
        aria-valuemin={RADIUS_OPTIONS[0]?.value}
        aria-valuemax={RADIUS_OPTIONS[maxIndex]?.value}
        aria-valuenow={value}
        aria-valuetext={t('location.radius.ariaValueText', { km: value })}
        className={[
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-[var(--color-border)]',
          // Track rempli via background gradient (Tailwind + CSS vars)
          // Le style inline ci-dessous gère le remplissage progressif
          'accent-[var(--color-action-default)]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        style={{
          // Remplissage progressif du track (largeur proportionnelle à l'index)
          background: `linear-gradient(
            to right,
            var(--color-action-default) 0%,
            var(--color-action-default) ${(safeIndex / maxIndex) * 100}%,
            var(--color-border) ${(safeIndex / maxIndex) * 100}%,
            var(--color-border) 100%
          )`,
        }}
      />

      {/* Étiquettes min / max */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {RADIUS_OPTIONS[0]?.label}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {RADIUS_OPTIONS[maxIndex]?.label}
        </span>
      </div>

      {/* Message pédagogique (privacy) */}
      <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
        {t('location.radius.hint')}
      </p>
    </div>
  )
}
