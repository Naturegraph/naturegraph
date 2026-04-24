/**
 * PhotoEditModal — Recadrage non destructif + rotation + alt text (PRD photo-management v2 · T3).
 *
 * Principes (rappel PRD) :
 *   · P1 Non-destruction : l'original reste intact. On produit un `CropData`
 *     { scale, offsetX, offsetY, rotation } appliqué uniquement à l'affichage
 *     et persisté dans `media.crop_data` (migration 20260422).
 *   · P2 Contrôle explicite : l'utilisateur voit précisément le viewport final
 *     (aspect ratio du post) et décide de son recadrage.
 *   · P5 Accessibilité : modal clavier-navigable, focus-trap minimal, Escape,
 *     aria-modal, controls taggués.
 *
 * Sobriété :
 *   · Zéro librairie externe (react-easy-crop / react-image-crop pèsent 20-40 kB).
 *   · Implémentation canvas-free — transforms CSS sur un <img>, le calcul de
 *     recadrage effectif se fait côté affichage à partir de `crop_data`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { PhotoAspectRatio } from './EncounterStep1'

// CropData n'est plus persisté côté DB (PRD photo-management v3 — non-destruction
// par défaut, édition fine dépréciée). On conserve le type localement pour que
// la modale continue de fonctionner en preview côté client tant qu'elle est
// encore câblée dans EncounterStep1.
export interface CropData {
  scale: number
  offsetX: number
  offsetY: number
  rotation?: 0 | 90 | 180 | 270
}

const ASPECT_CLASS: Record<PhotoAspectRatio, string> = {
  landscape: 'aspect-[16/9]',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
}

const MIN_SCALE = 1
const MAX_SCALE = 3
const SCALE_STEP = 0.1

export interface PhotoEditResult {
  cropData: CropData
  alt: string
}

interface PhotoEditModalProps {
  /** URL de prévisualisation (objectURL). */
  url: string
  /** Format cible du post (viewport de recadrage). */
  targetFormat: PhotoAspectRatio
  /** Valeurs initiales (édition d'un slot déjà recadré). */
  initialCrop?: CropData
  initialAlt?: string
  /** Fermeture sans sauvegarde. */
  onCancel: () => void
  /** Validation — renvoie crop + alt au parent. */
  onSave: (result: PhotoEditResult) => void
}

/**
 * Normalise une rotation en quart de tour dans [0, 270].
 */
function normalizeRotation(deg: number): 0 | 90 | 180 | 270 {
  const mod = ((deg % 360) + 360) % 360
  if (mod < 90) return 0
  if (mod < 180) return 90
  if (mod < 270) return 180
  return 270
}

