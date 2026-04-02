/**
 * ContributeEncounterForm — Orchestrateur du formulaire Rencontre Nature (3 étapes)
 *
 * Étape 1 : Photos + description + tags
 * Étape 2 : Identification de l'espèce
 * Étape 3 : Contexte (météo, habitat, lieu, date, visibilité)
 *
 * Type de post créé : 'nature_encounter'
 *
 * TODO [BACKEND] — Brancher la création de post :
 *   1. Upload médias → Supabase Storage bucket 'post-media'
 *   2. Insérer le post → table 'posts' (type: 'nature_encounter')
 *   3. Invalider le cache : queryClient.invalidateQueries({ queryKey: ['feed'] })
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, Send } from 'lucide-react'
import type {
  TimeOfDay,
  WeatherCondition,
  HabitatType,
  Visibility,
  TaxonomicGroup,
} from '@/types/database'
import type { MockSpecies } from './SpeciesSearch'
import { EncounterStep1 } from './EncounterStep1'
import { EncounterStep2 } from './EncounterStep2'
import { EncounterStep3 } from './EncounterStep3'

// ─── Types ────────────────────────────────────────────────────────────────────

type IdentificationChoice = 'identified' | 'pending' | 'unknown'

interface EncounterFormData {
  // Étape 1
  files: File[]
  description: string
  tags: string[]
  // Étape 2
  identificationChoice: IdentificationChoice
  selectedSpecies: MockSpecies | null
  taxonomicGroup: TaxonomicGroup | ''
  multipleObservations: boolean
  // Étape 3
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  weather: WeatherCondition | ''
  habitat: HabitatType | ''
  locationName: string
  locationHidden: boolean
  visibility: Visibility
}

const TOTAL_STEPS = 3

// ─── Composant ────────────────────────────────────────────────────────────────

export function ContributeEncounterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<EncounterFormData>({
    files: [],
    description: '',
    tags: [],
    identificationChoice: 'pending',
    selectedSpecies: null,
    taxonomicGroup: '',
    multipleObservations: false,
    encounterDate: new Date().toISOString().slice(0, 10),
    timeOfDay: '',
    weather: '',
    habitat: '',
    locationName: '',
    locationHidden: false,
    visibility: 'public',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function set<K extends keyof EncounterFormData>(key: K, value: EncounterFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as string])
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== (key as string))),
      )
  }

  /** Validation de l'étape 1 avant passage à l'étape 2 */
  function validateStep1() {
    const e: Record<string, string> = {}
    if (form.files.length === 0) e.files = t('contribute.errors.mediaRequired')
    if (!form.description.trim()) e.description = t('contribute.errors.descriptionRequired')
    return e
  }

  function handleNext() {
    if (step === 1) {
      const errs = validateStep1()
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
    }
    setErrors({})
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack() {
    setErrors({})
    if (step === 1) {
      navigate(-1)
      return
    }
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    // TODO [BACKEND] — Remplacer par l'appel réel (voir en-tête du fichier)
    console.info('[MOCK] Rencontre Nature :', { type: 'nature_encounter', ...form })
    await new Promise((r) => setTimeout(r, 600))
    navigate('/home')
  }

  const progressPct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 md:px-6 h-16">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {step === 1 ? t('contribute.backToFeed') : t('common.back')}
            </span>
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <h1 className="font-bold text-foreground text-sm">{t('contribute.encounterTitle')}</h1>
            <span className="text-xs text-muted-foreground">
              {t('contribute.step', { current: step, total: TOTAL_STEPS })}
            </span>
          </div>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 h-9 px-4 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('common.next')}
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              form="encounter-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 h-9 px-4 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Send className="size-4" aria-hidden="true" />
              {isSubmitting ? t('common.loading') : t('contribute.publish')}
            </button>
          )}
        </div>

        {/* Barre de progression — annotée pour les lecteurs d'écran */}
        <div
          className="h-1 bg-muted"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('contribute.step', { current: step, total: TOTAL_STEPS })}
        >
          <div
            className="h-full bg-primary motion-safe:transition-all motion-safe:duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Contenu */}
      <main id="main-content">
        <form
          id="encounter-form"
          onSubmit={handleSubmit}
          noValidate
          className="max-w-2xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6 pb-24 md:pb-6"
        >
          {/* Titre de l'étape courante */}
          <p className="text-xs font-medium text-primary uppercase tracking-wide">
            {t(`contribute.steps.step${step}`)}
          </p>

          {step === 1 && (
            <EncounterStep1
              files={form.files}
              onFilesChange={(f) => set('files', f)}
              description={form.description}
              onDescriptionChange={(v) => set('description', v)}
              tags={form.tags}
              onTagsChange={(t) => set('tags', t)}
              errors={errors}
            />
          )}

          {step === 2 && (
            <EncounterStep2
              identificationChoice={form.identificationChoice}
              onIdentificationChange={(v) => set('identificationChoice', v)}
              selectedSpecies={form.selectedSpecies}
              onSelectSpecies={(s) => set('selectedSpecies', s)}
              onClearSpecies={() => set('selectedSpecies', null)}
              taxonomicGroup={form.taxonomicGroup}
              onGroupChange={(g) => set('taxonomicGroup', g)}
              multipleObservations={form.multipleObservations}
              onMultipleChange={(v) => set('multipleObservations', v)}
            />
          )}

          {step === 3 && (
            <EncounterStep3
              encounterDate={form.encounterDate}
              onDateChange={(v) => set('encounterDate', v)}
              timeOfDay={form.timeOfDay}
              onTimeChange={(v) => set('timeOfDay', v)}
              weather={form.weather}
              onWeatherChange={(v) => set('weather', v)}
              habitat={form.habitat}
              onHabitatChange={(v) => set('habitat', v)}
              locationName={form.locationName}
              onLocationChange={(v) => set('locationName', v)}
              locationHidden={form.locationHidden}
              onLocationHiddenChange={(v) => set('locationHidden', v)}
              visibility={form.visibility}
              onVisibilityChange={(v) => set('visibility', v)}
            />
          )}
        </form>
      </main>
    </div>
  )
}
