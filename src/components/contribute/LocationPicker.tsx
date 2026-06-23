/**
 * LocationPicker : Saisie du lieu d'observation + option masquage localisation précise
 *
 * Champs mappés sur Post :
 *   - location_name   : texte libre (ville, forêt, lieu-dit…)
 *   - location_hidden : masque lat/lng publiquement : seule la région est visible
 *
 * TODO [BACKEND] : Autocomplétion Nominatim / Mapbox :
 *   GET https://nominatim.openstreetmap.org/search?q=...&format=json
 *   Proxy serveur recommandé (rate limit 1 req/sec Nominatim).
 *   Stocker lat/lng dans post.latitude / post.longitude.
 */

import { useId } from 'react'
import { MapPin, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LocationPickerProps {
  value: string
  onValueChange: (v: string) => void
  hidden: boolean
  onHiddenChange: (v: boolean) => void
}

export function LocationPicker({
  value,
  onValueChange,
  hidden,
  onHiddenChange,
}: LocationPickerProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const checkboxId = useId()

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {t('contribute.location.label')}
      </label>

      {/* Champ lieu libre */}
      <div className="relative">
        <MapPin
          className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={t('contribute.location.placeholder')}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* Option masquage localisation précise */}
      <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer">
        {/* Checkbox custom pour correspondre au design system */}
        <div className="relative mt-0.5 shrink-0">
          <input
            id={checkboxId}
            type="checkbox"
            checked={hidden}
            onChange={(e) => onHiddenChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="size-5 rounded border border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1 flex items-center justify-center">
            {hidden && (
              <svg
                className="size-3 text-primary-foreground"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {t('contribute.location.hide')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('contribute.location.hideDesc')}
          </p>
        </div>
      </label>
    </div>
  )
}
