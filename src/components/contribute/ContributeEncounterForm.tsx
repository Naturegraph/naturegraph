/**
 * ContributeEncounterForm — Panel latéral Rencontre Nature (3 étapes)
 *
 * Rendu sous forme de panneau droit fixe superposé au feed (design Figma v2).
 * Sur mobile le panneau prend toute la largeur de l'écran.
 *
 * Étape 1 : Photos + format d'affichage
 * Étape 2 : Carnet d'observations (espèces + compteurs)
 * Étape 3 : Contexte & détails (titre, description, date, lieu, visibilité)
 *
 * TODO [BACKEND] :
 *   1. Upload médias → Supabase Storage 'post-media'
 *   2. POST /posts { type: 'nature_encounter', ... }
 *   3. queryClient.invalidateQueries({ queryKey: ['feed'] })
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, HabitatType, Visibility } from '@/types/database'
import { EncounterStep1 } from './EncounterStep1'
import { EncounterStep2 } from './EncounterStep2'
import { EncounterStep3 } from './EncounterStep3'
import type { PhotoAspectRatio } from './EncounterStep1'
import type { ObservationEntry } from './EncounterStep2'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost } from '@/hooks/usePost'
import { uploadPostMedia } from '@/services/mediaService'
import { createProposal } from '@/services/identificationService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EncounterFormData {
  // Étape 1
  files: File[]
  aspectRatio: PhotoAspectRatio
  // Étape 2
  observations: ObservationEntry[]
  helpIdentification: boolean
  // Étape 3
  title: string
  description: string
  tags: string[]
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

interface ContributeEncounterFormProps {
  /** Ferme le panneau (retour au feed) */
  onClose: () => void
}

