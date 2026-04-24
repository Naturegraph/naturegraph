/**
 * ImageSlider — Galerie d'images d'un post, slider scroll-snap horizontal.
 *
 * Refonte PRD photo-management v2 · T5 :
 *   · Un seul format d'affichage par post (principe P3), déterminé par
 *     `media_format` (post.format ici) — toutes les photos occupent le même
 *     viewport avec le même aspect ratio.
 *   · `object-contain` + `bg-muted` : non-destruction des pixels sources (P1/P2).
 *     Si le format natif diffère, un letterbox neutre absorbe la différence.
 *   · Navigation : scroll horizontal natif avec `scroll-snap-x mandatory` —
 *     zéro JS de slider, zéro lib externe. Le navigateur gère l'inertie, le
 *     clavier (flèches), le tactile, le trackpad. Pagination dotée pour aider.
 *
 * Accessibilité :
 *   - role="region" + aria-roledescription="carousel"
 *   - Navigation clavier native via scroll
 *   - Dots avec aria-label + aria-current
 *   - Lightbox au clic/Enter
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MockPost } from './FeedPost'
import { PhotoLightbox } from './PhotoLightbox'
import type { LightboxData } from './PhotoLightbox'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageSliderProps {
  images: MockPost['images']
  format: MockPost['format']
  author: MockPost['author']
}

/**
 * Mapping format post → classe d'aspect Tailwind.
 * On aligne sur les conventions du PRD (landscape/portrait/square) tout en
 * préservant la compat avec les valeurs legacy (16:9, 1:1).
 */
const ASPECT_CLASS: Record<MockPost['format'], string> = {
  '16:9': 'aspect-video',
  portrait: 'aspect-[3/4]',
  '1:1': 'aspect-square',
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ImageSlider({ images: rawImages, format, author }: ImageSliderProps) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState<LightboxData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Filtre defensif : evite <img src=""> qui déclenche un warning React
  // et un re-download de la page entière par le navigateur.
  const images = rawImages.filter((img) => !!img.url)

  // ── Détection du slide courant via IntersectionObserver ─────────────────
  // Plus robuste que scroll+offsetLeft, ne dépend pas de la taille du viewport.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || images.length <= 1) return
    const slides = scroller.querySelectorAll<HTMLElement>('[data-slide-index]')
    const observer = new IntersectionObserver(
      (entries) => {
        // On prend l'entry la plus visible parmi les intersectées.
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
  }, [images.length])

  if (images.length === 0) return null

  /** Ouvre la lightbox sur l'image à l'index donné */
  function openLightbox(index: number) {
    setLightbox({
      images: images.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
      currentIndex: index,
      authorName: author.name,
      authorAvatar: author.avatar,
    })
  }

  /** Fait défiler jusqu'au slide demandé (clic sur un dot). */
  function scrollToSlide(index: number) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const target = scroller.querySelector<HTMLElement>(`[data-slide-index="${index}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  const aspectClass = ASPECT_CLASS[format]
  const isMulti = images.length > 1

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('home.post.navImages')}
    >
      {/* Scroller horizontal — scroll-snap natif, zéro JS */}
      <div
        ref={scrollerRef}
        className={[
          'flex overflow-x-auto rounded-xl bg-muted',
          'snap-x snap-mandatory scroll-smooth',
          // Masque la scrollbar sans casser l'accessibilité (utilitaire Tailwind
          // si disponible, sinon fallback via CSS global).
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
              'relative shrink-0 w-full snap-start snap-always',
              'cursor-zoom-in focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              aspectClass,
            ].join(' ')}
            aria-label={`${img.alt} — ${t('home.post.enlarge', { defaultValue: 'Agrandir' })}${
              isMulti ? ` (${i + 1}/${images.length})` : ''
            }`}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="absolute inset-0 size-full object-contain"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Pagination dots (≥ 2 images) */}
      {isMulti && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground/40 backdrop-blur-sm"
          role="tablist"
          aria-label={t('home.post.navImages')}
        >
          {images.map((_, i) => {
            const active = i === currentIndex
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? 'true' : undefined}
                aria-label={`${t('home.post.goToImage', { defaultValue: 'Aller à la photo' })} ${i + 1}`}
                onClick={() => scrollToSlide(i)}
                className={[
                  'rounded-full transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80',
                ].join(' ')}
              />
            )
          })}
        </div>
      )}

      {/* Compteur "N/Total" pour 4+ photos (accès rapide à l'info) */}
      {images.length >= 4 && (
        <div
          aria-hidden="true"
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-foreground/60 text-white text-xs font-body tabular-nums"
        >
          {currentIndex + 1}/{images.length}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          data={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => (prev ? { ...prev, currentIndex: i } : null))}
        />
      )}
    </div>
  )
}
