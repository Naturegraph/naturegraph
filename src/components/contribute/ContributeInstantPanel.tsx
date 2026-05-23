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
 *
 * Différences avec Encounter :
 *   - 2 étapes seulement (Photos → Détails) — pas de carnet d'espèces
 *   - Pas de champ habitat (spécifique aux observations)
 *   - Type de phénomène sélectionné via chips (au lieu de free text)
 *   - Couleur thème amber (vs teal pour Encounter)
 *
 * Type DB : 'nature_instant'
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, Calendar, Info, MapPin, Loader2 } from 'lucide-react'
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

// ─── Types ───────────────────────────────────────────────────────────────────

/** Types de phénomènes (selon Nicolas — chips Step 2). */
const PHENOMENON_OPTIONS = [
  { id: 'aurora_borealis', label: 'Aurore boréale', emoji: '🌌' },
  { id: 'rainbow', label: 'Arc-en-ciel', emoji: '🌈' },
  { id: 'storm', label: 'Tempête', emoji: '🌪️' },
  { id: 'eclipse', label: 'Éclipse', emoji: '🌒' },
  { id: 'comet', label: 'Comète', emoji: '☄️' },
  { id: 'tide', label: 'Marée', emoji: '🌊' },
  { id: 'ice', label: 'Glace', emoji: '❄️' },
  { id: 'wildfire', label: 'Feu de forêt', emoji: '🔥' },
  { id: 'lightning', label: 'Foudre', emoji: '⚡' },
  { id: 'volcanic_eruption', label: 'Éruption volcanique', emoji: '🌋' },
] as const
type PhenomenonId = (typeof PHENOMENON_OPTIONS)[number]['id']

interface InstantFormData {
  files: File[]
  displayFormat: DisplayFormat
  photoMetadata: PhotoMetadata
  title: string
  description: string
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  weather: WeatherCondition | ''
  phenomenon: PhenomenonId | ''
  locationName: string
  locationLat: number | null
  locationLng: number | null
  locationHidden: boolean
}

