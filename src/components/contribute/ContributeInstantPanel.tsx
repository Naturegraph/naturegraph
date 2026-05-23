/**
 * ContributeInstantPanel — Panel latéral Instant Nature (2 étapes)
 * ============================================================
 *
 * Capture rapide d'un paysage / phénomène naturel sans observation
 * d'espèce. Reprend exactement l'architecture stable de
 * `ContributeEncounterForm` :
 *   - Watchdog 30s + timeouts par étape (createPost 10s, upload 20s)
 *   - EXIF auto-prefill date/time-of-day depuis les photos
 *   - Compression + strip EXIF avant upload
 *   - city/region extraits du label location pour FeedPost
 *   - URL slug court (short_id) via postSlug
 *
 * Différences avec Encounter :
 *   - 2 étapes seulement (Photos → Détails) — pas de carnet d'espèces
 *   - Pas de champ habitat (spécifique aux observations)
 *   - Couleur thème amber (vs teal pour Encounter)
 *
 * Type DB : 'nature_instant'
 */

import { useState, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, Calendar, MapPin, Loader2 } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, DisplayFormat } from '@/types/database'
import { EncounterStep1 } from './EncounterStep1'
import { compressPhoto } from '@/utils/compressPhoto'
import type { PhotoMetadata } from '@/utils/extractPhotoMetadata'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost } from '@/hooks/usePost'
import { uploadPostMedia } from '@/services/mediaService'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import type { CityResult } from '@/types/location'

// ─── État du formulaire ──────────────────────────────────────────────────────

interface InstantFormData {
  // Étape 1
  files: File[]
  displayFormat: DisplayFormat
  photoMetadata: PhotoMetadata
  // Étape 2
  title: string
  description: string
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  weather: WeatherCondition | ''
  /** Phénomène observé (texte libre court : « Aurore boréale », « Arc-en-ciel ») */
  phenomenon: string
  locationName: string
  locationLat: number | null
  locationLng: number | null
  locationHidden: boolean
}

const TOTAL_STEPS = 2
const MAX_DESC = 1500
const MAX_TITLE = 80
const MAX_PHENOM = 60

const TIME_OPTIONS: TimeOfDay[] = ['morning', 'afternoon', 'dusk', 'evening', 'night']
const WEATHER_OPTIONS: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy']
const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  windy: '🌬️',
  snowy: '🌨️',
}

interface ContributeInstantPanelProps {
  onClose: () => void
}

