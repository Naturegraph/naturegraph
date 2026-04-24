/**
 * EncounterStep1 — Étape 1 : Photos de la rencontre (pixel-perfect Figma 6633-11398)
 *
 * Layout Figma :
 *   - 1 grand dropzone (plein largeur, hauteur 264px) pour le premier ajout
 *     + drag & drop + sélection multiple (jusqu'à 4 photos en une action).
 *   - Une fois au moins une photo ajoutée : grille 2x2 des 4 slots (grand +
 *     3 petits), les slots vides gardent leur état dashed "Ajouter".
 *   - Pills format : Paysage (16:9) / Portrait (3:4) / Carré (1:1)
 *     — applique au ratio d'aperçu.
 *
 * Règles photo (PRD photo-management v2 § P1/P2) :
 *   - `object-contain` + `bg-muted` : aucun pixel source n'est coupé
 *     (non-destruction). Le letterbox est assumé quand le format natif
 *     diffère du format choisi — un badge "Adapter" le signale.
 *   - Format natif détecté côté client via `detectPhotoFormat` (T1).
 *   - Édition fine (recadrage, rotation) livrée en T3 via modal dédiée.
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
import { AlertTriangle, Camera, ImagePlus, Images, Pencil, Plus, X } from 'lucide-react'
import { extractBatchMetadata, type PhotoMetadata } from '@/utils/extractPhotoMetadata'
import { detectPhotoFormat, type PhotoDimensions } from '@/utils/detectPhotoFormat'
import { PhotoEditModal, type PhotoEditResult } from './PhotoEditModal'
import { photoFileKey, type PhotoEditsMap } from './photoEdits'

// ─── Types publics ────────────────────────────────────────────────────────────

export type PhotoAspectRatio = 'landscape' | 'portrait' | 'square'

/**
 * Classes Tailwind d'aspect pour le conteneur du slot HERO selon le format.
 * Le conteneur épouse le format choisi : une photo portrait s'affiche en
 * portrait (pleine hauteur), pas "letterboxée" dans un 16/9. Ça évite
 * d'écraser inutilement le sujet pour les formats verticaux.
 */
const HERO_ASPECT_CLASS: Record<PhotoAspectRatio, string> = {
  landscape: 'aspect-[16/9]',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
}

/**
 * Aspect des thumbs (slots 1-3) selon le format — on garde un rendu harmonieux
 * mais proche du format choisi pour que l'utilisateur visualise la cohérence.
 * On limite en hauteur pour ne pas casser la grille 3 colonnes.
 */
const THUMB_ASPECT_CLASS: Record<PhotoAspectRatio, string> = {
  landscape: 'aspect-[120/98]',
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
  aspectClass: string
}