const TOTAL_STEPS = 2
const MAX_DESC = 1500
const MAX_TITLE = 80

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
    if (form.description.length > MAX_DESC) {
      e.description = t('contribute.errors.descriptionTooLong', { max: MAX_DESC })
    }
    return e
  }

  function handleNext(e?: React.MouseEvent | React.SyntheticEvent) {
    e?.preventDefault?.()
    // Photos optionnelles (cohérent Encounter) — un user peut juste
    // raconter un moment de nature sans photo (Nicolas 2026-05-23).
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
      const timeOfDay = form.timeOfDay || form.photoMetadata.timeOfDay || undefined

      const locSegments = form.locationName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const cityFromInput = locSegments[0] || undefined
      const regionFromInput = locSegments[locSegments.length - 1] || undefined

      const phenomenonLabel = form.phenomenon
        ? PHENOMENON_OPTIONS.find((o) => o.id === form.phenomenon)?.label
        : undefined

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
          // Phenomenon stocké en tags (la colonne posts.phenomenon existe en
          // DB mais l'UI feed ne l'expose pas encore — tag = workaround simple).
          tags: phenomenonLabel ? [phenomenonLabel] : [],
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
    2: t('contribute.panel.moreDetails', { defaultValue: 'Plus de détails' }),
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
        // Background blanc (bg-background) au lieu de cream-lighter pour
        // bien distinguer Instant vs Encounter (Nicolas 2026-05-23).
        className="fixed inset-y-0 right-0 z-[60] w-full md:w-[440px] bg-background flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3 bg-background">
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
        <div className="flex-1 overflow-y-auto bg-background">
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
                encounterDate={form.encounterDate}
                onDateChange={(v) => set('encounterDate', v)}
                timeOfDay={form.timeOfDay}
                onTimeChange={(v) => set('timeOfDay', v)}
                weather={form.weather}
                onWeatherChange={(v) => set('weather', v)}
                phenomenon={form.phenomenon}
                onPhenomenonChange={(v) => set('phenomenon', v)}
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

        {/* Helper text — visible uniquement step 1, photos optionnelles. */}
        {step === 1 && (
          <p className="shrink-0 px-5 pb-2 text-xs text-muted-foreground text-center bg-background">
            {t('contribute.instant.photoOptionalHint', {
              defaultValue: 'Tu peux aussi poursuivre sans ajouter de photo.',
            })}
          </p>
        )}

        {/* Footer sticky */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 flex gap-3 items-center">
          <button
            type="button"
            onClick={handleBack}
            aria-label={
              step === 1
                ? t('common.cancel', { defaultValue: 'Annuler' })
                : t('common.back', { defaultValue: 'Précédent' })
            }
            className="shrink-0 size-12 rounded-full border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>

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
  encounterDate: string
  onDateChange: (v: string) => void
  timeOfDay: TimeOfDay | ''
  onTimeChange: (v: TimeOfDay | '') => void
  weather: WeatherCondition | ''
  onWeatherChange: (v: WeatherCondition | '') => void
  phenomenon: PhenomenonId | ''
  onPhenomenonChange: (v: PhenomenonId | '') => void
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
  encounterDate,
  onDateChange,
  timeOfDay,
  onTimeChange,
  weather,
  onWeatherChange,
  phenomenon,
  onPhenomenonChange,
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
  const dateId = useId()
  const locId = useId()
  const switchId = useId()

  // Popover info localisation — même UX qu'Encounter.
  const [locationInfoOpen, setLocationInfoOpen] = useState(false)
  const locationInfoRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!locationInfoOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLocationInfoOpen(false)
    }
    function onClickOutside(e: MouseEvent) {
      if (locationInfoRef.current && !locationInfoRef.current.contains(e.target as Node)) {
        setLocationInfoOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [locationInfoOpen])

  // Autocomplete location — même hook que Encounter / Navbar.
  const [locSuggestionsOpen, setLocSuggestionsOpen] = useState(false)
  const locInputRef = useRef<HTMLDivElement | null>(null)
  const { suggestions, isLoading: locLoading } = useLocationAutocomplete(locationName)

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
          defaultValue:
            'Décris les conditions, le phénomène naturel ou tout ce qui te semble important !',
        })}
      </p>

      {/* Titre (optionnel) — sans placeholder */}
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
          className="w-full h-11 px-4 rounded-full border border-border bg-cream-lighter text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
              defaultValue: 'Décris ce moment de nature…',
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

      {/* Date (sans suffixe « de l'observation » — demandé Nicolas) */}
      <div className="flex flex-col gap-2">
        <label htmlFor={dateId} className="text-sm text-foreground">
          {t('contribute.date.simpleLabel', { defaultValue: 'Date' })}
        </label>
        <div className="relative">
          <input
            id={dateId}
            type="date"
            value={encounterDate}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input-clean w-full h-11 pl-4 pr-10 rounded-full border border-border bg-cream-lighter text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <Calendar
            className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Localisation + info popover + autocomplete + switch — design Encounter */}
      <div className="flex flex-col gap-2">
        <div className="relative flex items-center gap-1.5" ref={locationInfoRef}>
          <label htmlFor={locId} className="text-sm text-foreground">
            {t('contribute.location.label', { defaultValue: 'Localisation' })}
          </label>
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
            className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />

          {locSuggestionsOpen && (suggestions.length > 0 || locLoading) && (
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
              {suggestions.map((city) => (
                <li key={city.inseeCode} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handlePickCity(city)
                    }}
                    className="w-full flex items-start gap-2 px-4 py-2.5 text-left hover:bg-primary-light/30 transition-colors focus-visible:outline-none focus-visible:bg-primary-light/40"
                  >
                    <MapPin className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {city.name}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {city.departmentCode} · {city.regionName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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

      {/* Séparateur unique entre Localisation et les 3 sections de chips */}
      <hr className="border-0 border-t border-border my-2" aria-hidden="true" />

      {/* Type de phénomène */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground">
          {t('contribute.phenomenon.label', { defaultValue: 'Type de phénomène ?' })}
        </span>
        <div className="flex flex-wrap gap-2" role="group">
          {PHENOMENON_OPTIONS.map((opt) => {
            const active = phenomenon === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPhenomenonChange(active ? '' : opt.id)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'border-primary bg-primary-light text-foreground'
                    : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
                ].join(' ')}
              >
                <span aria-hidden="true">{opt.emoji}</span>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conditions de prise de vue (météo) */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground">
          {t('contribute.weather.captureLabel', { defaultValue: 'Conditions de prise de vue' })}
        </span>
        <div className="flex flex-wrap gap-2" role="group">
          {WEATHER_OPTIONS.map((opt) => {
            const active = weather === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onWeatherChange(active ? '' : opt)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'border-primary bg-primary-light text-foreground'
                    : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
                ].join(' ')}
              >
                <span aria-hidden="true">{WEATHER_EMOJI[opt]}</span>
                {t(`contribute.weather.${opt}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Moment de la journée */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground">
          {t('contribute.date.timeLabel', { defaultValue: 'Moment de la journée' })}
        </span>
        <div className="flex flex-wrap gap-2" role="group">
          {TIME_OPTIONS.map((opt) => {
            const active = timeOfDay === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onTimeChange(active ? '' : opt)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center h-9 px-3 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'border-primary bg-primary-light text-foreground'
                    : 'border-border bg-cream-lighter text-foreground hover:border-primary/50',
                ].join(' ')}
              >
                {t(`contribute.date.${opt}`)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
