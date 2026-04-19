/**
 * EncounterStep1 — Étape 1 : Photos de la rencontre (pixel-perfect Figma 6633-11398)
 *
 * Layout Figma :
 *   - 1 grand dropzone (plein largeur, hauteur 264px) pour le premier ajout
 *     + drag & drop + sélection multiple (jusqu'à 4 photos en une action).
 *   - Une fois au moins une photo ajoutée : grille 2x2 des 4 slots (grand +
 *     3 petits), les slots vides gardent leur état dashed "Ajouter".
 *   - Pills format : Paysage (16:9) / Portrait (3:4) / Carré (1:1)
 *     — applique au ratio d'aperçu, crop automatique via `object-cover`.
 *
 * Intelligence :
 *   - EXIF extrait automatiquement (date, GPS, time-of-day).
 *   - Métadonnées remontées au parent pour pré-remplir l'étape 3.
 *
 * Ergonomie :
 *   - Photos optionnelles — l'utilisateur peut poursuivre sans.
 *   - Validation format/taille par fichier + message d'erreur non-bloquant.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Plus, X } from 'lucide-react'
import { extractBatchMetadata, type PhotoMetadata } from '@/utils/extractPhotoMetadata'

// ─── Types publics ────────────────────────────────────────────────────────────

export type PhotoAspectRatio = 'landscape' | 'portrait' | 'square'

/** Classes Tailwind pour le ratio d'aperçu global selon le format choisi */
const ASPECT_RATIO_CLASS: Record<PhotoAspectRatio, string> = {
  landscape: 'aspect-[16/9]',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
}

const ASPECT_RATIO_OPTIONS: { value: PhotoAspectRatio; labelKey: string }[] = [
  { value: 'landscape', labelKey: 'contribute.panel.formatLandscape' },
  { value: 'portrait', labelKey: 'contribute.panel.formatPortrait' },
  { value: 'square', labelKey: 'contribute.panel.formatSquare' },
]

// ─── Validation (cohérente avec les policies Supabase Storage) ────────────────

const MAX_FILES = 4
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

/** Retourne un message d'erreur localisé, ou null si le fichier est valide. */
function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format non supporté : ${file.type || 'inconnu'}. Utilise JPEG, PNG ou WebP.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `Fichier trop lourd : ${mb} Mo (max 10 Mo).`
  }
  return null
}

// ─── Hook — URLs de prévisualisation révoquées automatiquement ────────────────

function usePreviewUrls(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])
  return urls
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Icônes empilées animées du dropzone (reproduit le cluster Figma). */
function StackedImagesIcon({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const box = size === 'lg' ? 'size-7' : 'size-6'
  const icon = size === 'lg' ? 'size-4' : 'size-3.5'
  return (
    <div className="flex items-start relative" aria-hidden="true">
      <div
        className={`${box} rounded-[4px] bg-primary-light shadow-[0_6px_16px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center -mr-2 -rotate-6 z-10`}
      >
        <ImagePlus className={`${icon} text-primary`} />
      </div>
      <div
        className={`${box} rounded-[4px] bg-primary-light flex items-center justify-center rotate-6 mt-2`}
      >
        <ImagePlus className={`${icon} text-primary`} />
      </div>
    </div>
  )
}

/** Slot vide avec CTA "Ajouter" (dropzone réutilisable) */
interface EmptySlotProps {
  onClick: () => void
  onDrop: (files: FileList) => void
  isDragging: boolean
  onDragState: (s: boolean) => void
  variant: 'large' | 'small'
  ariaLabel: string
  addLabel: string
  aspectRatioClass?: string
}

function EmptySlot({
  onClick,
  onDrop,
  isDragging,
  onDragState,
  variant,
  ariaLabel,
  addLabel,
  aspectRatioClass,
}: EmptySlotProps) {
  const isLarge = variant === 'large'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      onDragOver={(e) => {
        e.preventDefault()
        onDragState(true)
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault()
        onDragState(false)
        onDrop(e.dataTransfer.files)
      }}
      className={[
        'flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
        'bg-background border border-dashed rounded-[4px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isDragging ? 'border-primary bg-primary-light/30' : 'border-border hover:border-primary/60',
        isLarge ? 'w-full p-4' : 'w-full p-3',
        isLarge ? aspectRatioClass || 'aspect-[16/9]' : 'aspect-[120/98]',
      ].join(' ')}
    >
      <StackedImagesIcon size={isLarge ? 'lg' : 'sm'} />
      <div className="flex items-center gap-1 mt-1">
        <Plus className={isLarge ? 'size-5 text-primary' : 'size-4 text-primary'} strokeWidth={2} />
        <span
          className={['font-body font-bold text-primary', isLarge ? 'text-base' : 'text-sm'].join(
            ' ',
          )}
        >
          {addLabel}
        </span>
      </div>
    </div>
  )
}

/** Slot rempli — photo + bouton remove */
interface FilledSlotProps {
  url: string
  onRemove: () => void
  variant: 'large' | 'small'
  aspectRatioClass: string
  removeLabel: string
}

