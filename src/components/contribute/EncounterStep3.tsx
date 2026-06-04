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

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Info, MapPin, X } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, HabitatType } from '@/types/database'
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import type { CityResult } from '@/types/location'

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

// Emojis Figma 6385:55806 (second-agent/05) — alignés sur FeedPost.WEATHER_EMOJI.
const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  windy: '🌬️',
  snowy: '🌨️',
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
          : 'border-border bg-background text-foreground hover:border-primary/50',
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
  /** true uniquement après un clic "Publier" raté — gate l'affichage des erreurs
   *  inline pour ne pas montrer "obligatoire" tant que l'utilisateur n'a pas
   *  tenté de soumettre (second-agent/30). */
  submitAttempted?: boolean
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
  /** Reçoit lat/lng + country de la ville sélectionnée via l'autocomplete.
   *  `country` est déduit de la source (« France » API Adresse, « Canada »
   *  fr_cities QC). Persisté avec le post pour afficher au moins le pays
   *  même quand la localisation est en mode privé. Optionnel : l'utilisateur
   *  peut taper du texte libre sans choisir de suggestion. */
  onLocationCoordsChange?: (
    lat: number | null,
    lng: number | null,
    country?: string | null,
    region?: string | null,
  ) => void
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
  submitAttempted = false,
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
  onLocationCoordsChange,
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
  // Nicolas 2026-05-22 : champs habitat / météo / moment sont désormais
  // toujours visibles (cf. plus bas). Le state advancedOpen et son toggle
  // ont été retirés — peu de users dépliaient le bloc → posts incomplets.

  // ─── Popover "info localisation" ────────────────────────────────────────
  // Affiche les règles de confidentialité au clic sur l'icône (i).
  // Fermeture : croix, clic en dehors, ou touche Escape.
  const [locationInfoOpen, setLocationInfoOpen] = useState(false)
  const locationInfoRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!locationInfoOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLocationInfoOpen(false)
    }
    function onClickOutside(e: MouseEvent) {
      if (locationInfoRef.current && !locationInfoRef.current.contains(e.target as Node)) {
        setLocationInfoOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [locationInfoOpen])

  // ─── Autocomplete localisation (API Adresse data.gouv.fr) ───────────────
  // - Suggestions affichées sous l'input quand >= 2 caractères tapés
  // - Sélection d'une suggestion : pose locationName + lat/lng
  // - Frappe libre : possible (texte libre conservé tel quel)
  const [locSuggestionsOpen, setLocSuggestionsOpen] = useState(false)
  const locInputRef = useRef<HTMLDivElement | null>(null)
  // V1.1.4 NG-027 (Nicolas 2026-06-03) : on remonte aussi `error` pour
  // surface visuellement les pannes reseau (avant : silence + "Aucun
  // resultat" trompeur).
  const {
    suggestions,
    isLoading: locLoading,
    error: locError,
  } = useLocationAutocomplete(locationName)

  useEffect(() => {
    if (!locSuggestionsOpen) return
    function onClickOutside(e: MouseEvent) {
      if (locInputRef.current && !locInputRef.current.contains(e.target as Node)) {
        setLocSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [locSuggestionsOpen])

  function handlePickCity(city: CityResult) {
    onLocationChange(city.name)
    onLocationCoordsChange?.(city.centroidLat, city.centroidLng, city.country, city.regionName)
    setLocSuggestionsOpen(false)
  }

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

      {/* V1.1.4 NG-024 : section "Photos existantes" RETIREE de l etape 3.
          Les photos sont desormais affichees UNIQUEMENT dans l etape 1
          (Step1) avec exactement la meme UI que la creation (BigPreview +
          ThumbRow). L user voit ses photos comme s il venait de les
          uploader. Retour Nicolas 2026-06-01 : "plus logique en step 1
          uniquement, pas en mode thumbnails bizarre". */}

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
          className="w-full h-11 px-4 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* ── 2. Description* ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={descId} className="text-sm text-foreground">
          {t('contribute.description.label', { defaultValue: 'Description' })}
          {/* Asterisque retiré (second-agent/30 — phase test) : on laisse libre
              pour analyser qui complète quoi avant de rendre obligatoire. */}
        </label>
        <div className="relative">
          <textarea
            id={descId}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('contribute.description.placeholder', { defaultValue: '' })}
            rows={5}
            // Phase test : description non obligatoire (second-agent/30).
            aria-invalid={!!(submitAttempted && errors.description)}
            aria-describedby={submitAttempted && errors.description ? `${descId}-error` : undefined}
            className="w-full px-4 py-3 pb-7 rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
          />
          {/* Compteur ancré en bas à droite du textarea (Figma) */}
          <span
            aria-live="polite"
            className={[
              'absolute bottom-2 right-3 text-xs tabular-nums pointer-events-none',
              description.length > MAX_DESC ? 'text-[var(--color-error)]' : 'text-muted-foreground',
            ].join(' ')}
          >
            {description.length}/{MAX_DESC}
          </span>
        </div>
        {/* Erreur affichée UNIQUEMENT après une tentative de soumission ratée
            — sinon le label "*" suffit à signaler le caractère obligatoire
            (second-agent/30). */}
        {submitAttempted && errors.description && (
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
            // `date-input-clean` cache l'icône native (Webkit/Edge) — l'icône
            // visible est notre <Calendar> custom, alignée avec le design system.
            // Le clic sur l'input ouvre toujours le picker natif.
            className="date-input-clean w-full h-11 pl-4 pr-10 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <Calendar
            className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── 4. Localisation + switch public ────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="relative flex items-center gap-1.5" ref={locationInfoRef}>
          <label htmlFor={locId} className="text-sm text-foreground">
            {t('contribute.location.label', { defaultValue: 'Localisation' })}
          </label>
          {/* Bouton (i) : ouvre le popover privacy au clic. */}
          <button
            type="button"
            onClick={() => setLocationInfoOpen((v) => !v)}
            aria-label={t('contribute.location.infoButton', {
              defaultValue: 'En savoir plus sur la localisation',
            })}
            aria-expanded={locationInfoOpen}
            className="inline-flex items-center justify-center size-5 rounded-full text-primary hover:bg-primary-light/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>

          {locationInfoOpen && (
            <div
              role="dialog"
              aria-label={t('contribute.location.label', { defaultValue: 'Localisation' })}
              // Popover ne déborde plus du panneau contribute (sidebar
              // étroite sur desktop) — on cape à 100% de la largeur du
              // parent + un padding interne plus compact. Shadow allégée
              // (md au lieu de xl) pour rester subtil (Nicolas 2026-05-22).
              className="absolute left-0 right-0 top-full mt-2 z-30 max-w-full rounded-2xl border-[0.5px] border-border bg-background p-4 shadow-md flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-title font-bold text-base text-foreground">
                  {t('contribute.location.label', { defaultValue: 'Localisation' })}
                </h4>
                <button
                  type="button"
                  onClick={() => setLocationInfoOpen(false)}
                  aria-label={t('common.close', { defaultValue: 'Fermer' })}
                  className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {t('contribute.location.privacy.intro', {
                  defaultValue:
                    'Par défaut, la donnée de localisation est privée. Elle ne sera pas partagée avec les autres utilisateurs.',
                })}
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {t('contribute.location.privacy.usage', {
                  defaultValue:
                    "Nous utiliserons ta localisation pour améliorer la qualité des données scientifiques et suivre l'évolution des espèces. Ces informations pourront être partagées avec des organismes pour des études, mais uniquement de manière anonyme.",
                })}
              </p>
              <p className="text-sm text-foreground font-bold leading-relaxed">
                {t('contribute.location.privacy.publicTitle', {
                  defaultValue: 'Puis-je rendre ma localisation publique ?',
                })}
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {t('contribute.location.privacy.publicAnswer', {
                  defaultValue:
                    "Oui, tu peux choisir de rendre ta localisation publique. Cependant, elle sera associée à la ville où l'observation a eu lieu pour préserver la confidentialité.",
                })}
              </p>
            </div>
          )}
        </div>

        <div className="relative" ref={locInputRef}>
          <MapPin
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none z-10"
            aria-hidden="true"
          />
          <input
            id={locId}
            type="text"
            value={locationName}
            onChange={(e) => {
              onLocationChange(e.target.value)
              // Si l'utilisateur retape, invalider les coords précédentes
              // pour ne pas envoyer un GPS qui ne correspond plus au texte.
              onLocationCoordsChange?.(null, null)
              setLocSuggestionsOpen(true)
            }}
            onFocus={() => locationName.length >= 2 && setLocSuggestionsOpen(true)}
            placeholder={t('contribute.location.placeholder', { defaultValue: '' })}
            role="combobox"
            aria-expanded={locSuggestionsOpen && suggestions.length > 0}
            aria-controls={`${locId}-listbox`}
            aria-autocomplete="list"
            autoComplete="off"
            className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />

          {/* Dropdown suggestions API Adresse */}
          {locSuggestionsOpen && (suggestions.length > 0 || locLoading || locError) && (
            <ul
              id={`${locId}-listbox`}
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1 z-20 rounded-2xl border border-border bg-background shadow-lg overflow-hidden"
            >
              {locLoading && suggestions.length === 0 && (
                <li className="px-4 py-2.5 text-sm text-muted-foreground italic">
                  {t('common.loading', { defaultValue: 'Chargement…' })}
                </li>
              )}
              {/* V1.1.4 NG-027 (Nicolas 2026-06-03) : panne reseau visible
                  au lieu du faux "Aucun resultat" silencieux. */}
              {!locLoading && locError && (
                <li className="px-4 py-2.5 text-sm text-amber-900 bg-amber-50 italic">
                  {t('contribute.errors.locationNetworkError', {
                    defaultValue:
                      'Connexion lente. Verifie ta connexion ou reessaye dans un instant.',
                  })}
                </li>
              )}
              {suggestions.map((city) => (
                <li key={city.inseeCode} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault() // évite le blur avant le click
                      handlePickCity(city)
                    }}
                    className="w-full flex items-start gap-2 px-4 py-2.5 text-left hover:bg-primary-light/30 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/40"
                  >
                    <MapPin className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {city.name}
                      </span>
                      {/* V1.1.4 NG-027 round 12 (Nicolas 2026-06-03) : pays
                          affiche pour distinguer France / Canada d'un coup
                          d'oeil (villes homonymes FR/QC). */}
                      <span className="block text-xs text-muted-foreground truncate">
                        {city.departmentCode} · {city.regionName}
                        {city.country ? ` · ${city.country}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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

      {/* Séparateur entre Localisation et Habitat — délimite visuellement
          la section « contexte » du formulaire (Nicolas 2026-05-22). */}
      <hr className="border-0 border-t border-border my-2" aria-hidden="true" />

      {/* ── 5. Habitat + conditions + moment — toujours visibles ──────────
          Nicolas 2026-05-22 : retrait du collapsible « Options avancées ».
          Les retours users beta montraient que peu d'utilisateurs cliquaient
          sur le bouton pour le déplier → champs jamais saisis → posts moins
          riches. On les expose désormais directement pour augmenter la
          complétude des observations partagées. */}
      <div className="flex flex-col gap-4 pt-1">
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
      </div>
    </div>
  )
}
