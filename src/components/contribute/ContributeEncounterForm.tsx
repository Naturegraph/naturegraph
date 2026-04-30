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
import { ArrowLeft, X, ImageOff, RotateCcw, ImageUp } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, HabitatType, DisplayFormat } from '@/types/database'
import { EncounterStep1 } from './EncounterStep1'
import { EncounterStep2 } from './EncounterStep2'
import { EncounterStep3 } from './EncounterStep3'
import type { ObservationEntry } from './EncounterStep2'
import { compressPhoto } from '@/utils/compressPhoto'
import type { PhotoMetadata } from '@/utils/extractPhotoMetadata'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost } from '@/hooks/usePost'
import { FEED_QUERY_KEY } from '@/hooks/useFeed'
import { uploadPostMedia } from '@/services/mediaService'
import { createProposal } from '@/services/identificationService'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * État du formulaire Rencontre — Figma v3 (complet) :
 *   Étape 3 collecte Titre (optionnel), Description*, Date, Localisation +
 *   Options avancées repliables : habitat / météo / moment de la journée.
 *   Visibilité pilotée par le switch de localisation ; défaut 'public'.
 */
interface EncounterFormData {
  // Étape 1
  files: File[]
  /** Format d'affichage choisi par l'utilisateur (Figma 6385:47324) — Paysage
   *  16:9 par défaut, l'utilisateur peut basculer en Portrait 3:4 ou Carré 1:1. */
  displayFormat: DisplayFormat
  /** Métadonnées EXIF agrégées (date/GPS/time-of-day) pour l'étape 3. */
  photoMetadata: PhotoMetadata
  // Étape 2
  observations: ObservationEntry[]
  helpIdentification: boolean
  // Étape 3
  title: string
  description: string
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  weather: WeatherCondition | ''
  habitat: HabitatType | ''
  locationName: string
  /** true = lat/lng masquées publiquement (seule la région est visible). */
  locationHidden: boolean
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
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  // Toast d'erreur upload (Figma 6385:56334) — message + auto-hide après 5s.
  // Pas de toast de succès : l'utilisateur voit le post apparaître dans le feed.
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState<EncounterFormData>({
    files: [],
    displayFormat: '16:9',
    photoMetadata: {},
    observations: [],
    helpIdentification: false,
    title: '',
    description: '',
    encounterDate: new Date().toISOString().slice(0, 10),
    timeOfDay: '',
    weather: '',
    habitat: '',
    locationName: '',
    // Par défaut la localisation précise est masquée (sobriété privacy) ;
    // l'utilisateur peut activer le switch « rendre public » à l'étape 3.
    locationHidden: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Progression upload par photo — alimentée par la boucle d'upload, lue par
  // le footer du panneau pour informer l'utilisateur en temps réel.
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

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
    let createdPostId: string | null = null
    try {
      // 1. Premier observation identifiée → champs species_* du post
      const firstKnown = form.observations.find((o) => !o.isUnknown && o.species)

      // time-of-day : valeur saisie > fallback EXIF (ex : photo du matin)
      const timeOfDay = form.timeOfDay || form.photoMetadata.timeOfDay || undefined

      const post = await createPost.mutateAsync({
        type: 'nature_encounter',
        title: form.title.trim() || undefined,
        description: form.description.trim(),
        // Visibilité par défaut 'public' — plus de sélecteur dans l'UI Figma v3.
        // La granularité GPS est pilotée séparément via `location_hidden`.
        visibility: 'public',
        encounter_date: form.encounterDate,
        time_of_day: timeOfDay,
        weather: form.weather || undefined,
        habitat: form.habitat || undefined,
        location_name: form.locationName || undefined,
        location_hidden: form.locationHidden,
        species_name: firstKnown?.species?.commonName ?? undefined,
        scientific_name: firstKnown?.species?.scientificName ?? undefined,
        taxonomic_group: firstKnown?.species?.group ?? undefined,
        // Format d'affichage Figma — repris par FeedSection pour le rendu post.
        display_format: form.displayFormat,
      })
      createdPostId = post.id

      // 2. Upload des médias — pipeline simple :
      //   · Compression client (WebP q=82, max 2560px) pour économiser
      //     stockage + bande passante tout en préservant la qualité visuelle.
      //   · Strip EXIF du fichier final (protection GPS espèces sensibles).
      //   · Première photo = cover du post.
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
          // fallback silencieux
        }

        const compressed = await compressPhoto(rawFile)
        const fileToUpload = await stripExif(compressed)

        await uploadPostMedia({
          file: fileToUpload,
          postId: post.id,
          userId: user.id,
          copyrightNotice: '',
          displayOrder: i,
          isCover: i === 0,
          width: dims?.width,
          height: dims?.height,
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

      // Invalider le feed APRÈS l'upload media pour que le post apparaisse avec sa photo
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY({}) })

      onClose()
    } catch (err) {
      // Rollback : supprimer le post orphelin si l'upload des médias a échoué.
      // Le rollback est best-effort — on ignore une éventuelle erreur de suppression.
      if (createdPostId && supabase) {
        try {
          await supabase.from('posts').delete().eq('id', createdPostId)
        } catch {
          /* swallow rollback error */
        }
      }
      // Toast d'erreur upload (Figma 6385:56334) — message court, l'utilisateur
      // peut réessayer. Pas de toast en cas de succès : la photo apparaît dans
      // le feed → confirmation visuelle suffisante.
      const message =
        err instanceof Error
          ? err.message
          : t('contribute.media.uploadError', {
              defaultValue:
                'Vérifie ta connexion ou réessaye un peu plus tard pour importer tes photos.',
            })
      setUploadError(message)
      setErrors({ description: message })
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
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
        className="fixed inset-y-0 right-0 z-50 w-full md:w-[440px] bg-cream-lighter flex flex-col shadow-2xl"
      >
        {/* ── Header sticky ──────────────────────────────────────────────────
            Figma : gap 12px entre la row top et la progress bar, padding 24/16px,
            badge teal pill ~134x32, titre étape Muli 16 foreground, bouton close
            rond 32px fond #F0F0F5, progress 3 segments h-1.5 rounded-full. */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {/* Badge type — pill teal avec label */}
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-teal-dark text-white text-sm leading-none">
              <span className="font-body">{t('contribute.encounterTitle')}</span>
            </span>

            {/* Étape X/N + bouton close */}
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
                /* Figma 6385:47503 — bg Content/Neutral/Primary-Inverse #F0F0F5
                   (très clair, subtil — pas le `bg-muted` plus foncé). */
                className="size-8 shrink-0 rounded-full bg-[#f0f0f5] hover:bg-[#e5e5ea] flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Barre de progression — 3 segments h-1.5 rounded-full, gap-1 (4px) */}
          <div
            className="flex gap-1"
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
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  step >= i ? 'bg-teal-dark' : 'bg-border',
                ].join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>
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
                displayFormat={form.displayFormat}
                onDisplayFormatChange={(f) => set('displayFormat', f)}
                onMetadataExtracted={(meta) => {
                  // Pré-remplit l'étape 3 avec les métadonnées EXIF, sans
                  // écraser une valeur déjà saisie manuellement par l'user.
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
              />
            )}
          </form>
        </div>

        {/* Toast erreur upload (Figma node 6385:56334) — affiché au-dessus du
            footer quand l'upload échoue. Pas de toast de succès : la photo
            apparaît dans le feed → confirmation visuelle suffisante. */}
        {uploadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="shrink-0 mx-5 mb-3 rounded-card bg-background border border-border shadow-md overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="size-10 shrink-0 rounded-full bg-[var(--color-error)]/15 text-[var(--color-error)] flex items-center justify-center">
                <ImageOff className="size-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {t('contribute.media.uploadErrorTitle', {
                    defaultValue: 'Erreur lors du chargement',
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{uploadError}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                aria-label={t('common.dismiss', { defaultValue: 'Fermer' })}
                className="size-8 shrink-0 rounded-full hover:bg-muted/50 flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>
            {/* Barre rouge bas (status visuel) */}
            <div className="h-1 bg-[var(--color-error)]" />
          </div>
        )}

        {/* Toast progression upload (Figma node 6385:48726) — informe l'user
            sur connexion lente. Affiché uniquement durant le submit, masqué
            dès que la promesse upload résout. */}
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
            {/* Barre de progression — bleu primary, % à droite */}
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
