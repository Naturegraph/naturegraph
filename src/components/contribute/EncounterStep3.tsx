/**
 * EncounterStep3 — Étape 3 : Contexte & détails (Figma v3 — complet)
 *
 * Ordre strict Figma :
 *   1. Titre (optionnel)       — input pill
 *   2. Description*            — textarea rounded, max 1500 car.
 *   3. Date de l'observation   — date picker pill + icône calendrier
 *   4. Localisation (+info)    — input pill + switch « Activer pour rendre
 *                                la localisation publique » (switch ON =
 *                                publique ⇒ locationHidden = false).
 *   5. Options avancées (collapsible, fermé par défaut) :
 *        - Type d'habitat        (chips avec emoji)
 *        - Conditions météo      (chips avec emoji)
 *        - Moment de la journée  (chips neutres)
 *
 * Les tags et la visibilité multi-valeurs ne sont plus dans l'UI : la
 * visibilité est pilotée par le switch de localisation + défaut 'public'.
 */

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Info, MapPin, Minus, Plus } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, HabitatType } from '@/types/database'

// ─── Constantes UI — labels emoji mappés aux énumérations DB ────────────────

/**
 * Emojis associés aux habitats / conditions météo pour rester fidèle au Figma.
 * Les labels textuels viennent de i18n (`contribute.habitat.<value>`, etc.).
 */
const HABITAT_EMOJI: Record<HabitatType, string> = {
  forest: '🌲',
  park_garden: '🏡',
  prairie_heath: '🌾',
  urban: '🏙️',
  river: '🦆',
  lake_wetland: '🦆',
  mountain: '⛰️',
  sea_coast: '🌊',
}

const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  windy: '💨',
  snowy: '❄️',
}

// Options exposées (ordre Figma)
const HABITAT_OPTIONS: HabitatType[] = [
  'forest',
  'park_garden',
  'sea_coast',
  'mountain',
  'prairie_heath',
  'urban',
  'lake_wetland',
]
const WEATHER_OPTIONS: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy']
const TIME_OPTIONS: TimeOfDay[] = ['morning', 'afternoon', 'dusk', 'evening', 'night']

// ─── Sous-composants ────────────────────────────────────────────────────────

interface ChipProps {
  label: string
  emoji?: string
  active: boolean
  onClick: () => void
}