function EmptySlot({
  onClick,
  onDrop,
  isDragging,
  onDragState,
  variant,
  ariaLabel,
  addLabel,
  aspectClass,
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
        aspectClass,
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

/**
 * Slot rempli — photo + bouton remove + badge format (PRD photo-management v2 §P1/P2).
 * `object-contain` + `bg-muted` : aucun pixel source n'est coupé (non-destruction).
 * Le drag-pan a été retiré : l'édition fine arrive via modal dédiée (T3 Sprint 2).
 */
interface FilledSlotProps {
  url: string
  onRemove: () => void
  onEdit: () => void
  variant: 'large' | 'small'
  /** Classe Tailwind d'aspect du conteneur (épouse le format choisi). */
  aspectClass: string
  removeLabel: string
  editLabel: string
  /** Format natif détecté côté client (null tant que la détection n'a pas fini). */
  detected: PhotoDimensions | null
  /** Format choisi par l'utilisateur (pour comparer et afficher un warning). */
  targetFormat: PhotoAspectRatio
  /** Libellés localisés des badges. */
  formatLabels: Record<PhotoAspectRatio, string>
  mismatchLabel: string
  mismatchHint: string
  /** Transform CSS appliqué à l'image (preview du recadrage). */
  transform?: string
  /** Indique qu'un recadrage personnalisé est actif. */
  edited: boolean
}

function FilledSlot({
  url,
  onRemove,
  onEdit,
  variant,
  aspectClass,
  removeLabel,
  editLabel,
  detected,
  targetFormat,
  formatLabels,
  mismatchLabel,
  mismatchHint,
  transform,
  edited,
}: FilledSlotProps) {
  const isLarge = variant === 'large'
  const mismatch = detected !== null && detected.format !== targetFormat

  return (
    <div
      className={[
        'relative rounded-[4px] overflow-hidden bg-muted select-none',
        // Le conteneur épouse le format choisi — object-contain préserve la photo.
        aspectClass,
        'transition-[aspect-ratio] duration-200',
      ].join(' ')}
    >
      <img
        src={url}
        alt=""
        className="size-full object-contain pointer-events-none will-change-transform"
        style={transform ? { transform, transformOrigin: 'center center' } : undefined}
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {/* Badge format natif (vert=match, amber=mismatch) — en bas à gauche. */}
      {detected && (
        <div
          className={[
            'pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1',
            'px-2 py-0.5 rounded-full text-[10px] font-body font-bold',
            mismatch
              ? 'bg-[var(--color-warning,#d97706)] text-white'
              : 'bg-foreground/70 text-white',
          ].join(' ')}
          title={mismatch ? mismatchHint : undefined}
          aria-label={
            mismatch
              ? `${formatLabels[detected.format]} · ${mismatchLabel}`
              : formatLabels[detected.format]
          }
        >
          {mismatch && <AlertTriangle className="size-3" aria-hidden="true" />}
          <span>
            {isLarge
              ? `${formatLabels[detected.format]} · ${detected.width}×${detected.height}`
              : formatLabels[detected.format]}
          </span>
          {mismatch && <span className="ml-0.5">· {mismatchLabel}</span>}
        </div>
      )}

      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className={[
            'size-6 rounded-full text-white flex items-center justify-center transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            edited ? 'bg-primary hover:bg-primary/90' : 'bg-foreground/70 hover:bg-foreground',
          ].join(' ')}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="size-6 rounded-full bg-foreground/70 text-white flex items-center justify-center hover:bg-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
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
  /** Recadrages + alt text par fichier (PRD photo-management v2 · T3). */
  photoEdits?: PhotoEditsMap
  onPhotoEditsChange?: (edits: PhotoEditsMap) => void
  error?: string
}

export function EncounterStep1({
  files,
  onFilesChange,
  aspectRatio,
  onAspectRatioChange,
  onMetadataExtracted,
  photoEdits,
  onPhotoEditsChange,
  error,
}: EncounterStep1Props) {
  const { t } = useTranslation()
  // Deux inputs séparés : galerie (multi-sélection) + caméra (capture native
  // sur mobile, déclenche l'app photo). Chaque source a son propre input pour
  // que l'attribut `capture` n'affecte pas la sélection fichier.
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  // Feuille d'action "Source de la photo" — ouverte au clic sur un slot vide.
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)
  const previewUrls = usePreviewUrls(files)
  const heroAspectClass = HERO_ASPECT_CLASS[aspectRatio]
  const thumbAspectClass = THUMB_ASPECT_CLASS[aspectRatio]

  // ── Détection du format natif (PRD photo-management § T1) ───────────────
  // Map clé fichier (name + size + lastModified) → dimensions + format détecté.
  // Memoïsation : on évite de relancer createImageBitmap sur les fichiers déjà traités.
  const fileKey = useCallback((f: File) => `${f.name}:${f.size}:${f.lastModified}`, [])
  const [dimensionsMap, setDimensionsMap] = useState<Map<string, PhotoDimensions>>(new Map())
  // Ref miroir pour lire la map courante sans créer de dépendance d'effet
  // (éviter de relancer l'effet à chaque insertion — cause de boucle d'annulation).
  const dimensionsMapRef = useRef(dimensionsMap)
  useEffect(() => {
    dimensionsMapRef.current = dimensionsMap
  }, [dimensionsMap])

  useEffect(() => {
    let cancelled = false
    const pending = files.filter((f) => !dimensionsMapRef.current.has(fileKey(f)))
    if (pending.length === 0) return
    ;(async () => {
      // Détection séquentielle légère (≤ 4 fichiers, pas besoin de parallélisme lourd).
      for (const f of pending) {
        try {
          const dims = await detectPhotoFormat(f)
          if (cancelled) return
          setDimensionsMap((prev) => {
            const next = new Map(prev)
            next.set(fileKey(f), dims)
            return next
          })
        } catch {
          // best-effort : un fichier sans détection restera sans badge
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [files, fileKey])

  const addMultipleLabel = t('contribute.media.addPhotos')
  const addLabel = t('common.add', { defaultValue: 'Ajouter' })
  const removeLabel = t('contribute.media.remove', { index: 1 })
  const editLabel = t('contribute.media.editLabel', { defaultValue: 'Modifier la photo' })

  // ── Modal d'édition (T3) ─────────────────────────────────────────────────
  // L'index du fichier en cours d'édition, ou null si fermé.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const closeEditor = useCallback(() => setEditingIndex(null), [])
  const saveEditor = useCallback(
    (index: number, result: PhotoEditResult) => {
      if (!onPhotoEditsChange) return
      const key = photoFileKey(files[index])
      onPhotoEditsChange({ ...(photoEdits ?? {}), [key]: result })
      setEditingIndex(null)
    },
    [files, onPhotoEditsChange, photoEdits],
  )

  // Convertit un CropData en transform CSS pour preview dans le slot.
  const transformFor = useCallback(
    (index: number): string | undefined => {
      if (!photoEdits) return undefined
      const edit = photoEdits[photoFileKey(files[index])]
      if (!edit) return undefined
      const c = edit.cropData
      return `translate(${c.offsetX}px, ${c.offsetY}px) scale(${c.scale}) rotate(${c.rotation ?? 0}deg)`
    },
    [files, photoEdits],
  )
  const isEdited = useCallback(
    (index: number) => Boolean(photoEdits?.[photoFileKey(files[index])]),
    [files, photoEdits],
  )

  // Libellés badges format (mémoïsés pour éviter recreation par render).
  const formatLabels: Record<PhotoAspectRatio, string> = useMemo(
    () => ({
      landscape: t('contribute.media.formatBadge.landscape', { defaultValue: 'Paysage' }),
      portrait: t('contribute.media.formatBadge.portrait', { defaultValue: 'Portrait' }),
      square: t('contribute.media.formatBadge.square', { defaultValue: 'Carré' }),
    }),
    [t],
  )
  const mismatchLabel = t('contribute.media.mismatchBadge', { defaultValue: 'Adapter' })
  const mismatchHint = t('contribute.media.mismatchHint', {
    defaultValue: 'Format natif différent du format choisi.',
  })

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

  /** Ouvre la feuille de sélection de source (Appareil photo / Galerie). */
  function openPicker() {
    setSourceSheetOpen(true)
  }

  function openGallery() {
    setSourceSheetOpen(false)
    galleryInputRef.current?.click()
  }

  function openCamera() {
    setSourceSheetOpen(false)
    cameraInputRef.current?.click()
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

  // Escape pour fermer la feuille d'action — listener global tant qu'ouverte.
  useEffect(() => {
    if (!sourceSheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSourceSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sourceSheetOpen])

  // Classe du dropzone vide initial : on garde la hauteur Figma (264px) fixe
  // tant qu'aucune photo n'est chargée, pour éviter un saut de layout quand
  // l'utilisateur change de format avant d'avoir uploadé quoi que ce soit.
  const initialDropzoneClass = firstIsFilled ? heroAspectClass : 'h-[264px]'

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
            onEdit={() => setEditingIndex(0)}
            variant="large"
            aspectClass={heroAspectClass}
            removeLabel={t('contribute.media.remove', { index: 1 })}
            editLabel={editLabel}
            detected={dimensionsMap.get(fileKey(files[0])) ?? null}
            targetFormat={aspectRatio}
            formatLabels={formatLabels}
            mismatchLabel={mismatchLabel}
            mismatchHint={mismatchHint}
            transform={transformFor(0)}
            edited={isEdited(0)}
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
            aspectClass={initialDropzoneClass}
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
                  onEdit={() => setEditingIndex(slotIndex)}
                  variant="small"
                  aspectClass={thumbAspectClass}
                  removeLabel={t('contribute.media.remove', { index: slotIndex + 1 })}
                  editLabel={editLabel}
                  detected={dimensionsMap.get(fileKey(files[slotIndex])) ?? null}
                  targetFormat={aspectRatio}
                  formatLabels={formatLabels}
                  mismatchLabel={mismatchLabel}
                  mismatchHint={mismatchHint}
                  transform={transformFor(slotIndex)}
                  edited={isEdited(slotIndex)}
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
                aspectClass={thumbAspectClass}
              />
            )
          })}
        </div>
      </div>

      {/* Inputs fichier cachés — un pour la galerie (multi), un pour la caméra.
          Sur mobile, `capture="environment"` ouvre l'app photo native.
          Sur desktop, l'input caméra retombe sur le file picker standard. */}
      <input
        ref={galleryInputRef}
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Feuille d'action — source de la photo (Appareil photo / Galerie) */}
      {sourceSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-foreground/40"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSourceSheetOpen(false)
          }}
        >
          <div
            className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl p-4 flex flex-col gap-2 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={t('contribute.media.sourceTitle', { defaultValue: 'Ajouter une photo' })}
          >
            <h3 className="font-heading text-lg text-foreground text-center mb-2">
              {t('contribute.media.sourceTitle', { defaultValue: 'Ajouter une photo' })}
            </h3>
            <button
              type="button"
              onClick={openCamera}
              className="flex items-center gap-3 w-full h-12 px-4 rounded-xl bg-primary-light/40 hover:bg-primary-light/70 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Camera className="size-5 text-primary" aria-hidden="true" />
              <span className="font-body text-base">
                {t('contribute.media.sourceCamera', { defaultValue: 'Appareil photo' })}
              </span>
            </button>
            <button
              type="button"
              onClick={openGallery}
              className="flex items-center gap-3 w-full h-12 px-4 rounded-xl bg-primary-light/40 hover:bg-primary-light/70 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Images className="size-5 text-primary" aria-hidden="true" />
              <span className="font-body text-base">
                {t('contribute.media.sourceGallery', { defaultValue: 'Galerie de photos' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSourceSheetOpen(false)}
              className="mt-2 h-11 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('common.cancel', { defaultValue: 'Annuler' })}
            </button>
          </div>
        </div>
      )}

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

      {/* Modal d'édition photo (PRD photo-management v2 · T3) */}
      {editingIndex !== null && files[editingIndex] && (
        <PhotoEditModal
          url={previewUrls[editingIndex]}
          targetFormat={aspectRatio}
          initialCrop={photoEdits?.[photoFileKey(files[editingIndex])]?.cropData}
          initialAlt={photoEdits?.[photoFileKey(files[editingIndex])]?.alt}
          onCancel={closeEditor}
          onSave={(result) => saveEditor(editingIndex, result)}
        />
      )}
    </div>
  )
}