export function ContributeInstantPanel({ onClose }: ContributeInstantPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const createPost = useCreatePost(user?.id ?? '')
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState<InstantFormData>({
    files: [],
    displayFormat: '16:9',
    photoMetadata: {},
    title: '',
    description: '',
    encounterDate: new Date().toISOString().slice(0, 10),
    timeOfDay: '',
    weather: '',
    phenomenon: '',
    locationName: '',
    locationLat: null,
    locationLng: null,
    locationHidden: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  // Escape ferme le panneau
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function set<K extends keyof InstantFormData>(key: K, value: InstantFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as string])
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== (key as string))),
      )
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!form.description.trim()) {
      // Description NON obligatoire (cohérent Encounter step3) — uniquement si trop long.
    }
    if (form.description.length > MAX_DESC) {
      e.description = t('contribute.errors.descriptionTooLong', { max: MAX_DESC })
    }
    return e
  }

  function handleNext(e?: React.MouseEvent | React.SyntheticEvent) {
    e?.preventDefault?.()
    if (step === 1) {
      // Validation step 1 : au moins 1 photo
      if (form.files.length === 0) {
        setErrors({ files: t('contribute.errors.mediaRequired') })
        return
      }
    }
    setErrors({})
    setSubmitAttempted(false)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack(e?: React.MouseEvent | React.SyntheticEvent) {
    e?.preventDefault?.()
    setErrors({})
    setSubmitAttempted(false)
    if (step === 1) {
      onClose()
      return
    }
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < TOTAL_STEPS) {
      handleNext()
      return
    }
    setSubmitAttempted(true)
    const errs = validateStep2()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    if (!user?.id) {
      setErrors({
        description: t('contribute.errors.notAuthenticated', 'Connecte-toi pour publier'),
      })
      return
    }

    setIsSubmitting(true)
    setUploadError(null)
    let createdPostId: string | null = null

    // Watchdog 30s (cohérent Encounter).
    const watchdog = setTimeout(() => {
      console.warn('[ContributeInstantPanel] watchdog : submission > 30s, force release')
      setIsSubmitting(false)
      setUploadProgress(null)
      setUploadError(
        t('contribute.media.uploadError', {
          defaultValue:
            'La soumission prend trop de temps. Vérifie ta connexion internet et réessaie.',
        }),
      )
    }, 30_000)

    function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
      return Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ${label} après ${ms / 1000}s`)), ms),
        ),
      ])
    }

    try {
      // time-of-day : valeur saisie > fallback EXIF
      const timeOfDay = form.timeOfDay || form.photoMetadata.timeOfDay || undefined

      // Décompose le label localisation → city/region pour FeedPost.
      const locSegments = form.locationName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const cityFromInput = locSegments[0] || undefined
      const regionFromInput = locSegments[locSegments.length - 1] || undefined

      const post = await withTimeout(
        createPost.mutateAsync({
          type: 'nature_instant',
          title: form.title.trim() || undefined,
          description: form.description.trim(),
          visibility: 'public',
          encounter_date: form.encounterDate,
          time_of_day: timeOfDay,
          weather: form.weather || undefined,
          location_name: form.locationName || undefined,
          city: cityFromInput,
          region:
            regionFromInput && regionFromInput !== cityFromInput ? regionFromInput : undefined,
          latitude: form.locationLat ?? undefined,
          longitude: form.locationLng ?? undefined,
          location_hidden: form.locationHidden,
          // Phenomenon stocké en tags pour le moment (la colonne posts.phenomenon
          // existe en DB mais l'UI feed ne l'expose pas encore).
          tags: form.phenomenon ? [form.phenomenon] : [],
          display_format: form.displayFormat,
        }),
        10_000,
        'création du post',
      )
      createdPostId = post.id

      const [{ detectPhotoFormat }, { stripExif }] = await Promise.all([
        import('@/utils/detectPhotoFormat'),
        import('@/utils/stripExif'),
      ])

      for (let i = 0; i < form.files.length; i++) {
        setUploadProgress({ current: i + 1, total: form.files.length })
        const rawFile = form.files[i]

        let dims: { width: number; height: number } | null = null
        try {
          dims = await detectPhotoFormat(rawFile)
        } catch {
          /* fallback */
        }

        const compressed = await compressPhoto(rawFile)
        const fileToUpload = await stripExif(compressed)

        await withTimeout(
          uploadPostMedia({
            file: fileToUpload,
            postId: post.id,
            userId: user.id,
            copyrightNotice: '',
            displayOrder: i,
            isCover: i === 0,
            width: dims?.width,
            height: dims?.height,
          }),
          20_000,
          `upload photo ${i + 1}/${form.files.length}`,
        )
      }

      queryClient.invalidateQueries({ queryKey: ['feed'] })
      onClose()
    } catch (err) {
      if (createdPostId && supabase) {
        try {
          await supabase.from('posts').delete().eq('id', createdPostId)
        } catch {
          /* rollback best-effort */
        }
      }
      const rawMessage = err instanceof Error ? err.message : ''
      const friendlyMessage =
        rawMessage && !/violates|constraint|relation|null value|duplicate key/i.test(rawMessage)
          ? rawMessage
          : t('contribute.media.uploadError', {
              defaultValue:
                'Vérifie ta connexion ou réessaye un peu plus tard pour importer tes photos.',
            })
      setUploadError(friendlyMessage)
      console.error('[ContributeInstantPanel] submit failed:', err)
    } finally {
      clearTimeout(watchdog)
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  const stepTitles: Record<number, string> = {
    1: t('contribute.panel.captureInstant', { defaultValue: 'Capture ton instant nature' }),
    2: t('contribute.panel.moreDetails', { defaultValue: 'Quelques détails de plus' }),
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:block hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('contribute.instantTitle')}
        className="fixed inset-y-0 right-0 z-[60] w-full md:w-[440px] bg-cream-lighter flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-[var(--color-amber-primary)] text-white text-sm leading-none">
              <span className="font-body">{t('contribute.instantTitle')}</span>
            </span>

            <div className="flex items-center gap-4">
              <span
                className="font-body text-base text-foreground whitespace-nowrap"
                aria-live="polite"
              >
                {t('contribute.step', { current: step, total: TOTAL_STEPS })}
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="size-8 shrink-0 rounded-full bg-[#f0f0f5] hover:bg-[#e5e5ea] flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="flex gap-1"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                className={[
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  step >= i ? 'bg-[var(--color-amber-primary)]' : 'bg-border',
                ].join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="contribute-instant-form"
            onSubmit={handleSubmit}
            noValidate
            className="px-5 pt-5 pb-4 flex flex-col gap-1"
          >
            <h2 className="font-title font-bold text-lg text-foreground mb-4">
              {stepTitles[step]}
            </h2>

            {step === 1 && (
              <EncounterStep1
                files={form.files}
                onFilesChange={(f) => set('files', f)}
                displayFormat={form.displayFormat}
                onDisplayFormatChange={(f) => set('displayFormat', f)}
                onMetadataExtracted={(meta) => {
                  setForm((prev) => ({
                    ...prev,
                    photoMetadata: meta,
                    encounterDate: meta.date ?? prev.encounterDate,
                    timeOfDay: prev.timeOfDay || meta.timeOfDay || '',
                  }))
                }}
                error={errors.files}
              />
            )}

            {step === 2 && (
              <InstantStep2
                title={form.title}
                onTitleChange={(v) => set('title', v)}
                description={form.description}
                onDescriptionChange={(v) => set('description', v)}
                phenomenon={form.phenomenon}
                onPhenomenonChange={(v) => set('phenomenon', v)}
                encounterDate={form.encounterDate}
                onDateChange={(v) => set('encounterDate', v)}
                timeOfDay={form.timeOfDay}
                onTimeChange={(v) => set('timeOfDay', v)}
                weather={form.weather}
                onWeatherChange={(v) => set('weather', v)}
                locationName={form.locationName}
                onLocationChange={(v) => set('locationName', v)}
                onLocationCoordsChange={(lat, lng) => {
                  setForm((prev) => ({ ...prev, locationLat: lat, locationLng: lng }))
                }}
                locationHidden={form.locationHidden}
                onLocationHiddenChange={(v) => set('locationHidden', v)}
                errors={errors}
                submitAttempted={submitAttempted}
              />
            )}
          </form>
        </div>

        {/* Toast erreur upload */}
        {uploadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="shrink-0 mx-5 mb-3 rounded-card bg-background border border-border shadow-md overflow-hidden"
          >
            <div className="px-4 py-3 flex items-start gap-3">
              <span aria-hidden="true" className="text-base">
                ⚠️
              </span>
              <p className="text-sm text-foreground flex-1">{uploadError}</p>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                aria-label={t('common.close')}
                className="size-6 shrink-0 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Footer sticky */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-cream-lighter pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={handleBack}
          >
            {step === 1 ? (
              <>{t('common.cancel', { defaultValue: 'Annuler' })}</>
            ) : (
              <>
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t('common.back', { defaultValue: 'Précédent' })}
              </>
            )}
          </Button>

          <Button
            type="button"
            size="md"
            className="flex-1"
            disabled={isSubmitting}
            onClick={(e) =>
              step < TOTAL_STEPS ? handleNext(e) : handleSubmit(e as React.FormEvent)
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                {uploadProgress
                  ? `${uploadProgress.current}/${uploadProgress.total}`
                  : t('common.loading')}
              </>
            ) : step < TOTAL_STEPS ? (
              t('common.next', { defaultValue: 'Suivant' })
            ) : (
              t('contribute.publish', { defaultValue: 'Publier' })
            )}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Étape 2 — Détails de l'instant ──────────────────────────────────────────

interface InstantStep2Props {
  title: string
  onTitleChange: (v: string) => void
  description: string
  onDescriptionChange: (v: string) => void
  phenomenon: string
  onPhenomenonChange: (v: string) => void
  encounterDate: string
  onDateChange: (v: string) => void
  timeOfDay: TimeOfDay | ''
  onTimeChange: (v: TimeOfDay | '') => void
  weather: WeatherCondition | ''
  onWeatherChange: (v: WeatherCondition | '') => void
  locationName: string
  onLocationChange: (v: string) => void
  onLocationCoordsChange?: (lat: number | null, lng: number | null) => void
  locationHidden: boolean
  onLocationHiddenChange: (v: boolean) => void
  errors: Record<string, string>
  submitAttempted: boolean
}

function InstantStep2({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  phenomenon,
  onPhenomenonChange,
  encounterDate,
  onDateChange,
  timeOfDay,
  onTimeChange,
  weather,
  onWeatherChange,
  locationName,
  onLocationChange,
  onLocationCoordsChange,
  locationHidden,
  onLocationHiddenChange,
  errors,
  submitAttempted,
}: InstantStep2Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const descId = useId()
  const phenomId = useId()
  const dateId = useId()
  const locId = useId()
  const switchId = useId()

  // Autocomplete location (même hook que Encounter + Navbar)
  const [locSuggestionsOpen, setLocSuggestionsOpen] = useState(false)
  const { suggestions, isLoading: locLoading } = useLocationAutocomplete(locationName)

  function selectLocSuggestion(city: CityResult) {
    const parts = [city.name, city.departmentName, city.regionName].filter(Boolean)
    onLocationChange(parts.join(', '))
    onLocationCoordsChange?.(city.centroidLat, city.centroidLng)
    setLocSuggestionsOpen(false)
  }

  const today = new Date().toISOString().slice(0, 10)
  const locationPublic = !locationHidden

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground -mt-2">
        {t('contribute.panel.instantHint', {
          defaultValue: "Raconte ce qui t'a marqué, ajoute un contexte ou une émotion.",
        })}
      </p>

      {/* Titre */}
      <div className="flex flex-col gap-2">
        <label htmlFor={titleId} className="text-sm text-foreground">
          {t('contribute.title.label', { defaultValue: 'Titre' })}{' '}
          <span className="text-muted-foreground">
            ({t('common.optional', { defaultValue: 'optionnel' })})
          </span>
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, MAX_TITLE))}
          maxLength={MAX_TITLE}
          placeholder={t('contribute.title.placeholder', {
            defaultValue: "Un soir d'orage, La nuit du saumon...",
          })}
          className="w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-primary-light focus:border-primary"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label htmlFor={descId} className="text-sm text-foreground">
          {t('contribute.description.label', { defaultValue: 'Description' })}
        </label>
        <div className="relative">
          <textarea
            id={descId}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            maxLength={MAX_DESC}
            placeholder={t('contribute.description.instantPlaceholder', {
              defaultValue: 'Décris ce que tu as vu, ressenti, le contexte de la prise…',
            })}
            aria-invalid={!!(submitAttempted && errors.description)}
            className="w-full px-4 py-3 pb-7 rounded-2xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
          />
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
        {submitAttempted && errors.description && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {errors.description}
          </p>
        )}
      </div>

      {/* Phénomène */}
      <div className="flex flex-col gap-2">
        <label htmlFor={phenomId} className="text-sm text-foreground">
          {t('contribute.phenomenon.label', { defaultValue: 'Phénomène observé' })}{' '}
          <span className="text-muted-foreground">
            ({t('common.optional', { defaultValue: 'optionnel' })})
          </span>
        </label>
        <input
          id={phenomId}
          type="text"
          value={phenomenon}
          onChange={(e) => onPhenomenonChange(e.target.value.slice(0, MAX_PHENOM))}
          maxLength={MAX_PHENOM}
          placeholder={t('contribute.phenomenon.placeholder', {
            defaultValue: 'Aurore boréale, arc-en-ciel, brume matinale...',
          })}
          className="w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-primary-light focus:border-primary"
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2">
        <label htmlFor={dateId} className="text-sm text-foreground">
          {t('contribute.date.label', { defaultValue: "Date de l'observation" })}
        </label>
        <div className="relative">
          <Calendar
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={dateId}
            type="date"
            value={encounterDate}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground focus:outline-none focus:bg-primary-light focus:border-primary"
          />
        </div>
      </div>

      {/* Séparateur */}
      <hr className="border-0 border-t border-border my-2" aria-hidden="true" />

      {/* Localisation */}
      <div className="flex flex-col gap-2">
        <label htmlFor={locId} className="text-sm text-foreground">
          {t('contribute.location.label', { defaultValue: 'Localisation' })}
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={locId}
            type="text"
            value={locationName}
            onChange={(e) => {
              onLocationChange(e.target.value)
              onLocationCoordsChange?.(null, null)
              setLocSuggestionsOpen(e.target.value.trim().length >= 2)
            }}
            onFocus={() => locationName.trim().length >= 2 && setLocSuggestionsOpen(true)}
            placeholder={t('contribute.location.placeholder', {
              defaultValue: 'Rechercher une ville…',
            })}
            className="w-full h-10 pl-10 pr-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-primary-light focus:border-primary"
          />
          {locSuggestionsOpen && (suggestions.length > 0 || locLoading) && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-cream-lighter border border-border rounded-lg shadow-lg z-10 overflow-hidden">
              {locLoading && suggestions.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>Recherche en cours…</span>
                </div>
              )}
              {suggestions.length > 0 && (
                <ul role="listbox" aria-label="Suggestions de localisation">
                  {suggestions.map((city) => (
                    <li key={`${city.inseeCode}-${city.name}`} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => selectLocSuggestion(city)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary-light/40 transition-colors"
                      >
                        <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {city.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[city.departmentCode, city.regionName].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Switch publique */}
        <label htmlFor={switchId} className="flex items-center gap-3 cursor-pointer pt-1">
          <button
            id={switchId}
            type="button"
            role="switch"
            aria-checked={locationPublic}
            onClick={() => onLocationHiddenChange(!locationHidden)}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              locationPublic ? 'bg-primary' : 'bg-border',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={[
                'pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transition-transform mt-0.5',
                locationPublic ? 'translate-x-[1.4rem]' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
          <span className="text-sm text-foreground">
            {t('contribute.location.makePublic', {
              defaultValue: 'Rendre la localisation publique',
            })}
          </span>
        </label>
      </div>

      <hr className="border-0 border-t border-border my-2" aria-hidden="true" />

      {/* Moment de la journée */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground">
          {t('contribute.date.timeLabel', { defaultValue: 'Moment de la journée' })}
        </span>
        <div className="flex flex-wrap gap-2" role="group">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onTimeChange(timeOfDay === opt ? '' : opt)}
              aria-pressed={timeOfDay === opt}
              className={[
                'inline-flex items-center h-9 px-3 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                timeOfDay === opt
                  ? 'border-primary bg-primary-light text-foreground'
                  : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
              ].join(' ')}
            >
              {t(`contribute.date.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions météo */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground">
          {t('contribute.weather.label', { defaultValue: 'Conditions météo' })}
        </span>
        <div className="flex flex-wrap gap-2" role="group">
          {WEATHER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onWeatherChange(weather === opt ? '' : opt)}
              aria-pressed={weather === opt}
              className={[
                'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                weather === opt
                  ? 'border-primary bg-primary-light text-foreground'
                  : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
              ].join(' ')}
            >
              <span aria-hidden="true">{WEATHER_EMOJI[opt]}</span>
              {t(`contribute.weather.${opt}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
