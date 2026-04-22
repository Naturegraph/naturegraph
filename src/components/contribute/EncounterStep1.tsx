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
import { Camera, ImagePlus, Images, Plus, X } from 'lucide-react'
import { extractBatchMetadata, type PhotoMetadata } from '@/utils/extractPhotoMetadata'

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

/** Offset d'ajustement du crop (px dans le repère du conteneur). */
export interface CropOffset {
  x: number
  y: number
}

/** Slot rempli — photo + bouton remove + drag pour repositionner (hero) */
interface FilledSlotProps {
  url: string
  onRemove: () => void
  variant: 'large' | 'small'
  /** Classe Tailwind d'aspect du conteneur (épouse le format choisi). */
  aspectClass: string
  /** Décalage (px) appliqué à la photo pour ajuster son cadrage. */
  offset: CropOffset
  /** Callback lorsque l'utilisateur drague (uniquement grand slot). */
  onOffsetChange?: (offset: CropOffset) => void
  removeLabel: string
  dragHint?: string
}

function FilledSlot({
  url,
  onRemove,
  variant,
  aspectClass,
  offset,
  onOffsetChange,
  removeLabel,
  dragHint,
}: FilledSlotProps) {
  const isLarge = variant === 'large'
  const isDraggable = isLarge && !!onOffsetChange
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)

  // ── Drag pan : pointerEvents (souris + tactile unifiés) ───────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current
    if (!s || !isDraggable || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Clamp offset pour que l'image ne sorte jamais du conteneur
    // (limite = moitié du débordement — ici on autorise large pan à ±40% de la taille)
    const maxX = rect.width * 0.4
    const maxY = rect.height * 0.4
    const nextX = Math.max(-maxX, Math.min(maxX, s.baseX + e.clientX - s.startX))
    const nextY = Math.max(-maxY, Math.min(maxY, s.baseY + e.clientY - s.startY))
    onOffsetChange?.({ x: nextX, y: nextY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragStateRef.current = null
  }

  return (
    <div
      ref={containerRef}
      className={[
        'relative rounded-[4px] overflow-hidden bg-muted select-none',
        // Le conteneur épouse le format choisi — plus besoin d'overlay crop.
        aspectClass,
        'transition-[aspect-ratio] duration-200',
        isDraggable ? 'cursor-move touch-none' : '',
      ].join(' ')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={url}
        alt=""
        className="size-full object-cover pointer-events-none will-change-transform"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {/* Hint visuel "glisse pour cadrer" — uniquement sur le grand slot */}
      {isDraggable && dragHint && offset.x === 0 && offset.y === 0 && (
        <div
          className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-foreground/70 text-white text-xs font-body"
          aria-hidden="true"
        >
          {dragHint}
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-1.5 right-1.5 size-6 rounded-full bg-foreground/70 text-white flex items-center justify-center hover:bg-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary z-10"
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

  // Offset de crop par fichier (repositionnement drag) — état local.
  // À la validation finale ces offsets seront utilisés pour générer le crop réel.
  const [offsets, setOffsets] = useState<CropOffset[]>([])

  // Synchronise le tableau d'offsets avec les fichiers (fill/trim).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fill/trim synchronisé sur files.length
    setOffsets((prev) => {
      const next = [...prev]
      while (next.length < files.length) next.push({ x: 0, y: 0 })
      return next.slice(0, files.length)
    })
  }, [files.length])

  // Reset des offsets si l'utilisateur change de format — le crop n'est plus
  // pertinent et on repart d'un cadrage centré.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intentionnel synchronisé sur aspectRatio
    setOffsets((prev) => prev.map(() => ({ x: 0, y: 0 })))
  }, [aspectRatio])

  const updateOffset = useCallback((index: number, next: CropOffset) => {
    setOffsets((prev) => {
      const copy = [...prev]
      copy[index] = next
      return copy
    })
  }, [])

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
            aspectClass={heroAspectClass}
            offset={offsets[0] ?? { x: 0, y: 0 }}
            onOffsetChange={(next) => updateOffset(0, next)}
            removeLabel={t('contribute.media.remove', { index: 1 })}
            dragHint={t('contribute.media.dragHint', {
              defaultValue: 'Glisse pour cadrer',
            })}
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
            aspectClass={heroAspectClass}
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
                  aspectClass={thumbAspectClass}
                  offset={offsets[slotIndex] ?? { x: 0, y: 0 }}
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSourceSheetOpen(false)
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
    </div>
  )
}