function FilledSlot({ url, onRemove, variant, aspectRatioClass, removeLabel }: FilledSlotProps) {
  const isLarge = variant === 'large'
  return (
    <div
      className={[
        'relative rounded-[4px] overflow-hidden bg-muted',
        isLarge ? aspectRatioClass : 'aspect-[120/98]',
      ].join(' ')}
    >
      <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-1.5 right-1.5 size-6 rounded-full bg-foreground/70 text-white flex items-center justify-center hover:bg-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface EncounterStep1Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  aspectRatio: PhotoAspectRatio
  onAspectRatioChange: (r: PhotoAspectRatio) => void
  /** Remontée des métadonnées EXIF (date, GPS, time-of-day) pour l'étape 3. */
  onMetadataExtracted?: (meta: PhotoMetadata) => void
  error?: string
}

export function EncounterStep1({
  files,
  onFilesChange,
  aspectRatio,
  onAspectRatioChange,
  onMetadataExtracted,
  error,
}: EncounterStep1Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const previewUrls = usePreviewUrls(files)
  const aspectClass = ASPECT_RATIO_CLASS[aspectRatio]

  const addMultipleLabel = t('contribute.media.addPhotos')
  const addLabel = t('common.add', { defaultValue: 'Ajouter' })
  const removeLabel = t('contribute.media.remove', { index: 1 })

  /**
   * Ajoute les fichiers sélectionnés. Déclenche l'extraction EXIF sur
   * la liste finale et remonte au parent.
   */
  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return
      const errors: string[] = []
      const accepted: File[] = []
      const remaining = MAX_FILES - files.length

      Array.from(incoming).forEach((file) => {
        if (accepted.length >= remaining) return
        const err = validateFile(file)
        if (err) {
          errors.push(`${file.name} : ${err}`)
          return
        }
        accepted.push(file)
      })

      setValidationErrors(errors)
      if (accepted.length > 0) {
        const next = [...files, ...accepted]
        onFilesChange(next)
        // EXIF en best-effort — n'impacte pas l'UI si aucune metadata
        if (onMetadataExtracted) {
          void extractBatchMetadata(next).then(onMetadataExtracted)
        }
      }
    },
    [files, onFilesChange, onMetadataExtracted],
  )

  function openPicker() {
    inputRef.current?.click()
  }

  function removeAt(index: number) {
    const next = files.filter((_, i) => i !== index)
    onFilesChange(next)
    if (onMetadataExtracted && next.length > 0) {
      void extractBatchMetadata(next).then(onMetadataExtracted)
    }
  }

  const hasPhotos = files.length > 0
  // Grand dropzone seulement au 1er ajout (UX allégée) ; puis layout 4-slots.
  const firstIsFilled = hasPhotos

  return (
    <div className="flex flex-col gap-6">
      {/* Sous-titre Figma — "Tu peux ajouter jusqu'à 4 photos maximum." */}
      <p className="text-base text-foreground">
        {t('contribute.panel.maxPhotos', { count: MAX_FILES })}
      </p>

      {/* ── Grille des 4 slots ──────────────────────────────────────────────
          Mobile Figma : 1 grand slot (slot 0) puis 3 petits (slot 1-3).
          Tant qu'aucune photo : 1 seul dropzone plein largeur + 3 petits slots
          en-dessous (comportement Figma). */}
      <div className="flex flex-col gap-1">
        {/* Slot 0 — large (toujours visible) */}
        {firstIsFilled ? (
          <FilledSlot
            url={previewUrls[0]}
            onRemove={() => removeAt(0)}
            variant="large"
            aspectRatioClass={aspectClass}
            removeLabel={t('contribute.media.remove', { index: 1 })}
          />
        ) : (
          <EmptySlot
            onClick={openPicker}
            onDrop={handleFiles}
            isDragging={isDragging}
            onDragState={setIsDragging}
            variant="large"
            ariaLabel={addMultipleLabel}
            addLabel={addLabel}
            aspectRatioClass={aspectClass}
          />
        )}

        {/* Slots 1-3 — petits, en ligne */}
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3].map((slotIndex) => {
            const fileExists = slotIndex < files.length
            if (fileExists) {
              return (
                <FilledSlot
                  key={slotIndex}
                  url={previewUrls[slotIndex]}
                  onRemove={() => removeAt(slotIndex)}
                  variant="small"
                  aspectRatioClass={aspectClass}
                  removeLabel={t('contribute.media.remove', { index: slotIndex + 1 })}
                />
              )
            }
            // Slot vide — affiche le bouton "Ajouter" uniquement sur le
            // prochain slot libre (les autres restent visuels, non-cliquables
            // pour éviter les doublons de handlers).
            const isNext = slotIndex === files.length
            return (
              <EmptySlot
                key={slotIndex}
                onClick={isNext ? openPicker : () => {}}
                onDrop={isNext ? handleFiles : () => {}}
                isDragging={isNext && isDragging}
                onDragState={isNext ? setIsDragging : () => {}}
                variant="small"
                ariaLabel={isNext ? addMultipleLabel : ''}
                addLabel={addLabel}
              />
            )
          })}
        </div>
      </div>

      {/* Input fichier caché — multiple pour sélection groupée */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Format d'affichage — toujours visible (Figma) ; applique aux 4 photos */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('contribute.panel.photoFormat')}</span>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label={t('contribute.panel.photoFormat')}
        >
          {ASPECT_RATIO_OPTIONS.map((opt) => {
            const active = aspectRatio === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onAspectRatioChange(opt.value)}
                className={[
                  'h-10 px-4 rounded-full text-sm font-body transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'border-[0.5px] border-primary bg-primary-light text-foreground'
                    : 'border-[0.5px] border-border bg-background text-foreground hover:border-foreground/30',
                ].join(' ')}
              >
                {t(opt.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Erreurs validation (format / taille) — non-bloquantes */}
      {validationErrors.length > 0 && (
        <ul role="alert" aria-live="polite" className="flex flex-col gap-1">
          {validationErrors.map((e, i) => (
            <li key={i} className="text-xs text-[var(--color-error)]">
              {e}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}

      {/* Label sr-only — garde la sémantique pour AT même si le label
          visuel n'est plus affiché (spec Figma : pas de "Photos (4 max)") */}
      <span className="sr-only">{removeLabel}</span>
    </div>
  )
}
