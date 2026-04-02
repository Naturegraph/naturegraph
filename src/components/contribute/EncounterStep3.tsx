/**
 * EncounterStep3 — Étape 3 du formulaire Rencontre Nature
 *
 * Contenu : contexte de l'observation + lieu + visibilité
 *   - Date et moment de la journée
 *   - Météo et habitat (chips à sélection unique, désélectionnable)
 *   - Lieu avec option masquage
 *   - Visibilité de la publication
 */

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { TimeOfDay, WeatherCondition, HabitatType, Visibility } from '@/types/database'
import { LocationPicker } from './LocationPicker'

// ─── ChipGroup ────────────────────────────────────────────────────────────────
//
// Défini au niveau module (pas dans le composant) pour éviter la recréation
// à chaque rendu et satisfaire la règle react-hooks/static-components.

interface ChipGroupProps<T extends string> {
  label: string
  options: T[]
  selected: T | ''
  onToggle: (v: T | '') => void
  tPrefix: string
}

/** Groupe de chips à sélection unique (désélectionnable) */
function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  tPrefix,
}: ChipGroupProps<T>) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(selected === opt ? '' : opt)}
            aria-pressed={selected === opt}
            className={[
              'px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected === opt
                ? 'border-primary bg-primary-light text-primary font-medium'
                : 'border-border text-foreground hover:border-primary/50',
            ].join(' ')}
          >
            {t(`${tPrefix}.${opt}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface EncounterStep3Props {
  encounterDate: string
  onDateChange: (v: string) => void
  timeOfDay: TimeOfDay | ''
  onTimeChange: (v: TimeOfDay | '') => void
  weather: WeatherCondition | ''
  onWeatherChange: (v: WeatherCondition | '') => void
  habitat: HabitatType | ''
  onHabitatChange: (v: HabitatType | '') => void
  locationName: string
  onLocationChange: (v: string) => void
  locationHidden: boolean
  onLocationHiddenChange: (v: boolean) => void
  visibility: Visibility
  onVisibilityChange: (v: Visibility) => void
}

/** Retourne la date du jour au format YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function EncounterStep3({
  encounterDate,
  onDateChange,
  timeOfDay,
  onTimeChange,
  weather,
  onWeatherChange,
  habitat,
  onHabitatChange,
  locationName,
  onLocationChange,
  locationHidden,
  onLocationHiddenChange,
  visibility,
  onVisibilityChange,
}: EncounterStep3Props) {
  const { t } = useTranslation()
  const dateId = useId()

  // ── Options chips ─────────────────────────────────────────────────────────

  const TIME_OPTIONS: TimeOfDay[] = ['morning', 'afternoon', 'dusk', 'evening', 'night']
  const WEATHER_OPTIONS: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy']
  const HABITAT_OPTIONS: HabitatType[] = [
    'forest',
    'park_garden',
    'prairie_heath',
    'urban',
    'river',
    'lake_wetland',
    'mountain',
    'sea_coast',
  ]
  const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string }[] = [
    {
      value: 'public',
      label: t('contribute.visibility.public'),
      desc: t('contribute.visibility.publicDesc'),
    },
    {
      value: 'followers',
      label: t('contribute.visibility.followers'),
      desc: t('contribute.visibility.followersDesc'),
    },
    {
      value: 'private',
      label: t('contribute.visibility.private'),
      desc: t('contribute.visibility.privateDesc'),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Date + moment */}
      <div className="flex flex-col gap-3">
        <label htmlFor={dateId} className="text-sm font-semibold text-foreground">
          {t('contribute.date.label')}
        </label>
        <input
          id={dateId}
          type="date"
          value={encounterDate}
          max={todayISO()}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
        <ChipGroup
          label={t('contribute.date.timeLabel')}
          options={TIME_OPTIONS}
          selected={timeOfDay}
          onToggle={(v) => onTimeChange(v as TimeOfDay | '')}
          tPrefix="contribute.date"
        />
      </div>

      <ChipGroup
        label={t('contribute.weather.label')}
        options={WEATHER_OPTIONS}
        selected={weather}
        onToggle={(v) => onWeatherChange(v as WeatherCondition | '')}
        tPrefix="contribute.weather"
      />

      <ChipGroup
        label={t('contribute.habitat.label')}
        options={HABITAT_OPTIONS}
        selected={habitat}
        onToggle={(v) => onHabitatChange(v as HabitatType | '')}
        tPrefix="contribute.habitat"
      />

      <LocationPicker
        value={locationName}
        onValueChange={onLocationChange}
        hidden={locationHidden}
        onHiddenChange={onLocationHiddenChange}
      />

      {/* Visibilité */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">
          {t('contribute.visibility.label')}
        </span>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={t('contribute.visibility.label')}
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors',
                visibility === opt.value
                  ? 'border-primary bg-primary-light/20'
                  : 'border-border hover:border-primary/40',
              ].join(' ')}
            >
              <input
                type="radio"
                name="enc-visibility"
                value={opt.value}
                checked={visibility === opt.value}
                onChange={() => onVisibilityChange(opt.value)}
                className="sr-only"
              />
              <div
                className={[
                  'size-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  visibility === opt.value ? 'border-primary' : 'border-border',
                ].join(' ')}
              >
                {visibility === opt.value && <div className="size-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
