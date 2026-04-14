/**
 * ImageSlider — Galerie d'images d'un post avec lightbox intégrée
 *
 * Affiche les images selon leur nombre :
 *   1 image  → plein cadre (aspect ratio adapté au format du post)
 *   2 images → côte à côte (aspect-[4/3] chacune)
 *   3 images → grande à gauche (2/3) + deux petites empilées à droite (1/3)
 *   4+       → grille 2×2 avec compteur "+N" sur la dernière cellule
 *
 * Un clic sur n'importe quelle image ouvre la PhotoLightbox (navigation entre toutes).
 *
 * Accessibilité :
 *   - Chaque bouton-image a un aria-label descriptif
 *   - Les groupes multi-images ont un role="group" avec aria-label
 *   - Le compteur "+N" est aria-hidden (l'info est dans le aria-label du bouton)
 */

import { useState } from 'react'
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

// ─── Composant ────────────────────────────────────────────────────────────────

export function ImageSlider({ images: rawImages, format, author }: ImageSliderProps) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState<LightboxData | null>(null)

  // Filtre defensif : evite <img src=""> qui declenche un warning React
  // et un re-download de la page entiere par le navigateur.
  const images = rawImages.filter((img) => !!img.url)

  if (images.length === 0) return null

  /** Ouvre la lightbox sur l'image à l'index donné */
  function openLightbox(index: number) {
    setLightbox({
      images: images.map((img) => ({ url: img.url, alt: img.alt })),
      currentIndex: index,
      authorName: author.name,
      authorAvatar: author.avatar,
    })
  }

  /** Classes partagées pour chaque bouton-image */
  const btnBase =
    'relative bg-muted overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'

  const imgBase = 'absolute inset-0 size-full object-cover'

  // ── 1 image : plein cadre avec aspect ratio selon le format du post ────────
  const singleAspect = { '16:9': 'aspect-video', portrait: 'aspect-[3/4]', '1:1': 'aspect-square' }[
    format
  ]

  if (images.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className={`${btnBase} w-full ${singleAspect} rounded-xl`}
          aria-label={`${images[0].alt} — Agrandir`}
        >
          <img src={images[0].url} alt={images[0].alt} className={imgBase} loading="lazy" />
        </button>
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

  // ── 2 images : côte à côte ─────────────────────────────────────────────────
  if (images.length === 2) {
    return (
      <>
        <div
          className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden"
          role="group"
          aria-label={t('home.post.navImages')}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => openLightbox(i)}
              className={`${btnBase} aspect-[4/3]`}
              aria-label={`${img.alt} — Agrandir`}
            >
              <img src={img.url} alt={img.alt} className={imgBase} loading="lazy" />
            </button>
          ))}
        </div>
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

  // ── 3 images : grande à gauche, deux petites à droite ─────────────────────
  if (images.length === 3) {
    return (
      <>
        <div
          className="grid grid-cols-[2fr_1fr] gap-1 rounded-xl overflow-hidden h-56 md:h-72"
          role="group"
          aria-label={t('home.post.navImages')}
        >
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className={`${btnBase} h-full`}
            aria-label={`${images[0].alt} — Agrandir`}
          >
            <img src={images[0].url} alt={images[0].alt} className={imgBase} loading="lazy" />
          </button>
          <div className="flex flex-col gap-1 h-full">
            {images.slice(1).map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => openLightbox(i + 1)}
                className={`${btnBase} flex-1`}
                aria-label={`${img.alt} — Agrandir`}
              >
                <img src={img.url} alt={img.alt} className={imgBase} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
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

  // ── 4+ images : grille 2×2 avec compteur sur la dernière cellule ──────────
  const displayImages = images.slice(0, 4)
  const remaining = images.length - 4

  return (
    <>
      <div
        className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden"
        role="group"
        aria-label={t('home.post.navImages')}
      >
        {displayImages.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => openLightbox(i)}
            className={`${btnBase} aspect-square`}
            aria-label={
              i === 3 && remaining > 0
                ? `${img.alt} — +${remaining} autres photos`
                : `${img.alt} — Agrandir`
            }
          >
            <img src={img.url} alt={img.alt} className={imgBase} loading="lazy" />
            {/* Overlay "+N" : indique le nombre de photos supplémentaires */}
            {i === 3 && remaining > 0 && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-foreground/50 flex items-center justify-center"
              >
                <span className="text-white text-2xl font-bold">+{remaining}</span>
              </div>
            )}
          </button>
        ))}
      </div>
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
