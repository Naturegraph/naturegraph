/**
 * EncounterStep1 — Étape 1 : Photos de la rencontre
 *
 * Contenu : upload des photos uniquement + sélection du format d'affichage.
 * La description et les tags ont été déplacés à l'étape 3.
 *
 * Validation : les photos sont optionnelles — l'utilisateur peut
 * poursuivre sans photo (gérée par le parent via le bouton "skip").
 */

import { useTranslation } from 'react-i18next'
import { MediaUploader } from './MediaUploader'

export type PhotoAspectRatio = 'landscape' | 'portrait' | 'square'

interface EncounterStep1Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  aspectRatio: PhotoAspectRatio
  onAspectRatioChange: (r: PhotoAspectRatio) => void
  error?: string
}

/** Options de format d'affichage des photos */
const ASPECT_RATIO_OPTIONS: { value: PhotoAspectRatio; labelKey: string }[] = [
  { value: 'landscape', labelKey: 'contribute.panel.formatLandscape' },
  { value: 'portrait', labelKey: 'contribute.panel.formatPortrait' },
  { value: 'square', labelKey: 'contribute.panel.formatSquare' },
]

export function EncounterStep1({
  files,
  onFilesChange,
  aspectRatio,
  onAspectRatioChange,
  error,
}: EncounterStep1Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-5">
      {/* Upload photos */}
      <MediaUploader files={files} onChange={onFilesChange} error={error} />

      {/* Format d'affichage — visible seulement si des photos sont ajoutées */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">
            {t('contribute.panel.photoFormat')}
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('contribute.panel.photoFormat')}
          >
            {ASPECT_RATIO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAspectRatioChange(opt.value)}
                aria-pressed={aspectRatio === opt.value}
                className={[
                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  aspectRatio === opt.value
                    ? 'border-primary bg-primary-light text-primary font-medium'
                    : 'border-border text-foreground hover:border-primary/50',
                ].join(' ')}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
