/**
 * ImageSlider — Galerie d'images d'un post (Figma · format-aware)
 *
 * Source de vérité : ratios Figma (la HAUTEUR scale avec la largeur).
 *   · 16:9    → ratio 606/384 (≈ 1.578:1) → à 656px wide : 416px tall
 *   · 1:1     → ratio 1:1                 → 656×656px
 *   · portrait → ratio 606/768 (4:5)      → à 656px wide : 832px tall
 *
 * Pixel-perfect Figma :
 *   · Photo unique  : pleine colonne post (656px), aspect Figma.
 *   · Multi-photos  : carousel scroll-snap. Slides à 92% sur mobile (peek
 *     natif pour swipe one-at-a-time) et 606px fixe sur desktop md+ (peek
 *     de ~50px sur la colonne 656px, exactement comme la maquette).
 *
 * Le post est cappé à 704px (656 + p-6 padding) dans FeedPost, et la layout
 * Home cappe le main column à 704px sur XL ≥ 1440px.
 *
 * Interactions :
 *   · Click / Enter      → ouvre la lightbox plein écran
 *   · Drag souris (multi) → scroll horizontal avec snap manuel
 *   · Touch / trackpad   → scroll natif avec snap CSS
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { MockPost } from './FeedPost'
import { PhotoLightbox } from './PhotoLightbox'
import type { LightboxData } from './PhotoLightbox'

// ─── Style par format ────────────────────────────────────────────────────────

/** Aspect ratio Figma de la photo. Largeur fournie par Tailwind, hauteur déduite. */
const FORMAT_ASPECT: Record<MockPost['format'], string> = {
  // Figma node 6385:60464 — slide 606×384.
  '16:9': 'aspect-[606/384]',
  // Figma node 6385:60539 — slide 606×768.
  portrait: 'aspect-[606/768]',
  // Figma node 6385:60614 — slide 606×606.
  '1:1': 'aspect-square',
}

/** Largeur max = colonne post Figma (656px). */
const COLUMN_MAX_W = 'max-w-[656px]'

/** Espacement Figma entre slides (gap-1 = 4px). Doit matcher pour le snap manuel. */
const SLIDE_GAP_PX = 4

/** Seuil de mouvement souris pour basculer de "click" à "drag". */
const DRAG_THRESHOLD_PX = 4

// ─── Hook : drag-to-scroll souris ────────────────────────────────────────────

/**
 * Émule le click-and-drag à la souris pour le scroll horizontal du carousel.
 * Le scroll-snap natif gère trackpad et touch ; la souris lui ne déclenche pas
 * de momentum scroll, donc pas de snap. Ici on désactive le snap pendant le
 * drag puis on snap manuellement à la slide la plus proche au release.
 *
 * ⚠ `setPointerCapture` n'est appelé QU'APRÈS détection d'un drag réel
 * (mouvement > DRAG_THRESHOLD_PX). Sinon le click event serait dispatché sur
 * l'élément capturé (scroller) au lieu du `<button>` enfant — la lightbox
 * ne s'ouvrirait plus. Capturer après seuil préserve le click flow natif.
 */
function useCarouselDrag(scrollerRef: RefObject<HTMLDivElement | null>) {
  const dragState = useRef<{
    startX: number
    startScroll: number
    moved: boolean
    pointerId: number
  } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      const scroller = scrollerRef.current
      if (!scroller) return
      dragState.current = {
        startX: e.clientX,
        startScroll: scroller.scrollLeft,
        moved: false,
        pointerId: e.pointerId,
      }
    },
    [scrollerRef],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = dragState.current
      const scroller = scrollerRef.current
      if (!s || !scroller || s.pointerId !== e.pointerId) return
      const dx = e.clientX - s.startX
      if (!s.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
        // Bascule en mode drag : on capture, on désactive le snap CSS.
        s.moved = true
        scroller.setPointerCapture(e.pointerId)
        scroller.style.scrollSnapType = 'none'
        scroller.style.cursor = 'grabbing'
      }
      if (s.moved) {
        e.preventDefault() // empêche la sélection de texte
        scroller.scrollLeft = s.startScroll - dx
      }
    },
    [scrollerRef],
  )

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = dragState.current
      const scroller = scrollerRef.current
      if (!s || !scroller) return
      // Pas de drag détecté → on laisse le click natif fire normalement.
      if (!s.moved) {
        dragState.current = null
        return
      }
      scroller.style.cursor = ''
      try {
        scroller.releasePointerCapture(e.pointerId)
      } catch {
        /* déjà relâché */
      }
      // Snap manuel sur la slide la plus proche (direction-aware, seuil 25%).
      const slides = scroller.querySelectorAll<HTMLElement>('[data-slide-index]')
      if (slides.length > 0) {
        const slideStep = slides[0].offsetWidth + SLIDE_GAP_PX
        const dragDx = scroller.scrollLeft - s.startScroll
        const startIdx = Math.round(s.startScroll / slideStep)
        const threshold = slideStep * 0.25
        let targetIdx = startIdx
        if (dragDx > threshold) targetIdx = Math.min(slides.length - 1, startIdx + 1)
        else if (dragDx < -threshold) targetIdx = Math.max(0, startIdx - 1)
        scroller.scrollTo({ left: targetIdx * slideStep, behavior: 'smooth' })
      }
      // Suppress du click parasite qui suit le release (sinon ouvre la lightbox).
      const suppress = (ev: Event) => {
        ev.stopPropagation()
        ev.preventDefault()
        scroller.removeEventListener('click', suppress, true)
      }
      scroller.addEventListener('click', suppress, true)
      // Restaure le snap APRÈS l'animation smooth (≈ 300-400ms). Si on restaure
      // trop tôt, snap-mandatory peut interrompre le scrollTo programmatique.
      setTimeout(() => {
        scroller.style.scrollSnapType = ''
      }, 450)
      dragState.current = null
    },
    [scrollerRef],
  )

  return { onPointerDown, onPointerMove, onPointerEnd }
}