export function ContributeEncounterForm({ onClose }: ContributeEncounterFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const createPost = useCreatePost(user?.id ?? '')

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<EncounterFormData>({
    files: [],
    aspectRatio: 'landscape',
    observations: [],
    helpIdentification: false,
    title: '',
    description: '',
    tags: [],
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

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body quand le panneau est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function set<K extends keyof EncounterFormData>(key: K, value: EncounterFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as string])
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== (key as string))),
      )
  }

  // ── Gestion carnet d'observations (étape 2) ──────────────────────────────

  function handleAddObservation(entry: ObservationEntry) {
    setForm((prev) => ({ ...prev, observations: [...prev.observations, entry] }))
  }

  function handleRemoveObservation(id: string) {
    setForm((prev) => ({
      ...prev,
      observations: prev.observations.filter((o) => o.id !== id),
    }))
  }

  function handleCountChange(id: string, delta: number) {
    setForm((prev) => ({
      ...prev,
      observations: prev.observations.map((o) =>
        o.id === id ? { ...o, count: Math.max(1, o.count + delta) } : o,
      ),
    }))
  }

  // ── Navigation entre étapes ──────────────────────────────────────────────

  /** Validation step 3 avant soumission */
  function validateStep3() {
    const e: Record<string, string> = {}
    if (!form.description.trim()) e.description = t('contribute.errors.descriptionRequired')
    if (form.description.length > 1500)
      e.description = t('contribute.errors.descriptionTooLong', { max: 1500 })
    return e
  }

  function handleNext() {
    setErrors({})
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  /** Retour à l'étape précédente, ou ferme le panneau depuis l'étape 1 */
  function handleBack() {
    setErrors({})
    if (step === 1) {
      onClose()
      return
    }
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateStep3()
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
    try {
      // 1. Premier observation identifiée → champs species_* du post
      const firstKnown = form.observations.find((o) => !o.isUnknown && o.species)

      const post = await createPost.mutateAsync({
        type: 'nature_encounter',
        description: form.description.trim(),
        visibility: form.visibility,
        encounter_date: form.encounterDate,
        time_of_day: form.timeOfDay || undefined,
        weather: form.weather || undefined,
        habitat: form.habitat || undefined,
        location_name: form.locationName || undefined,
        location_hidden: form.locationHidden,
        tags: form.tags,
        species_name: firstKnown?.species?.commonName ?? undefined,
        scientific_name: firstKnown?.species?.scientificName ?? undefined,
        taxonomic_group: firstKnown?.species?.group ?? undefined,
      })

      // 2. Upload des médias
      for (let i = 0; i < form.files.length; i++) {
        await uploadPostMedia({
          file: form.files[i],
          postId: post.id,
          userId: user.id,
          displayOrder: i,
        })
      }

      // 3. Si demande d'aide à l'identification : crée une proposition vide
      //    pour signaler que le post attend une identification collaborative
      if (form.helpIdentification && !firstKnown) {
        await createProposal(user.id, {
          post_id: post.id,
          species_name: '?',
          notes: "Aide à l'identification demandée par l'auteur",
        })
      }

      onClose()
    } catch (err) {
      setErrors({
        description: err instanceof Error ? err.message : 'Erreur lors de la publication',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Titres par étape ─────────────────────────────────────────────────────

  const stepTitles: Record<number, string> = {
    1: t('contribute.panel.immortaliseEncounter'),
    2: t('contribute.panel.whatObserved'),
    3: t('contribute.panel.moreDetails'),
  }

  return (
    <>
      {/* ── Backdrop — clic ferme le panneau ────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:block hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panneau droit ────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('contribute.encounterTitle')}
        className="fixed inset-y-0 right-0 z-50 w-full md:w-[380px] bg-cream-lighter flex flex-col shadow-2xl"
      >
        {/* ── Header sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0">
          <div className="flex items-center justify-between px-5 py-4">
            {/* Badge type */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal text-white text-xs font-bold">
              <span aria-hidden="true">🦅</span>
              {t('contribute.encounterTitle')}
            </span>

            {/* Étape */}
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {t('contribute.step', { current: step, total: TOTAL_STEPS })}
            </span>

            {/* Fermer */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Barre de progression — 3 segments */}
          <div
            className="flex gap-1 px-5 pb-3"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label={t('contribute.step', { current: step, total: TOTAL_STEPS })}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={[
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  step >= i ? 'bg-teal' : 'bg-muted',
                ].join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="h-px bg-border" aria-hidden="true" />
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="encounter-panel-form"
            onSubmit={handleSubmit}
            noValidate
            className="px-5 pt-5 pb-4 flex flex-col gap-1"
          >
            {/* Titre de l'étape */}
            <h2 className="font-title font-bold text-lg text-foreground mb-4">
              {stepTitles[step]}
            </h2>

            {step === 1 && (
              <EncounterStep1
                files={form.files}
                onFilesChange={(f) => set('files', f)}
                aspectRatio={form.aspectRatio}
                onAspectRatioChange={(r) => set('aspectRatio', r)}
                error={errors.files}
              />
            )}

            {step === 2 && (
              <EncounterStep2
                observations={form.observations}
                onAdd={handleAddObservation}
                onRemove={handleRemoveObservation}
                onCountChange={handleCountChange}
                helpIdentification={form.helpIdentification}
                onHelpIdentificationChange={(v) => set('helpIdentification', v)}
              />
            )}

            {step === 3 && (
              <EncounterStep3
                title={form.title}
                onTitleChange={(v) => set('title', v)}
                description={form.description}
                onDescriptionChange={(v) => set('description', v)}
                tags={form.tags}
                onTagsChange={(tgs) => set('tags', tgs)}
                errors={errors}
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
        </div>

        {/* ── Footer sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-cream-lighter px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {/* Bouton retour */}
            <button
              type="button"
              onClick={handleBack}
              aria-label={step === 1 ? t('common.close') : t('common.back')}
              className="size-11 shrink-0 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>

            {/* CTA principal */}
            {step < TOTAL_STEPS ? (
              /* Étape 2 vide : "Je ne connais pas l'espèce" comme CTA secondaire */
              step === 2 && form.observations.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Ajoute une entrée "espèce inconnue" puis avance
                    handleAddObservation({
                      id: `obs-unknown-${Date.now()}`,
                      species: null,
                      isUnknown: true,
                      count: 1,
                    })
                    handleNext()
                  }}
                  className="flex-1 h-11 rounded-button bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('contribute.panel.dontKnow')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 h-11 rounded-button bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('common.next')}
                </button>
              )
            ) : (
              <button
                type="submit"
                form="encounter-panel-form"
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-button bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {isSubmitting ? t('common.loading') : t('contribute.panel.publishBtn')}
              </button>
            )}
          </div>

          {/* Lien "continuer sans photo" — étape 1 uniquement */}
          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors focus-visible:outline-none focus-visible:underline"
            >
              {t('contribute.panel.skipPhotos')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
