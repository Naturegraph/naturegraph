/**
 * EncounterStep1 : Photos de la rencontre (Figma node 6385:47496)
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
 * pré-remplir l'étape 3 : pas d'UI dédiée.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Plus, X, ImageOff } from 'lucide-react'
import { extractBatchMetadata, type PhotoMetadata } from '@/utils/extractPhotoMetadata'
import type { DisplayFormat } from '@/types/database'

// ─── Validation ──────────────────────────────────────────────────────────────

const MAX_FILES = 4
// Nicolas 2026-05-21 : garde-fou large (50 Mo) : la compression adaptative
// dans `stripImageExif()` ramène l'upload réel sous 2 Mo. On n'impose plus
// à l'utilisateur de compresser lui-même ses photos avant de partager.
// V1.1.4 NG-025 (Nicolas 2026-06-03) : aligne avec MAX_INPUT_BYTES de
// processMediaForUpload.ts. Au-dela, on rejette immediatement sans tenter
// le decode canvas (qui crash mobile bas de gamme sur 50 Mo).
const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024 // 40 Mo

// Aspect ratios par format : alignés sur ceux du feed (FeedPost.ImageSlider)
// pour que ce que voit l'utilisateur ici corresponde EXACTEMENT au rendu
// dans le feed après publication.
//
// L'image est toujours en `object-cover` : la photo REMPLIT le cadre choisi
// (recadrée si nécessaire) : le format selector est un choix de cadrage,
// pas un letterbox. Comportement cohérent avec le feed (FeedPost), aucune
// bordure noire visible quel que soit le format.
const FORMAT_ASPECT: Record<DisplayFormat, string> = {
  '16:9': 'aspect-[606/384]', // ≈ 1.578:1 : Figma feed slide
  portrait: 'aspect-[606/768]', // 4:5 : Figma feed slide portrait
  '1:1': 'aspect-square',
}

// Sous-libellés en italique gris (Figma 6385:47535).
const FORMAT_LABELS: Record<DisplayFormat, { main: string; ratio: string }> = {
  '16:9': { main: 'Paysage', ratio: '(16:9)' },
  portrait: { main: 'Portrait', ratio: '(3:4)' },
  '1:1': { main: 'Carré', ratio: '(1:1)' },
}

// Nicolas 2026-05-22 : ajout HEIC / HEIF (iPhone par défaut). Sans ça, en
// sélection multiple iOS Safari laissait parfois passer la 2ᵉ photo en HEIC
// sans la convertir → rejetée silencieusement, l'utilisateur voyait une slot
// vide pour la 2ᵉ photo. Avec un MIME vide (cas Android exotique), on
// accepte par défaut et on laisse le pipeline aval gérer.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
])

function validateFile(file: File): string | null {
  // V1.1.4 NG-025 (Nicolas 2026-06-03) : messages clairs alignes avec
  // processMediaForUpload. Cap 40 Mo. RAW detecte via extension nom de
  // fichier pour donner un message specifique au photographe.

  // RAW detection prioritaire (extension fiable, MIME parfois `application/octet-stream`)
  const rawMatch = file.name.match(/\.(cr2|cr3|nef|arw|raf|dng|orf|rw2|pef|srw|x3f)$/i)
  if (rawMatch) {
    const ext = rawMatch[1].toUpperCase()
    return `Fichier RAW (${ext}) non supporté. Convertis-le en JPEG dans ton logiciel photo, puis réessaye.`
  }

  // MIME vide tolérée (Android Chrome ancienne version) : on tente l'upload.
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format non supporté : ${file.type}. Formats acceptés : JPEG, PNG, WebP, AVIF, HEIC.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `Cette photo est trop volumineuse (${mb} Mo). Taille maximale : 40 Mo.`
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
        <ImagePlus className="size-7 text-[var(--color-link)]" strokeWidth={2} aria-hidden="true" />
      </div>
      <span className="font-body font-bold text-[var(--color-link)] text-base">{label}</span>
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
        // Bg muted neutre : visible brièvement avant le rendu de l'image, puis
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
      <Plus className="size-5 text-[var(--color-link)]" strokeWidth={2.5} aria-hidden="true" />
      <span className="text-[var(--color-link)] text-xs font-body font-bold">{label}</span>
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
  /**
   * V1.1.4 NG-024 (Nicolas 2026-06-01) : photos deja attachees au post quand
   * on est en mode edition. Affichage thumbnails en haut de l etape 1 avec
   * bouton X individuel pour supprimer. Sans cette section, l user editait
   * son post sans voir aucune de ses photos -> impression qu elles avaient
   * disparu.
   */
  existingMedia?: Array<{ id: string; url: string; storagePath: string }>
  /** Appele quand l user supprime une photo existante. */
  onRemoveExistingMedia?: (mediaId: string, storagePath: string) => void
}

