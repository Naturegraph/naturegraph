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
import { ArrowLeft, X, Calendar, Info, MapPin, Loader2, ImageUp } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, DisplayFormat } from '@/types/database'
import { EncounterStep1 } from './EncounterStep1'
import type { PhotoMetadata } from '@/utils/extractPhotoMetadata'
import { useContributePostSubmit } from '@/hooks/useContributePostSubmit'
import { readDraft, useDraftAutoSave, clearDraft } from '@/hooks/useContributeDraft'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
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
  /** Pays déduit de la source autocomplete (FR / CA). */
  locationCountry: string | null
  /** Région issue de l'autocomplete (ex « Québec », « Pays de la Loire »). */
  locationRegion: string | null
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
  /**
   * Si défini : panneau en mode ÉDITION du post Instant existant. Les champs
   * sont pré-remplis depuis la base au mount, et le submit appelle
   * updatePost() au lieu de createPost() (Nicolas 2026-05-24).
   */
  editingPostId?: string
}

export function ContributeInstantPanel({ onClose, editingPostId }: ContributeInstantPanelProps) {
  const { t } = useTranslation()
  // V1.1.4 NG-025 (Nicolas 2026-06-03) : toast user-facing pour piéger les
  // exceptions silencieuses qui faisaient que le bouton Publier semblait
  // inerte. Cf retour Nicolas en QA dev.
  const toast = useToast()

  // Pipeline submit factorisé (cf. useContributePostSubmit) — identique
  // à ContributeEncounterForm pour garantir le même comportement watchdog
  // + compression + upload média + rollback.
  const { submit, isSubmitting, uploadProgress, uploadError, clearError } =
    useContributePostSubmit('ContributeInstantPanel')

  // NG-004 (Nicolas 2026-05-31) : auto-save brouillon TTL 30 min + reprise
  // a l etape ou l user etait (retour QA "je dois tout reprendre").
  const DRAFT_KEY = 'instant-v1'
  type DraftPayload = Omit<InstantFormData, 'files'> & { step?: number }
  const restoredDraft = !editingPostId ? readDraft<DraftPayload>(DRAFT_KEY) : null

  // En edition -> step 2 (details). Sinon : reprend l etape memorisee (cap 1
  // car sans Files persistees, step 2 a besoin d au moins une photo).
  // Pour InstantPanel il n y a que 2 etapes donc on reprend step 1 par defaut
  // si brouillon (l user voit ses metadonnees deja saisies au prochain step).
  const [step, setStep] = useState(() => {
    if (editingPostId) return 2
    return 1
  })
  const [form, setForm] = useState<InstantFormData>(() => {
    const defaults: InstantFormData = {
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
      locationCountry: null,
      locationRegion: null,
      locationHidden: true,
    }
    return restoredDraft ? { ...defaults, ...restoredDraft, files: [] } : defaults
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  // V1.1.4 NG-024 (Nicolas 2026-06-01) : photos existantes en mode edition,
  // strict alignement avec ContributeEncounterForm. Storage path reconstruit
  // depuis l URL publique (la colonne n existe pas en DB).
  const [existingMedia, setExistingMedia] = useState<
    Array<{ id: string; url: string; storagePath: string }>
  >([])

  // ── Pré-remplissage en mode édition ─────────────────────────────────────
  // Fetch les valeurs du post Instant au mount et init le form. On saute
  // directement à l'étape 2 (détails) car les photos existantes restent
  // attachées au post.
  useEffect(() => {
    if (!editingPostId || !supabase) return
    let cancelled = false
    ;(async () => {
      const { data: post, error } = await supabase
        .from('posts')
        .select(
          'title, description, encounter_date, time_of_day, weather, location_name, latitude, longitude, country, region, location_hidden, tags, display_format',
        )
        .eq('id', editingPostId)
        .maybeSingle()
      if (cancelled || error || !post) return
      // Reconstruit la sélection de phénomène depuis tags[0] (le label).
      const tagLabel = (post.tags as string[] | null)?.[0]
      const phenomenonId =
        (PHENOMENON_OPTIONS.find((o) => o.label === tagLabel)?.id as PhenomenonId | undefined) ?? ''
      setForm((prev) => ({
        ...prev,
        title: post.title ?? '',
        description: post.description ?? '',
        encounterDate: post.encounter_date ?? prev.encounterDate,
        timeOfDay: (post.time_of_day ?? '') as InstantFormData['timeOfDay'],
        weather: (post.weather ?? '') as InstantFormData['weather'],
        phenomenon: phenomenonId,
        locationName: post.location_name ?? '',
        locationLat: post.latitude ?? null,
        locationLng: post.longitude ?? null,
        locationCountry: post.country ?? null,
        locationRegion: post.region ?? null,
        locationHidden: post.location_hidden ?? true,
        displayFormat: (post.display_format ?? '16:9') as DisplayFormat,
      }))

      // V1.1.4 NG-024 : fetch les medias existants pour les afficher en step 1
      // avec exactement la meme UI que la creation (BigPreview + ThumbRow).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mediaRaw, error: mediaErr } = await (supabase as any)
        .from('media')
        .select('id, url, display_order')
        .eq('post_id', editingPostId)
        .order('display_order', { ascending: true })
      if (mediaErr) {
        console.error('[ContributeInstantPanel] fetch media error :', mediaErr)
      }
      if (!cancelled && Array.isArray(mediaRaw)) {
        setExistingMedia(
          mediaRaw.map((m: { id: string; url: string }) => {
            const marker = '/post-media/'
            const idx = m.url.indexOf(marker)
            const storagePath = idx >= 0 ? m.url.slice(idx + marker.length).split('?')[0] : ''
            return { id: m.id, url: m.url, storagePath }
          }),
        )
      }

      setStep(2)
    })()
    return () => {
      cancelled = true
    }
  }, [editingPostId])

  // NG-004 auto-save brouillon (sans les Files) toutes les ~1s. Desactive
  // en mode edition (le state vient de la DB, pas pertinent de le sauver).
  useDraftAutoSave<DraftPayload>(
    DRAFT_KEY,
    {
      displayFormat: form.displayFormat,
      photoMetadata: form.photoMetadata,
      title: form.title,
      description: form.description,
      encounterDate: form.encounterDate,
      timeOfDay: form.timeOfDay,
      weather: form.weather,
      phenomenon: form.phenomenon,
      locationName: form.locationName,
      locationLat: form.locationLat,
      locationLng: form.locationLng,
      locationCountry: form.locationCountry,
      locationRegion: form.locationRegion,
      locationHidden: form.locationHidden,
      step,
    },
    !editingPostId,
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

  async function handleSubmit(e: React.FormEvent | React.SyntheticEvent) {
    e.preventDefault()
    // V1.1.4 NG-025 (Nicolas 2026-06-03) : trace robuste pour diagnostiquer
    // les cas "bouton ne reagit pas du tout". Tout passe ici, donc si
    // ce log n'apparait pas le clic n'arrive pas au handler.
    console.info('[ContributeInstantPanel] handleSubmit triggered', {
      step,
      totalSteps: TOTAL_STEPS,
      isSubmitting,
      filesCount: form.files.length,
      descLen: form.description.length,
    })

    if (step < TOTAL_STEPS) {
      handleNext()
      return
    }

    // Try/catch global : toute exception non capturee remontait sans feedback
    // visible (le bouton paraissait inerte). On surface via toast.
    try {
      setSubmitAttempted(true)
      const errs = validateStep2()
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        console.info('[ContributeInstantPanel] validation errors', errs)
        return
      }

      // Décompose le label localisation → city / region pour FeedPost.
      const locSegments = form.locationName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const cityFromInput = locSegments[0] || undefined
      const regionFromInput = locSegments[locSegments.length - 1] || undefined

      // Phenomenon stocké en tags (la colonne posts.phenomenon existe en DB
      // mais l'UI feed ne l'expose pas encore, tag = workaround simple).
      const phenomenonLabel = form.phenomenon
        ? PHENOMENON_OPTIONS.find((o) => o.id === form.phenomenon)?.label
        : undefined

      // time-of-day : valeur saisie > fallback EXIF de la photo.
      const timeOfDay = form.timeOfDay || form.photoMetadata.timeOfDay || undefined

      console.info('[ContributeInstantPanel] calling submit()')
      await submit({
        payload: {
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
            form.locationRegion ??
            (regionFromInput && regionFromInput !== cityFromInput ? regionFromInput : undefined),
          latitude: form.locationLat ?? undefined,
          longitude: form.locationLng ?? undefined,
          country: form.locationCountry ?? undefined,
          location_hidden: form.locationHidden,
          tags: phenomenonLabel ? [phenomenonLabel] : [],
          display_format: form.displayFormat,
        },
        files: form.files,
        editingPostId,
        onSuccess: async () => {
          // NG-004 : succes -> purge le brouillon.
          clearDraft(DRAFT_KEY)
          onClose()
        },
      })
    } catch (err) {
      console.error('[ContributeInstantPanel] handleSubmit FAILED', err)
      toast.error(
        t('contribute.errors.submitFailed', {
          defaultValue: 'Impossible de publier pour le moment.',
        }),
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  const stepTitles: Record<number, string> = {
    1: t('contribute.panel.immortaliseInstant', { defaultValue: 'Immortalise ta rencontre !' }),
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
            <h2 className="font-title font-bold text-lg text-foreground mb-1">
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
                existingMedia={editingPostId ? existingMedia : undefined}
                onRemoveExistingMedia={async (mediaId, storagePath) => {
                  setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId))
                  try {
                    const { deletePostMedia } = await import('@/services/mediaService')
                    await deletePostMedia(mediaId, storagePath)
                  } catch (err) {
                    console.error('[ContributeInstantPanel] delete media failed:', err)
                  }
                }}
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
                onLocationCoordsChange={(lat, lng, country, region) => {
                  setForm((prev) => ({
                    ...prev,
                    locationLat: lat,
                    locationLng: lng,
                    locationCountry: country ?? prev.locationCountry,
                    locationRegion: region ?? prev.locationRegion,
                  }))
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
                onClick={clearError}
                aria-label={t('common.close')}
                className="size-6 shrink-0 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Toast progression upload (même pattern que Encounter — informe sur
            connexion lente). Affiché uniquement durant le submit. */}
        {uploadProgress && (
          <div
            role="status"
            aria-live="polite"
            className="shrink-0 mx-5 mb-3 rounded-card bg-background border border-border shadow-md overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="size-10 shrink-0 rounded-full bg-primary-light/40 text-primary flex items-center justify-center">
                <ImageUp className="size-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {t('contribute.media.uploadingTitle', {
                      defaultValue: 'Importation en cours !',
                    })}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('contribute.media.uploadingHint', {
                    defaultValue: 'Nous importons tes photos. Cela peut prendre quelques secondes…',
                  })}
                </p>
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)} %
              </span>
            </div>
          </div>
        )}

        {/* Footer sticky — boutons + hint « sans photo » en dessous (cohérent Encounter) */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
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
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                  {t('common.loading')}
                </span>
              ) : step < TOTAL_STEPS ? (
                t('common.next', { defaultValue: 'Suivant' })
              ) : editingPostId ? (
                t('contribute.panel.updateBtn', { defaultValue: 'Mettre à jour' })
              ) : (
                t('contribute.publish', { defaultValue: 'Publier' })
              )}
            </Button>
          </div>

          {/* Lien « continuer sans photo » — étape 1 uniquement, sous les
              boutons (même pattern que Encounter). Clic = avance step. */}
          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors focus-visible:outline-none focus-visible:underline"
            >
              {t('contribute.instant.photoOptionalHint', {
                defaultValue: 'Tu peux aussi poursuivre sans ajouter de photo.',
              })}
            </button>
          )}
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
  onLocationCoordsChange?: (
    lat: number | null,
    lng: number | null,
    country?: string | null,
    region?: string | null,
  ) => void
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
    onLocationCoordsChange?.(city.centroidLat, city.centroidLng, city.country, city.regionName)
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
          className="w-full h-11 px-4 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
            className="w-full px-4 py-3 pb-7 rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
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
            className="date-input-clean w-full h-11 pl-4 pr-10 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
            className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
                    : 'border-border bg-background text-foreground hover:border-primary/50',
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
                    : 'border-border bg-background text-foreground hover:border-primary/50',
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
                    : 'border-border bg-background text-foreground hover:border-primary/50',
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
