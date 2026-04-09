/**
 * ContributeInstantForm — Formulaire Instant Nature (page unique)
 *
 * Capture rapide d'un moment de nature : photo(s), description,
 * phénomène, lieu, date, visibilité, tags.
 *
 * Type de post créé : 'nature_instant'
 *
 * TODO [BACKEND] — Brancher la création de post :
 *   1. Upload médias → Supabase Storage bucket 'post-media'
 *      supabase.storage.from('post-media').upload(path, file)
 *   2. Insérer le post → table 'posts' via postService.createPost()
 *   3. Invalider le cache : queryClient.invalidateQueries({ queryKey: ['feed'] })
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Send } from 'lucide-react'
import type { TimeOfDay, Visibility } from '@/types/database'
import { MediaUploader } from './MediaUploader'
import { LocationPicker } from './LocationPicker'
import { TagInput } from './TagInput'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost } from '@/hooks/usePost'
import { FEED_QUERY_KEY } from '@/hooks/useFeed'
import { uploadPostMedia } from '@/services/mediaService'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// ─── État du formulaire ───────────────────────────────────────────────────────

interface InstantFormData {
  files: File[]
  description: string
  phenomenon: string
  locationName: string
  locationHidden: boolean
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  visibility: Visibility
  tags: string[]
}

const MAX_DESC = 280

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ContributeInstantForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const createPost = useCreatePost(user?.id ?? '')
  const queryClient = useQueryClient()

  const [form, setForm] = useState<InstantFormData>({
    files: [],
    description: '',
    phenomenon: '',
    locationName: '',
    locationHidden: false,
    encounterDate: todayISO(),
    timeOfDay: '',
    visibility: 'public',
    tags: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /** Met à jour un champ et efface son erreur éventuelle */
  function set<K extends keyof InstantFormData>(key: K, value: InstantFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as string])
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== (key as string))),
      )
  }

  function validate() {
    const e: Record<string, string> = {}
    if (form.files.length === 0) e.files = t('contribute.errors.mediaRequired')
    if (!form.description.trim()) e.description = t('contribute.errors.descriptionRequired')
    if (form.description.length > MAX_DESC)
      e.description = t('contribute.errors.descriptionTooLong', { max: MAX_DESC })
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    if (!user?.id) {
      setErrors({ files: t('contribute.errors.notAuthenticated', 'Connecte-toi pour publier') })
      return
    }

    setIsSubmitting(true)
    let createdPostId: string | null = null
    try {
      // 1. Créer le post (sans médias)
      const post = await createPost.mutateAsync({
        type: 'nature_instant',
        description: form.description.trim(),
        visibility: form.visibility,
        encounter_date: form.encounterDate,
        time_of_day: form.timeOfDay || undefined,
        location_name: form.locationName || undefined,
        location_hidden: form.locationHidden,
        tags: form.tags,
      })
      createdPostId = post.id

      // 2. Upload des médias liés au post créé
      //    (CHECK display_order > 0 → on démarre à 1)
      for (let i = 0; i < form.files.length; i++) {
        await uploadPostMedia({
          file: form.files[i],
          postId: post.id,
          userId: user.id,
          copyrightNotice: '',
          displayOrder: i + 1,
        })
      }

      // Invalider le feed APRÈS l'upload media pour que le post apparaisse avec sa photo
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY({}) })

      navigate('/home')
    } catch (err) {
      // Rollback : supprimer le post orphelin si l'upload des médias a échoué
      if (createdPostId && supabase) {
        await supabase
          .from('posts')
          .delete()
          .eq('id', createdPostId)
          .catch(() => {})
      }
      setErrors({ files: err instanceof Error ? err.message : 'Erreur lors de la publication' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const TIME_OPTIONS: TimeOfDay[] = ['morning', 'afternoon', 'dusk', 'evening', 'night']

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
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 md:px-6 h-16">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('contribute.backToFeed')}</span>
          </button>
          <h1 className="font-bold text-foreground">{t('contribute.instantTitle')}</h1>
          <button
            type="submit"
            form="instant-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 h-9 px-4 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Send className="size-4" aria-hidden="true" />
            {isSubmitting ? t('common.loading') : t('contribute.publish')}
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main id="main-content">
        <form
          id="instant-form"
          onSubmit={handleSubmit}
          noValidate
          className="max-w-2xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6 pb-24 md:pb-6"
        >
          <MediaUploader
            files={form.files}
            onChange={(f) => set('files', f)}
            error={errors.files}
          />

          {/* Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="instant-desc" className="text-sm font-semibold text-foreground">
                {t('contribute.description.label')}{' '}
                <span aria-hidden="true" className="text-[var(--color-error)]">
                  *
                </span>
              </label>
              <span
                aria-live="polite"
                className={`text-xs tabular-nums ${form.description.length > MAX_DESC ? 'text-[var(--color-error)]' : 'text-muted-foreground'}`}
              >
                {t('contribute.description.chars', {
                  count: form.description.length,
                  max: MAX_DESC,
                })}
              </span>
            </div>
            <textarea
              id="instant-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t('contribute.description.instantPlaceholder')}
              rows={4}
              required
              aria-required="true"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'instant-desc-error' : undefined}
              className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
            />
            {errors.description && (
              <p id="instant-desc-error" role="alert" className="text-xs text-[var(--color-error)]">
                {errors.description}
              </p>
            )}
          </div>

          {/* Phénomène */}
          <div className="flex flex-col gap-2">
            <label htmlFor="instant-phenom" className="text-sm font-semibold text-foreground">
              {t('contribute.phenomenon.label')}
            </label>
            <input
              id="instant-phenom"
              type="text"
              value={form.phenomenon}
              onChange={(e) => set('phenomenon', e.target.value)}
              placeholder={t('contribute.phenomenon.placeholder')}
              className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* Date + moment de la journée */}
          <div className="flex flex-col gap-3">
            <label htmlFor="instant-date" className="text-sm font-semibold text-foreground">
              {t('contribute.date.label')}
            </label>
            <input
              id="instant-date"
              type="date"
              value={form.encounterDate}
              max={todayISO()}
              onChange={(e) => set('encounterDate', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('contribute.date.timeLabel')}
            >
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set('timeOfDay', form.timeOfDay === opt ? '' : opt)}
                  aria-pressed={form.timeOfDay === opt}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    form.timeOfDay === opt
                      ? 'border-primary bg-primary-light text-primary font-medium'
                      : 'border-border text-foreground hover:border-primary/50',
                  ].join(' ')}
                >
                  {t(`contribute.date.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          <LocationPicker
            value={form.locationName}
            onValueChange={(v) => set('locationName', v)}
            hidden={form.locationHidden}
            onHiddenChange={(v) => set('locationHidden', v)}
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
                    form.visibility === opt.value
                      ? 'border-primary bg-primary-light/20'
                      : 'border-border hover:border-primary/40',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={form.visibility === opt.value}
                    onChange={() => set('visibility', opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={[
                      'size-4 rounded-full border-2 flex items-center justify-center shrink-0',
                      form.visibility === opt.value ? 'border-primary' : 'border-border',
                    ].join(' ')}
                  >
                    {form.visibility === opt.value && (
                      <div className="size-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <TagInput tags={form.tags} onTagsChange={(tags) => set('tags', tags)} />
        </form>
      </main>
    </div>
  )
}
