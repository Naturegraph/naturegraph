/**
 * PhotoLightbox : Visionneuse photo plein écran
 *
 * Affiche une photo en grand en respectant son format original :
 *   - object-contain pour ne rien rogner
 *   - Navigation prev/next (flèches + clavier)
 *   - Compteur 1/N
 *   - Miniatures de navigation
 *   - Auteur (@username) affiché en bas
 *   - Boutons partage et fermer
 *   - Escape pour fermer
 *
 * Accessibilité : role="dialog" + aria-modal, navigation clavier, focus trap.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { SharePopover } from './SharePopover'
import { ImagePresets } from '@/lib/supabaseImage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LightboxImage {
  url: string
  alt: string
  /** URL haute qualité (si différente de url) */
  hqUrl?: string
}

export interface LightboxData {
  images: LightboxImage[]
  currentIndex: number
  /** Nom d'utilisateur de l'auteur du post */
  authorName?: string
  /** Avatar de l'auteur */
  authorAvatar?: string
  /**
   * Format d'affichage du post : la lightbox respecte ce ratio sur la photo
   * principale pour rester cohérente avec le rendu feed (second-agent/18).
   * Si absent → fallback `'16:9'`.
   */
  format?: '16:9' | 'portrait' | '1:1'
  /**
   * ID + titre du post pour activer le bouton Partager (second-agent/20).
   * Si absents, le bouton Partager est masqué.
   */
  postId?: string
  postTitle?: string
  /**
   * Contexte naturaliste affiché en plein écran (NG-053, retour FB-006).
   *
   * Sans lui, ouvrir une photo faisait perdre l'espèce et le lieu : il ne
   * restait qu'une image. Or sur Naturegraph, contrairement à un réseau de
   * photos, l'espèce fait partie de l'information.
   *
   * `locationLabel` doit être la chaîne DÉJÀ affichée par la publication, et
   * non une valeur recomposée : elle est filtrée en amont par la vue
   * `posts_public`, qui masque le lieu quand `location_hidden` est actif. Le
   * viewer ne peut donc jamais en montrer plus que la publication elle-même.
   */
  speciesName?: string | null
  locationLabel?: string | null
}

/** Mapping format → classe Tailwind d'aspect-ratio (aligné avec ImageSlider) */
const FORMAT_ASPECT: Record<NonNullable<LightboxData['format']>, string> = {
  '16:9': 'aspect-[606/384]',
  portrait: 'aspect-[606/768]',
  '1:1': 'aspect-square',
}

interface PhotoLightboxProps {
  data: LightboxData
  onClose: () => void
  onNavigate: (index: number) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function PhotoLightbox({ data, onClose, onNavigate }: PhotoLightboxProps) {
  const {
    images,
    currentIndex,
    authorName,
    authorAvatar,
    format,
    postId,
    postTitle,
    speciesName,
    locationLabel,
  } = data
  const aspectClass = FORMAT_ASPECT[format ?? '16:9']
  const [showShare, setShowShare] = useState(false)
  const current = images[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrev) onNavigate(currentIndex - 1)
          break
        case 'ArrowRight':
          if (hasNext) onNavigate(currentIndex + 1)
          break
      }
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (!current) return null

  /**
   * URL haute qualité pour le zoom plein écran.
   *   - Si hqUrl explicite fourni (cas Unsplash, GBIF media), on l utilise tel quel
   *   - Sinon Supabase Pro Image Transformations en preset fullSize (2000px, quality 90)
   *     qui retourne l URL d origine intacte si non-Supabase
   *
   * Le fichier source en base reste intact, c est juste la livraison qui est optimisee.
   */
  const hqSrc = current.hqUrl ?? ImagePresets.fullSize(current.url)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse photo"
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-md"
    >
      {/* ── Barre supérieure ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 relative z-10">
        <span className="text-white text-sm font-medium tabular-nums">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2">
          {/*
            Bouton Partager : ouvre le SharePopover (même composant que le feed).
            Masqué si postId absent (lightbox en mode preview seul). second-agent/20.
          */}
          {postId && (
            <button
              type="button"
              onClick={() => setShowShare(true)}
              aria-label="Partager la photo"
              aria-haspopup="dialog"
              aria-expanded={showShare}
              className="size-10 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Share2 className="size-5" aria-hidden="true" />
            </button>
          )}

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la visionneuse"
            className="size-10 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Zone image centrale ─────────────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-4 md:px-16">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            aria-label="Photo précédente"
            className="absolute left-2 md:left-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-safe:active:scale-95"
          >
            <ChevronLeft className="size-7" aria-hidden="true" />
          </button>
        )}

        {/*
          Conteneur cadre format : respecte le format choisi à la création
          (16:9, portrait, 1:1). La photo remplit le cadre via object-cover
          pour rester cohérent avec le rendu feed.
          second-agent/18.
        */}
        <div
          className={[
            'relative h-auto max-h-full w-auto max-w-full',
            'flex items-center justify-center',
            aspectClass,
            // Limite la hauteur pour qu'on tienne dans le viewport sur portrait
            // (ratio 3/4 = beaucoup de hauteur)
            format === 'portrait' ? 'max-h-[80vh]' : 'max-h-[80vh]',
          ].join(' ')}
        >
          <img
            src={hqSrc}
            alt={current.alt}
            className="size-full object-cover rounded-md select-none"
            draggable={false}
          />
        </div>

        {hasNext && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            aria-label="Photo suivante"
            className="absolute right-2 md:right-4 z-10 size-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-safe:active:scale-95"
          >
            <ChevronRight className="size-7" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Barre inférieure ────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2 relative z-10">
        {/*
          Contexte naturaliste (NG-053). Permanent et non auto-masqué : c'est
          precisement ce que l'utilisateur perdait en ouvrant une photo, le
          cacher apres quelques secondes recreerait le probleme.
          Le lieu vient tel quel de la publication, deja filtre par la RLS.
        */}
        {(speciesName || locationLabel) && (
          <div className="mb-3">
            {speciesName && (
              <p className="text-white text-base font-bold leading-tight">{speciesName}</p>
            )}
            {locationLabel && (
              <p className="text-white/70 text-sm leading-tight mt-0.5">{locationLabel}</p>
            )}
          </div>
        )}

        {authorName && (
          <div className="flex items-center gap-2 mb-3">
            {authorAvatar && (
              <img
                src={authorAvatar}
                alt=""
                className="size-7 rounded-full object-cover ring-1 ring-white/30"
              />
            )}
            <span className="text-white text-sm font-medium">
              @{authorName.toLowerCase().replace(/[.\s]/g, '')}
            </span>
          </div>
        )}

        {images.length > 1 && (
          <div className="flex justify-center gap-2" role="tablist" aria-label="Miniatures">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Photo ${i + 1}`}
                onClick={() => onNavigate(i)}
                className={[
                  'size-12 md:size-14 rounded-md overflow-hidden shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  i === currentIndex
                    ? 'ring-2 ring-white opacity-100'
                    : 'opacity-50 hover:opacity-80',
                ].join(' ')}
              >
                <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SharePopover : overlay au-dessus de la lightbox quand activé */}
      {showShare && postId && (
        <SharePopover postId={postId} title={postTitle ?? ''} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