// ─── Hook : index de la slide actuellement visible ───────────────────────────

/**
 * Suit la slide la plus visible dans le scroller via IntersectionObserver.
 * Sert au compteur "1/N" — pas au snap (qui reste géré par CSS scroll-snap).
 */
function useCurrentSlideIndex(scrollerRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const slides = scroller.querySelectorAll<HTMLElement>('[data-slide-index]')
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a))
        const idx = Number((top.target as HTMLElement).dataset.slideIndex)
        if (!Number.isNaN(idx)) setCurrentIndex(idx)
      },
      { root: scroller, threshold: [0.5, 0.75, 1] },
    )
    slides.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [scrollerRef, enabled])

  return currentIndex
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface ImageSliderProps {
  images: MockPost['images']
  format: MockPost['format']
  author: MockPost['author']
  /** ID + titre du post — propagés à la lightbox pour activer le partage */
  postId?: string
  postTitle?: string
}

export function ImageSlider({
  images: rawImages,
  format,
  author,
  postId,
  postTitle,
}: ImageSliderProps) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState<LightboxData | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const images = rawImages.filter((img) => !!img.url)
  const isMulti = images.length > 1
  const aspect = FORMAT_ASPECT[format]

  const currentIndex = useCurrentSlideIndex(scrollerRef, isMulti)
  const drag = useCarouselDrag(scrollerRef)

  if (images.length === 0) return null

  const openLightbox = (index: number) => {
    setLightbox({
      images: images.map((img) => ({ url: img.url, alt: img.alt })),
      currentIndex: index,
      authorName: author.name,
      authorAvatar: author.avatar,
      // Format propagé pour que la lightbox respecte l'aspect-ratio choisi
      // à la création — second-agent/18.
      format,
      // Identité du post — active le bouton Partager dans la lightbox
      // (second-agent/20).
      postId,
      postTitle,
    })
  }

  const enlargeLabel = t('home.post.enlarge', { defaultValue: 'Agrandir' })

  return (
    <>
      {!isMulti ? (
        // ── Photo unique : pleine colonne post (656px max) ───────────────────
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className={[
            'relative block w-full overflow-hidden rounded-md cursor-zoom-in bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            aspect,
            COLUMN_MAX_W,
          ].join(' ')}
          aria-label={`${images[0].alt} — ${enlargeLabel}`}
        >
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="absolute inset-0 size-full object-cover"
            loading="eager"
            decoding="async"
          />
        </button>
      ) : (
        // ── Multi-photos : carousel scroll-snap horizontal ───────────────────
        <div
          className={['relative w-full', COLUMN_MAX_W].join(' ')}
          role="region"
          aria-roledescription="carousel"
          aria-label={t('home.post.navImages')}
        >
          <div
            ref={scrollerRef}
            onPointerDown={drag.onPointerDown}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerEnd}
            onPointerCancel={drag.onPointerEnd}
            className={[
              'flex gap-1 overflow-x-auto',
              'snap-x snap-mandatory scroll-smooth',
              'cursor-grab select-none touch-pan-y',
              '[&::-webkit-scrollbar]:hidden [scrollbar-width:none]',
            ].join(' ')}
          >
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                data-slide-index={i}
                onClick={() => openLightbox(i)}
                className={[
                  // Mobile : 92% pour swipe avec peek natif.
                  // Desktop md+ : 606px Figma exact (peek ~50px sur 656).
                  // max-w-full : safety pour XL serrés (1280-1440) où le main
                  // peut tomber sous 606 → la slide se cale au parent.
                  'relative shrink-0 w-[92%] md:w-[606px] md:max-w-full overflow-hidden rounded-md bg-muted',
                  'snap-start snap-always cursor-zoom-in',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                  aspect,
                ].join(' ')}
                aria-label={`${img.alt} — ${enlargeLabel} (${i + 1}/${images.length})`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="absolute inset-0 size-full object-cover pointer-events-none"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          {/* Compteur Figma (node 6385:60466) — pill verre dépoli bottom-right.
              "N/Total" : index courant en bold, séparateur + total en regular. */}
          <div
            role="status"
            aria-live="polite"
            aria-label={t('home.post.imageOf', {
              current: currentIndex + 1,
              total: images.length,
              defaultValue: 'Image {{current}} sur {{total}}',
            })}
            className={[
              'absolute bottom-2 right-2 inline-flex items-center justify-center',
              'min-w-[31px] h-6 px-1 pb-0.5 rounded',
              'bg-foreground/30 backdrop-blur-md',
              'text-[14px] leading-none font-body text-white tabular-nums',
            ].join(' ')}
          >
            <span className="font-bold">{currentIndex + 1}</span>
            <span aria-hidden="true">/{images.length}</span>
          </div>
        </div>
      )}

      {/* Lightbox plein écran — rendue une seule fois, partagée single+multi. */}
      {lightbox && (
        <PhotoLightbox
          data={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => (prev ? { ...prev, currentIndex: i } : null))}
        />
      )}
    </>
  )
}
