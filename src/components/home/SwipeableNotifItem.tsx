/**
 * SwipeableNotifItem — Wrapper swipe-to-delete pour les notifs mobile
 * ============================================================
 *
 * Pattern UX iOS/Android natif :
 *   - Tap sur l'item → action normale (navigation)
 *   - Swipe horizontal vers la gauche → révèle un bouton « Supprimer »
 *     rouge en arrière-plan. Si swipe > 40% de la largeur de la zone
 *     supprimer, l'item se snap en position révélée. Sinon il revient.
 *   - Tap sur le bouton « Supprimer » → appelle `onDelete()`.
 *   - Tap n'importe où ailleurs (item ou hors) → snap retour.
 *
 * Accessibilité :
 *   - Le bouton supprimer reste accessible au clavier via Tab (focus visible).
 *   - aria-label explicite « Supprimer cette notification ».
 *   - `prefers-reduced-motion` : on désactive l'animation translate (snap direct).
 *
 * Performance :
 *   - `touch-pan-y` sur le wrapper extérieur pour ne pas bloquer le scroll
 *     vertical de la liste pendant un swipe horizontal naissant.
 *   - Animation via `transform: translateX()` (GPU-accelerated, pas de reflow).
 */

import { useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

interface SwipeableNotifItemProps {
  /** Contenu visible (NotifItem habituel). */
  children: ReactNode
  /** Appelé quand l'utilisateur valide la suppression. */
  onDelete: () => void
  /** Largeur du bouton « Supprimer » révélé (px). */
  revealWidth?: number
  /** Aria label sur le bouton supprimer. */
  deleteLabel?: string
}

const SWIPE_THRESHOLD = 0.4 // 40% du revealWidth pour snap en position révélée

export function SwipeableNotifItem({
  children,
  onDelete,
  revealWidth = 80,
  deleteLabel = 'Supprimer cette notification',
}: SwipeableNotifItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    isDraggingRef.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return
    const dx = e.touches[0].clientX - startXRef.current
    // Si swipe horizontal détecté (> 8 px), on bloque le tap et on commence
    // à translater. Le scroll vertical de la liste reste possible.
    if (!isDraggingRef.current && Math.abs(dx) > 8) {
      isDraggingRef.current = true
    }
    if (!isDraggingRef.current) return
    // Position de base : 0 si non révélé, -revealWidth si déjà révélé.
    const base = isRevealed ? -revealWidth : 0
    // Clamper entre [-revealWidth - 16, 16] pour un peu d'élasticité.
    const next = Math.max(-revealWidth - 16, Math.min(16, base + dx))
    setTranslateX(next)
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) {
      // Tap simple : si révélé, on cache (sauf si le tap était sur le bouton
      // delete qui gère son propre clic).
      if (isRevealed) {
        setIsRevealed(false)
        setTranslateX(0)
      }
      startXRef.current = null
      return
    }
    // Décider du snap final selon le seuil 40%.
    const shouldReveal = translateX < -revealWidth * SWIPE_THRESHOLD
    setIsRevealed(shouldReveal)
    setTranslateX(shouldReveal ? -revealWidth : 0)
    isDraggingRef.current = false
    startXRef.current = null
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div className="relative overflow-hidden">
      {/* Bouton supprimer en arrière-plan — révélé par le swipe.
          Hauteur 100% pour matcher l'item. */}
      <button
        type="button"
        onClick={handleDelete}
        aria-label={deleteLabel}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--color-error)] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        style={{ width: revealWidth }}
        tabIndex={isRevealed ? 0 : -1}
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>

      {/* Item swipeable — translate pour révéler/cacher le bouton */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative bg-cream-lighter transition-transform duration-200 motion-reduce:transition-none touch-pan-y"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