export function EncounterStep1({
  files,
  onFilesChange,
  displayFormat,
  onDisplayFormatChange,
  onMetadataExtracted,
  error,
  existingMedia,
  onRemoveExistingMedia,
}: EncounterStep1Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const filePreviewUrls = usePreviewUrls(files)

  // V1.1.4 NG-024 (Nicolas 2026-06-01) : liste unifiee photos existantes
  // (deja en DB) + nouveaux Files. L UI BigPreview + ThumbRow traite les
  // deux sources de maniere uniforme. La distinction se fait au moment
  // du remove (existing -> delete API ; file -> retrait local).
  type Slot =
    | { kind: 'existing'; id: string; url: string; storagePath: string }
    | { kind: 'file'; fileIndex: number; url: string }
  const slots: Slot[] = [
    ...(existingMedia ?? []).map((m) => ({
      kind: 'existing' as const,
      id: m.id,
      url: m.url,
      storagePath: m.storagePath,
    })),
    ...files.map((_, i) => ({ kind: 'file' as const, fileIndex: i, url: filePreviewUrls[i] })),
  ]
  const totalSlots = slots.length

  // Index securise sur la liste unifiee
  const safeIndex = totalSlots > 0 ? Math.min(selectedIndex, totalSlots - 1) : 0

  const handleFiles = useCallback(
    async (incoming: FileList | null) => {
      if (!incoming) return
      const errors: string[] = []
      const candidates: File[] = []
      const remaining = MAX_FILES - files.length

      // 1. Validation synchrone (type / taille) + snapshot des File AVANT tout
      //    await : l'input est vide juste apres l'appel (onChange), on capture
      //    donc les references maintenant.
      Array.from(incoming).forEach((file) => {
        if (candidates.length >= remaining) return
        const err = validateFile(file)
        if (err) {
          errors.push(`${file.name} : ${err}`)
          return
        }
        candidates.push(file)
      })

      // 2. Prevention NotReadableError (issue Sentry / "pb de droits" soft launch) :
      //    on lit les octets MAINTENANT, tant que la reference fichier est fraiche,
      //    et on reconstruit un File 100 % en memoire. Ainsi la reference OS ne peut
      //    plus se perimer d'ici l'upload (photo deplacee, acces revoque, photo cloud
      //    pas encore telechargee). Si la lecture echoue des la selection, on le dit
      //    tout de suite au lieu de laisser la publication planter plus tard.
      const accepted: File[] = []
      for (const file of candidates) {
        try {
          const bytes = await file.arrayBuffer()
          accepted.push(
            new File([bytes], file.name, { type: file.type, lastModified: file.lastModified }),
          )
        } catch {
          errors.push(
            `${file.name} : ${t('contribute.media.fileReadError', {
              defaultValue: 'photo illisible, re-selectionne-la',
            })}`,
          )
        }
      }

      setValidationErrors(errors)
      if (accepted.length > 0) {
        const next = [...files, ...accepted]
        onFilesChange(next)
        if (onMetadataExtracted) void extractBatchMetadata(next).then(onMetadataExtracted)
      }
    },
    [files, onFilesChange, onMetadataExtracted, t],
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

  // V1.1.4 NG-024 : suppression unifiee sur la liste fusionnee
  // - existing : appelle le callback du parent (delete API + state local)
  // - file : retire du tableau files local
  const removeSlot = useCallback(
    (slot: Slot) => {
      if (slot.kind === 'existing') {
        onRemoveExistingMedia?.(slot.id, slot.storagePath)
      } else {
        removeAt(slot.fileIndex)
      }
    },
    [onRemoveExistingMedia, removeAt],
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

      {/* V1.1.4 NG-024 (Nicolas 2026-06-01 round 3) : EXACTEMENT meme UI que
          la creation. Les photos existantes (mode edition) et les nouvelles
          Files sont fusionnees dans une seule liste `slots`. BigPreview +
          ThumbRow traitent les deux sources de maniere uniforme.
          L user voit ses photos comme s il venait de les uploader, avec
          BigPreview + thumbnails + X pour supprimer. */}
      {totalSlots === 0 ? (
        <Dropzone
          onClick={openPicker}
          onDrop={handleFiles}
          isDragging={isDragging}
          onDragState={setIsDragging}
          label={labels.addBig}
          hint={labels.addHint}
        />
      ) : (
        // Layout Figma 6385:47496 : Big preview + thumb row 4 slots toujours
        // visibles. La selection courante apparaît en grand ; clic sur un thumb
        // → bascule la sélection.
        <div className="flex flex-col gap-1" role="region" aria-label={labels.galleryLabel}>
          <BigPreview
            url={slots[safeIndex]?.url ?? ''}
            aspectClass={FORMAT_ASPECT[displayFormat]}
            onRemove={() => {
              const slot = slots[safeIndex]
              if (slot) removeSlot(slot)
            }}
            removeLabel={labels.removeShort}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {Array.from({ length: MAX_FILES }).map((_, i) => {
              const slot = slots[i]
              return slot ? (
                <ThumbSlot
                  key={slot.kind === 'existing' ? `existing-${slot.id}` : `file-${slot.fileIndex}`}
                  url={slot.url}
                  selected={i === safeIndex}
                  aspectClass={FORMAT_ASPECT[displayFormat]}
                  onSelect={() => setSelectedIndex(i)}
                  onRemove={() => removeSlot(slot)}
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
              )
            })}
          </div>
        </div>
      )}

      {/* Sélecteur de format Figma (node 6385:47535) : Paysage / Portrait / Carré.
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

      {/* Nicolas 2026-05-22 : `accept="image/*"` laisse iOS Safari convertir
          automatiquement les HEIC en JPEG lors de la sélection (au lieu de
          filtrer côté navigateur, ce qui parfois bloquait la 2ᵉ photo).
          Le validateFile et le pipeline aval (mediaService) acceptent désormais
          HEIC en fallback. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {validationErrors.length > 0 && (
        // V1.1.4 NG-025 Phase 3 (Nicolas 2026-06-03) : panneau "Photos rejetees"
        // visible avec icone + raison par photo. Avant : juste une liste
        // d items texte rouge minuscules pas voyante. Maintenant un encart
        // ambre / orange avec icone d alerte pour que l user voit qu il y a
        // un probleme avant de passer a l etape suivante.
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-amber-900">
            <ImageOff className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold">
              {validationErrors.length === 1
                ? '1 photo rejetée'
                : `${validationErrors.length} photos rejetées`}
            </span>
          </div>
          <ul className="flex flex-col gap-1 pl-6">
            {validationErrors.map((e, i) => (
              <li key={i} className="text-xs text-amber-900 list-disc">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}
