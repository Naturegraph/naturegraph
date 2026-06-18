/**
 * LocationPickerSection : Section localisation complète (picker + slider + toggle)
 * ==================================================================================
 * Encapsule CityAutocomplete + LocationRadiusSlider + LocationVisibilityToggle
 * dans un panneau unique utilisé dans l'onboarding et les Settings.
 *
 * Deux modes :
 *   - Panneau dépliable (onboarding) : accordéon avec CTA "Ajouter ma zone"
 *   - Panneau toujours visible (settings) : affichage direct
 *
 * Accessibilité :
 *   - Section labellisée via aria-labelledby
 *   - bouton accordéon aria-expanded
 *   - Message pédagogique RGPD visible (pas en tooltip caché)
 *
 * Éco-conception :
 *   - Les composants enfants sont chargés en JS uniquement quand le panneau s'ouvre
 *   - Pas de lib de formulaire, état local minimal
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, ChevronDown, Shield } from 'lucide-react'
import { CityAutocomplete } from './CityAutocomplete'
import { LocationRadiusSlider } from './LocationRadiusSlider'
import { LocationVisibilityToggle } from './LocationVisibilityToggle'
import type {
  CityResult,
  LocationFormData,
  LocationRadius,
  LocationVisibility,
} from '@/types/location'
import { DEFAULT_RADIUS, DEFAULT_VISIBILITY } from '@/types/location'

// ─── Types ────────────────────────────────────────────────────

interface LocationPickerSectionProps {
  /** Mode d'affichage */
  mode?: 'accordion' | 'always-open'
  /** Callback quand le formulaire change (utilisé en temps réel par l'onboarding) */
  onChange?: (data: LocationFormData | null) => void
  /** Valeur initiale */
  initialCity?: CityResult | null
  initialRadius?: LocationRadius
  initialVisibility?: LocationVisibility
  /** Consent source selon le contexte (onboarding vs settings) */
  consentSource?: LocationFormData['consentSource']
  disabled?: boolean
}

// ─── Composant ───────────────────────────────────────────────

export function LocationPickerSection({
  mode = 'accordion',
  onChange,
  initialCity = null,
  initialRadius = DEFAULT_RADIUS,
  initialVisibility = DEFAULT_VISIBILITY,
  consentSource = 'onboarding',
  disabled = false,
}: LocationPickerSectionProps) {
  const { t } = useTranslation()

  const [isExpanded, setIsExpanded] = useState(mode === 'always-open')
  const [city, setCity] = useState<CityResult | null>(initialCity)
  const [radius, setRadius] = useState<LocationRadius>(initialRadius)
  const [visibility, setVisibility] = useState<LocationVisibility>(initialVisibility)

  // ─── Notification vers le parent ──────────────────────────

  function notifyChange(
    nextCity: CityResult | null,
    nextRadius: LocationRadius,
    nextVisibility: LocationVisibility,
  ) {
    if (!nextCity) {
      onChange?.(null)
      return
    }
    onChange?.({
      city: nextCity,
      radiusKm: nextRadius,
      visibility: nextVisibility,
      consentSource,
    })
  }

  function handleCityChange(nextCity: CityResult | null) {
    setCity(nextCity)
    notifyChange(nextCity, radius, visibility)
  }

  function handleRadiusChange(nextRadius: LocationRadius) {
    setRadius(nextRadius)
    notifyChange(city, nextRadius, visibility)
  }

  function handleVisibilityChange(nextVisibility: LocationVisibility) {
    setVisibility(nextVisibility)
    notifyChange(city, radius, nextVisibility)
  }

  // ─── Rendu accordion (mode onboarding) ────────────────────

  if (mode === 'accordion') {
    return (
      <div className="w-full flex flex-col gap-3 shrink-0">
        {/* Bouton accordéon */}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="location-picker-content"
          onClick={() => setIsExpanded((v) => !v)}
          disabled={disabled}
          className={[
            'flex items-center gap-3 w-full px-4 py-3 rounded-lg border',
            'text-left transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-1',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            isExpanded || city
              ? 'border-[var(--color-action-default)] bg-[var(--color-action-light)]'
              : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]',
          ].join(' ')}
        >
          <MapPin
            size={16}
            aria-hidden="true"
            className={
              isExpanded || city
                ? 'text-[var(--color-action-default)] shrink-0'
                : 'text-[var(--color-text-secondary)] shrink-0'
            }
          />

          <div className="flex-1 min-w-0">
            <p
              className={[
                'text-sm font-medium',
                isExpanded || city
                  ? 'text-[var(--color-action-default)]'
                  : 'text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {city ? city.name : t('location.section.addZone')}
            </p>
            {city && (
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {city.regionName} · {t('location.radius.unit', { km: radius })}
              </p>
            )}
          </div>

          <ChevronDown
            size={16}
            aria-hidden="true"
            className={[
              'shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200',
              isExpanded ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {/* Contenu dépliable */}
        {isExpanded && (
          <div
            id="location-picker-content"
            className="flex flex-col gap-5 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          >
            <LocationPickerContent
              city={city}
              radius={radius}
              visibility={visibility}
              onCityChange={handleCityChange}
              onRadiusChange={handleRadiusChange}
              onVisibilityChange={handleVisibilityChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    )
  }

  // ─── Rendu toujours visible (mode settings) ───────────────

  return (
    <div className="flex flex-col gap-5 w-full">
      <LocationPickerContent
        city={city}
        radius={radius}
        visibility={visibility}
        onCityChange={handleCityChange}
        onRadiusChange={handleRadiusChange}
        onVisibilityChange={handleVisibilityChange}
        disabled={disabled}
      />
    </div>
  )
}

// ─── Sous-composant : contenu du picker ──────────────────────

interface PickerContentProps {
  city: CityResult | null
  radius: LocationRadius
  visibility: LocationVisibility
  onCityChange: (city: CityResult | null) => void
  onRadiusChange: (radius: LocationRadius) => void
  onVisibilityChange: (visibility: LocationVisibility) => void
  disabled: boolean
}

function LocationPickerContent({
  city,
  radius,
  visibility,
  onCityChange,
  onRadiusChange,
  onVisibilityChange,
  disabled,
}: PickerContentProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Message RGPD : toujours visible, pas en tooltip */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
        <Shield
          size={14}
          className="shrink-0 mt-0.5 text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {t('location.privacy.notice')}
        </p>
      </div>

      {/* Autocomplete ville */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="location-city-input"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {t('location.autocomplete.label')}
        </label>
        <CityAutocomplete
          id="location-city-input"
          value={city}
          onChange={onCityChange}
          disabled={disabled}
        />
      </div>

      {/* Slider rayon */}
      <LocationRadiusSlider
        value={radius}
        onChange={onRadiusChange}
        disabled={disabled || !city}
        id="location-radius"
      />

      {/* Toggle visibilité */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {t('location.visibility.label')}
        </p>
        <LocationVisibilityToggle
          value={visibility}
          onChange={onVisibilityChange}
          disabled={disabled || !city}
        />
      </div>
    </>
  )
}
