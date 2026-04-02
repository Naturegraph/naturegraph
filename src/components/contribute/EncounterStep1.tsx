/**
 * EncounterStep1 — Étape 1 du formulaire Rencontre Nature
 *
 * Contenu : photos + description + tags
 * Validation déclenchée par le parent (ContributeEncounterForm)
 * avant de passer à l'étape suivante.
 */

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaUploader } from './MediaUploader'
import { TagInput } from './TagInput'

const MAX_DESC = 1000

interface EncounterStep1Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  description: string
  onDescriptionChange: (v: string) => void
  tags: string[]
  onTagsChange: (tags: string[]) => void
  errors: Record<string, string>
}

export function EncounterStep1({
  files,
  onFilesChange,
  description,
  onDescriptionChange,
  tags,
  onTagsChange,
  errors,
}: EncounterStep1Props) {
  const { t } = useTranslation()
  const descId = useId()

  return (
    <div className="flex flex-col gap-6">
      <MediaUploader files={files} onChange={onFilesChange} error={errors.files} />

      {/* Description */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={descId} className="text-sm font-semibold text-foreground">
            {t('contribute.description.label')}{' '}
            <span aria-hidden="true" className="text-[var(--color-error)]">
              *
            </span>
          </label>
          <span
            aria-live="polite"
            className={`text-xs tabular-nums ${
              description.length > MAX_DESC ? 'text-[var(--color-error)]' : 'text-muted-foreground'
            }`}
          >
            {t('contribute.description.chars', {
              count: description.length,
              max: MAX_DESC,
            })}
          </span>
        </div>
        <textarea
          id={descId}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('contribute.description.placeholder')}
          rows={5}
          required
          aria-required="true"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? `${descId}-error` : undefined}
          className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
        />
        {errors.description && (
          <p id={`${descId}-error`} role="alert" className="text-xs text-[var(--color-error)]">
            {errors.description}
          </p>
        )}
      </div>

      <TagInput tags={tags} onTagsChange={onTagsChange} />
    </div>
  )
}