/** Chip pill, sélection unique, désélectionnable. */
function Chip({ label, emoji, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-body transition-colors',
        'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'border-primary bg-primary-light text-foreground'
          : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
      ].join(' ')}
    >
      {emoji && (
        <span aria-hidden="true" className="text-base leading-none">
          {emoji}
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface EncounterStep3Props {
  title: string
  onTitleChange: (v: string) => void
  description: string
  onDescriptionChange: (v: string) => void
  errors: Record<string, string>
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
  /** true = localisation précise masquée. Le switch Figma est inversé :
   *  switch ON ⇒ « rendre public » ⇒ locationHidden = false. */
  locationHidden: boolean
  onLocationHiddenChange: (v: boolean) => void
}

const MAX_DESC = 1500

/** ISO (YYYY-MM-DD) du jour — borne max du champ date. */
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function EncounterStep3({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  errors,
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
}: EncounterStep3Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const descId = useId()
  const dateId = useId()
  const locId = useId()
  const switchId = useId()

  // Options avancées dépliées par défaut si au moins une option est pré-remplie
  // (ex : EXIF a détecté un moment de la journée). Sinon fermé.
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(!!(timeOfDay || weather || habitat))

  // Switch Figma : ON = publique (inverse de locationHidden)
  const locationPublic = !locationHidden

  return (
    <div className="flex flex-col gap-5">
      {/* Sous-titre Figma : « Décris les conditions, le comportement… » */}
      <p className="text-sm text-muted-foreground -mt-2">
        {t('contribute.panel.detailsHint', {
          defaultValue:
            'Décris les conditions, le comportement ou tout ce qui te semble important !',
        })}
      </p>

      {/* ── 1. Titre (optionnel) ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={titleId} className="text-sm text-foreground">
          {t('contribute.panel.obsTitle', { defaultValue: 'Titre de ta rencontre' })}
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('contribute.panel.obsTitlePlaceholder', { defaultValue: '' })}
          className="w-full h-11 px-4 rounded-full border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* ── 2. Description* ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={descId} className="text-sm text-foreground">
          {t('contribute.description.label', { defaultValue: 'Description' })}
          <span aria-hidden="true" className="text-[var(--color-error)]">
            *
          </span>
        </label>
        <div className="relative">
          <textarea
            id={descId}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('contribute.description.placeholder', { defaultValue: '' })}
            rows={5}
            required
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? `${descId}-error` : undefined}
            className="w-full px-4 py-3 pb-7 rounded-2xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
          />
          {/* Compteur ancré en bas à droite du textarea (Figma) */}
          <span
            aria-live="polite"
            className={[
              'absolute bottom-2 right-3 text-xs tabular-nums pointer-events-none',
              description.length > MAX_DESC ? 'text-[var(--color-error)]' : 'text-muted-foreground',
            ].join(' ')}
          >
            {MAX_DESC} max
          </span>
        </div>
        {errors.description && (
          <p id={`${descId}-error`} role="alert" className="text-xs text-[var(--color-error)]">
            {errors.description}
          </p>
        )}
      </div>

      {/* ── 3. Date de l'observation ───────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={dateId} className="text-sm text-foreground">
          {t('contribute.date.label', { defaultValue: "Date de l'observation" })}
        </label>
        <div className="relative">
          <input
            id={dateId}
            type="date"
            value={encounterDate}
            max={todayISO()}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-full border border-border bg-cream-lighter text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <Calendar
            className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── 4. Localisation + switch public ────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={locId} className="text-sm text-foreground">
            {t('contribute.location.label', { defaultValue: 'Localisation' })}
          </label>
          <span
            className="inline-flex items-center justify-center text-primary"
            title={t('contribute.location.hideDesc', {
              defaultValue:
                'Si désactivé, seule la région est visible. Active pour partager le lieu précis.',
            })}
          >
            <Info className="size-3.5" aria-hidden="true" />
            <span className="sr-only">
              {t('contribute.location.hideDesc', {
                defaultValue:
                  'Si désactivé, seule la région est visible. Active pour partager le lieu précis.',
              })}
            </span>
          </span>
        </div>

        <div className="relative">
          <MapPin
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={locId}
            type="text"
            value={locationName}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder={t('contribute.location.placeholder', { defaultValue: '' })}
            className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>

        {/* Switch Figma : label avant, toggle après — ON = publique */}
        <label
          htmlFor={switchId}
          className="flex items-center justify-between gap-3 cursor-pointer pt-1"
        >
          <span className="text-sm text-foreground">
            {t('contribute.location.makePublic', {
              defaultValue: 'Activer pour rendre la localisation publique',
            })}
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              id={switchId}
              type="checkbox"
              role="switch"
              checked={locationPublic}
              onChange={(e) => onLocationHiddenChange(!e.target.checked)}
              className="sr-only peer"
            />
            <span
              aria-hidden="true"
              className={[
                'w-10 h-6 rounded-full transition-colors',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1',
                locationPublic ? 'bg-primary' : 'bg-border',
              ].join(' ')}
            />
            <span
              aria-hidden="true"
              className={[
                'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
                locationPublic ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </span>
        </label>
      </div>

      {/* ── 5. Options avancées (collapsible) ──────────────────────────── */}
      <div className="flex flex-col gap-4 pt-1">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="self-start inline-flex items-center gap-2 text-primary text-sm font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <span>{t('contribute.panel.advancedOptions', { defaultValue: 'Options avancées' })}</span>
          {advancedOpen ? (
            <Minus className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-5">
            {/* Habitat */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">
                {t('contribute.habitat.label', {
                  defaultValue: "Type d'habitat lors de l'observation ?",
                })}
              </span>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t('contribute.habitat.label', {
                  defaultValue: "Type d'habitat",
                })}
              >
                {HABITAT_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={t(`contribute.habitat.${opt}`)}
                    emoji={HABITAT_EMOJI[opt]}
                    active={habitat === opt}
                    onClick={() => onHabitatChange(habitat === opt ? '' : opt)}
                  />
                ))}
              </div>
            </div>

            {/* Conditions météo */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">
                {t('contribute.weather.label', { defaultValue: 'Conditions de prise de vue' })}
              </span>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t('contribute.weather.label', {
                  defaultValue: 'Conditions météo',
                })}
              >
                {WEATHER_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={t(`contribute.weather.${opt}`)}
                    emoji={WEATHER_EMOJI[opt]}
                    active={weather === opt}
                    onClick={() => onWeatherChange(weather === opt ? '' : opt)}
                  />
                ))}
              </div>
            </div>

            {/* Moment de la journée */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">
                {t('contribute.date.timeLabel', { defaultValue: 'Moment de la journée' })}
              </span>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t('contribute.date.timeLabel', {
                  defaultValue: 'Moment de la journée',
                })}
              >
                {TIME_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={t(`contribute.date.${opt}`)}
                    active={timeOfDay === opt}
                    onClick={() => onTimeChange(timeOfDay === opt ? '' : opt)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