export function PhotoEditModal({
  url,
  targetFormat,
  initialCrop,
  initialAlt,
  onCancel,
  onSave,
}: PhotoEditModalProps) {
  const { t } = useTranslation()

  // ── État crop ───────────────────────────────────────────────────────────
  const [scale, setScale] = useState(initialCrop?.scale ?? 1)
  const [offsetX, setOffsetX] = useState(initialCrop?.offsetX ?? 0)
  const [offsetY, setOffsetY] = useState(initialCrop?.offsetY ?? 0)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(
    normalizeRotation(initialCrop?.rotation ?? 0),
  )
  const [alt, setAlt] = useState(initialAlt ?? '')

  // ── Drag pan ────────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, baseX: offsetX, baseY: offsetY }
    },
    [offsetX, offsetY],
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current
    if (!s || !viewportRef.current) return
    const rect = viewportRef.current.getBoundingClientRect()
    // Clamp : on limite à ±50% de la taille du viewport pour rester à l'écran.
    const maxX = rect.width * 0.5
    const maxY = rect.height * 0.5
    setOffsetX(Math.max(-maxX, Math.min(maxX, s.baseX + e.clientX - s.x)))
    setOffsetY(Math.max(-maxY, Math.min(maxY, s.baseY + e.clientY - s.y)))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }, [])

  // ── Zoom (wheel + boutons) ──────────────────────────────────────────────
  const adjustScale = useCallback((delta: number) => {
    setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(prev + delta).toFixed(2))))
  }, [])

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault()
      adjustScale(e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP)
    },
    [adjustScale],
  )

  // ── Rotation (+90°, -90°) ───────────────────────────────────────────────
  const rotate = useCallback((dir: 'left' | 'right') => {
    setRotation((prev) => normalizeRotation(dir === 'right' ? prev + 90 : prev - 90))
  }, [])

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setScale(1)
    setOffsetX(0)
    setOffsetY(0)
    setRotation(0)
  }, [])

  // ── Escape + focus-trap minimal ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const transform = useMemo(
    () => `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
    [offsetX, offsetY, scale, rotation],
  )

  const handleSave = () => {
    onSave({
      cropData: {
        scale: +scale.toFixed(3),
        offsetX: Math.round(offsetX),
        offsetY: Math.round(offsetY),
        rotation,
      },
      alt: alt.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/60 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('contribute.media.edit.title', { defaultValue: 'Modifier la photo' })}
        className="w-full max-w-lg bg-background rounded-2xl shadow-xl flex flex-col gap-4 p-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-foreground">
            {t('contribute.media.edit.title', { defaultValue: 'Modifier la photo' })}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 rounded-full flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Viewport de recadrage — aspect ratio = format cible du post */}
        <div
          ref={viewportRef}
          className={[
            'relative w-full rounded-lg overflow-hidden bg-muted select-none touch-none cursor-move',
            ASPECT_CLASS[targetFormat],
          ].join(' ')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <img
            src={url}
            alt=""
            className="absolute inset-0 m-auto max-w-none pointer-events-none will-change-transform"
            style={{
              transform,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            draggable={false}
          />
        </div>

        {/* Contrôles : zoom + rotation + reset */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Zoom">
            <button
              type="button"
              onClick={() => adjustScale(-SCALE_STEP)}
              disabled={scale <= MIN_SCALE}
              aria-label={t('contribute.media.edit.zoomOut', { defaultValue: 'Dézoomer' })}
              className="size-9 rounded-full flex items-center justify-center border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ZoomOut className="size-4" aria-hidden="true" />
            </button>
            <span
              className="font-body text-xs text-muted-foreground w-12 text-center tabular-nums"
              aria-live="polite"
            >
              ×{scale.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => adjustScale(SCALE_STEP)}
              disabled={scale >= MAX_SCALE}
              aria-label={t('contribute.media.edit.zoomIn', { defaultValue: 'Zoomer' })}
              className="size-9 rounded-full flex items-center justify-center border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Rotation">
            <button
              type="button"
              onClick={() => rotate('left')}
              aria-label={t('contribute.media.edit.rotateLeft', {
                defaultValue: 'Tourner à gauche',
              })}
              className="size-9 rounded-full flex items-center justify-center border border-border hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => rotate('right')}
              aria-label={t('contribute.media.edit.rotateRight', {
                defaultValue: 'Tourner à droite',
              })}
              className="size-9 rounded-full flex items-center justify-center border border-border hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={reset}
            className="h-9 px-3 rounded-full text-xs font-body text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('contribute.media.edit.reset', { defaultValue: 'Réinitialiser' })}
          </button>
        </div>

        {/* Alt text — accessibilité (PRD § P5) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="photo-alt" className="text-sm font-body text-foreground">
            {t('contribute.media.edit.altLabel', {
              defaultValue: 'Description pour l\u2019accessibilité',
            })}
          </label>
          <input
            id="photo-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={200}
            placeholder={t('contribute.media.edit.altPlaceholder', {
              defaultValue: 'Ex. Mésange charbonnière sur une branche de chêne',
            })}
            className="h-11 px-4 rounded-full border border-border bg-background text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            {t('contribute.media.edit.altHint', {
              defaultValue: 'Décris ce que l\u2019on voit — lu par les lecteurs d\u2019écran.',
            })}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-full text-sm font-body text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-5 rounded-full text-sm font-body font-bold bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('common.save', { defaultValue: 'Enregistrer' })}
          </button>
        </div>
      </div>
    </div>
  )
}
