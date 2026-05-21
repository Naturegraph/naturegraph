/**
 * EncounterStep1 — Photos de la rencontre (Figma node 6385:47496)
 *
 * Layout pixel-perfect Figma :
 *   · Big preview (haut)        : photo sélectionnée, aspect = format choisi.
 *                                  Bg NOIR (letterbox) si la photo est dans un
 *                                  ratio différent du format.
 *   · Thumb row (bas)           : TOUJOURS 4 slots (photos + AddMore pour
 *                                  combler les places vides).
 *   · Format selector (bas)     : 3 chips Paysage / Portrait / Carré, h-10,
 *                                  ratio en italique gris (Figma 6385:47535).
 *
 * Le format choisi est repris par FeedPost après publication → rendu cohérent
 * upload → feed.
 *
 * Métadonnées EXIF extraites silencieusement (date, GPS, time-of-day) pour
 * pré-remplir l'étape 3 — pas d'UI dédiée.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Plus, X } from 'lucide-react'
import { extractBatchMetadata, type PhotoMetadata } from '@/utils/extractPhotoMetadata'
import type { DisplayFormat } from '@/types/database'

// ─── Validation ──────────────────────────────────────────────────────────────

const MAX_FILES = 4
// Nicolas 2026-05-21 : garde-fou large (50 Mo) — la compression adaptative
// dans `stripImageExif()` ramène l'upload réel sous 2 Mo. On n'impose plus
// à l'utilisateur de compresser lui-même ses photos avant de partager.
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 Mo (garde-fou mémoire navigateur)

// Aspect ratios par format — alignés sur ceux du feed (FeedPost.ImageSlider)
// pour que ce que voit l'utilisateur ici corresponde EXACTEMENT au rendu
// dans le feed après publication.
//
// L'image est toujours en `object-cover` : la photo REMPLIT le cadre choisi
// (recadrée si nécessaire) — le format selector est un choix de cadrage,
// pas un letterbox. Comportement cohérent avec le feed (FeedPost), aucune
// bordure noire visible quel que soit le format.
const FORMAT_ASPECT: Record<DisplayFormat, string> = {
  '16:9': 'aspect-[606/384]', // ≈ 1.578:1 — Figma feed slide
  portrait: 'aspect-[606/768]', // 4:5 — Figma feed slide portrait
  '1:1': 'aspect-square',
}

// Sous-libellés en italique gris (Figma 6385:47535).
const FORMAT_LABELS: Record<DisplayFormat, { main: string; ratio: string }> = {
  '16:9': { main: 'Paysage', ratio: '(16:9)' },
  portrait: { main: 'Portrait', ratio: '(3:4)' },
  '1:1': { main: 'Carré', ratio: '(1:1)' },
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format non supporté : ${file.type || 'inconnu'}. Utilise JPEG, PNG ou WebP.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `Fichier trop lourd : ${mb} Mo (max 50 Mo — Naturegraph compresse automatiquement, mais ce fichier dépasse notre limite navigateur).`
  }
  return null
}

// ─── Hook : URLs de prévisualisation révoquées automatiquement ───────────────

function usePreviewUrls(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])
  return urls
}

// ─── Sous-composant : dropzone d'accueil ─────────────────────────────────────

interface DropzoneProps {
  onClick: () => void
  onDrop: (files: FileList) => void
  isDragging: boolean
  onDragState: (s: boolean) => void
  label: string
  hint: string
}

function Dropzone({ onClick, onDrop, isDragging, onDragState, label, hint }: DropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
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
      aria-label={label}
      className={[
        'w-full aspect-video rounded-2xl flex flex-col items-center justify-center gap-3',
        'border-2 border-dashed cursor-pointer transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isDragging
          ? 'border-primary bg-primary-light/40'
          : 'border-primary/60 bg-primary-light/10 hover:border-primary hover:bg-primary-light/20',
      ].join(' ')}
    >
      <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <ImagePlus className="size-7 text-primary" strokeWidth={2} aria-hidden="true" />
      </div>
      <span className="font-body font-bold text-primary text-base">{label}</span>
      <span className="text-xs text-muted-foreground px-4 text-center">{hint}</span>
    </div>
  )
}

// ─── Sous-composant : Big preview (photo sélectionnée) ───────────────────────

interface BigPreviewProps {
  url: string
  aspectClass: string
  onRemove: () => void
  removeLabel: string
}

function BigPreview({ url, aspectClass, onRemove, removeLabel }: BigPreviewProps) {
  return (
    <div
      className={[
        // Bg muted neutre — visible brièvement avant le rendu de l'image, puis
        // recouvert par object-cover qui remplit complètement le cadre.
        'relative w-full rounded-md overflow-hidden bg-muted ring-1 ring-black/5',
        aspectClass,
      ].join(' ')}
    >
      <img
        src={url}
        alt=""
        className="absolute inset-0 size-full object-cover pointer-events-none"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {/* Pastille de suppression (Figma node 6385:47529) */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-2 right-2 size-6 rounded-full bg-[var(--color-error-bg,#fccdd5)] text-[var(--color-error,#9e0f22)] flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── Sous-composant : Thumb slot (photo dans la rangée) ──────────────────────

interface ThumbSlotProps {
  url: string
  selected: boolean
  aspectClass: string
  onSelect: () => void
  onRemove: () => void
  selectLabel: string
  removeLabel: string
}

function ThumbSlot({
  url,
  selected,
  aspectClass,
  onSelect,
  onRemove,
  selectLabel,
  removeLabel,
}: ThumbSlotProps) {
  return (
    <div
      className={[
        'relative w-full rounded-md overflow-hidden bg-muted ring-1 ring-black/5',
        selected ? 'ring-2 ring-primary' : '',
        aspectClass,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={selectLabel}
        aria-pressed={selected}
        className="absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover pointer-events-none"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-1 right-1 size-5 rounded-full bg-[var(--color-error-bg,#fccdd5)] text-[var(--color-error,#9e0f22)] flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── Sous-composant : Slot AddMore (place libre dans la rangée) ──────────────

function EmptySlot({
  onClick,
  label,
  aspectClass,
}: {
  onClick: () => void
  label: string
  aspectClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'w-full rounded-md flex flex-col items-center justify-center gap-1',
        'border border-dashed border-border bg-background',
        'hover:border-primary hover:bg-primary-light/10 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        aspectClass,
      ].join(' ')}
    >
      <Plus className="size-5 text-primary" strokeWidth={2.5} aria-hidden="true" />
      <span className="text-primary text-xs font-body font-bold">{label}</span>
    </button>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface EncounterStep1Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  /** Format d'affichage choisi par l'utilisateur (Figma 6385:47324). */
  displayFormat: DisplayFormat
  /** Callback pour mettre à jour le format choisi. */
  onDisplayFormatChange: (format: DisplayFormat) => void
  /** Callback pré-remplissage étape 3 (date, GPS, time-of-day extraits). */
  onMetadataExtracted?: (meta: PhotoMetadata) => void
  error?: string
}

export function EncounterStep1({
  files,
  onFilesChange,
  displayFormat,
  onDisplayFormatChange,
  onMetadataExtracted,
  error,
}: EncounterStep1Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const previewUrls = usePreviewUrls(files)

  // Index sécurisé : si la photo sélectionnée est supprimée, on retombe sur
  // la dernière disponible. Calculé en dérivé (pas de useEffect → évite les
  // cascading renders, lint react-hooks/set-state-in-effect).
  const safeIndex = files.length > 0 ? Math.min(selectedIndex, files.length - 1) : 0

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
        if (onMetadataExtracted) void extractBatchMetadata(next).then(onMetadataExtracted)
      }
    },
    [files, onFilesChange, onMetadataExtracted],
  )

  const openPicker = () => inputRef.current?.click()

  const removeAt = useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index)
      onFilesChange(next)
      if (onMetadataExtracted && next.length > 0) {
        void extractBatchMetadata(next).then(onMetadataExtracted)
      }
    },
    [files, onFilesChange, onMetadataExtracted],
  )

  const labels = {
    maxPhotos: t('contribute.panel.maxPhotos', { count: MAX_FILES }),
    addBig: t('contribute.media.addPhotosBig', {
      defaultValue: 'Ajouter tes plus belles photos',
    }),
    addHint: t('contribute.media.addPhotosHint', {
      count: MAX_FILES,
      defaultValue: "Jusqu'à {{count}} photos par rencontre.",
    }),
    galleryLabel: t('contribute.media.galleryLabel', { defaultValue: 'Galerie photos' }),
    removeShort: t('contribute.media.removeShort', { defaultValue: 'Supprimer' }),
    addMore: t('contribute.media.addMore', { defaultValue: 'Ajouter' }),
    formatLabel: t('contribute.media.formatLabel', {
      defaultValue: "Format d'affichage des photos",
    }),
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-foreground">{labels.maxPhotos}</p>

      {files.length === 0 ? (
        <Dropzone
          onClick={openPicker}
          onDrop={handleFiles}
          isDragging={isDragging}
          onDragState={setIsDragging}
          label={labels.addBig}
          hint={labels.addHint}
        />
      ) : (
        // Layout Figma 6385:47496 — Big preview + thumb row 4 slots toujours
        // visibles. La selection courante apparaît en grand ; clic sur un thumb
        // → bascule la sélection.
        <div className="flex flex-col gap-1" role="region" aria-label={labels.galleryLabel}>
          <BigPreview
            url={previewUrls[safeIndex]}
            aspectClass={FORMAT_ASPECT[displayFormat]}
            onRemove={() => removeAt(safeIndex)}
            removeLabel={labels.removeShort}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {Array.from({ length: MAX_FILES }).map((_, i) =>
              i < files.length ? (
                <ThumbSlot
                  key={`thumb-${i}`}
                  url={previewUrls[i]}
                  selected={i === safeIndex}
                  aspectClass={FORMAT_ASPECT[displayFormat]}
                  onSelect={() => setSelectedIndex(i)}
                  onRemove={() => removeAt(i)}
                  selectLabel={`${t('home.post.goToImage', { defaultValue: 'Aller à la photo' })} ${i + 1}`}
                  removeLabel={labels.removeShort}
                />
              ) : (
                <EmptySlot
                  key={`empty-${i}`}
                  onClick={openPicker}
                  label={labels.addMore}
                  aspectClass={FORMAT_ASPECT[displayFormat]}
                />
              ),
            )}
          </div>
        </div>
      )}

      {/* Sélecteur de format Figma (node 6385:47535) — Paysage / Portrait / Carré.
          Toujours visible. Chips h-10 px-4, gap-3 (12px), label "Paysage" en
          regular + ratio "(16:9)" en italique gris (Content/Neutral/Secondary).
          Active : bg primary-light + border 0.5px primary. */}
      <fieldset className="flex flex-col gap-3 mt-4">
        <legend className="text-sm text-foreground font-body mb-1">{labels.formatLabel}</legend>
        <div className="flex gap-3 flex-wrap" role="radiogroup" aria-label={labels.formatLabel}>
          {(Object.keys(FORMAT_LABELS) as DisplayFormat[]).map((value) => {
            const active = displayFormat === value
            const { main, ratio } = FORMAT_LABELS[value]
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onDisplayFormatChange(value)}
                className={[
                  'h-10 px-4 rounded-full text-sm font-body transition-colors border-[0.5px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  active
                    ? 'bg-primary-light text-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted/50',
                ].join(' ')}
              >
                {/* Label "Paysage " regular foreground + " (16:9)" italique gris. */}
                <span className={active ? 'font-bold' : ''}>{main} </span>
                <span className="italic text-muted-foreground">{ratio}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

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
    </div>
  )
}
