/**
 * FeedGallery — Vue galerie masonry du feed
 *
 * Affiche UNE cover-image par post (1 cellule = 1 post) :
 *   - 3 colonnes sur desktop, 2 colonnes sur mobile
 *   - Formats respectés (display_format) : paysage 16:9, portrait 3:4, carré 1:1
 *   - Si le post a plusieurs photos : badge "icône + count" en haut-droite
 *   - Overlay auteur + titre au survol / focus
 *   - Clic → ouvre la PhotoLightbox plein écran (toutes les photos du post)
 *   - Lazy loading images pour l'éco-conception
 *
 * Utilise la propriété CSS `columns` pour le layout masonry
 * (préféré à une solution JS — RGESN, sobriété numérique).
 */

import { useState } from 'react'
import { Images } from 'lucide-react'
import type { MockPost } from './FeedPost'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { PhotoLightbox } from './PhotoLightbox'
import type { LightboxData } from './PhotoLightbox'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryItem {
  /** ID unique = postId (1 cellule par post) */
  id: string
  /** Cover : première image du post */
  imageUrl: string
  alt: string
  /** Format visuel déterminant l'aspect-ratio CSS */
  format: 'landscape' | 'portrait' | 'square'
  /** Métadonnées du post parent pour l'overlay */
  postId: string
  postTitle: string
  author: { name: string; avatar: string }
  /** Nombre total de photos du post — affiche le badge si > 1 */
  imagesCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit le format MockPost en format galerie — respecte le display_format du post */
function toGalleryFormat(postFormat: string): 'landscape' | 'portrait' | 'square' {
  if (postFormat === 'portrait') return 'portrait'
  if (postFormat === '1:1') return 'square'
  return 'landscape'
}

/**
 * Construit la liste d'items galerie : 1 item par post (cover = première image).
 * Filtre les posts sans image (impossible à afficher en galerie).
 */
function buildGalleryItems(posts: MockPost[]): GalleryItem[] {
  const items: GalleryItem[] = []

  for (const post of posts) {
    const cover = post.images[0]
    if (!cover) continue
    items.push({
      id: post.id,
      imageUrl: cover.url,
      alt: cover.alt,
      format: toGalleryFormat(post.format),
      postId: post.id,
      postTitle: post.title,
      author: post.author,
      imagesCount: post.images.length,
    })
  }

  return items
}

/** Classes CSS d'aspect-ratio par format — aligné avec l'ImageSlider du feed */
const ASPECT_CLASSES: Record<string, string> = {
  landscape: 'aspect-video', // 16:9
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface FeedGalleryProps {
  posts: MockPost[]
}

export function FeedGallery({ posts }: FeedGalleryProps) {
  const items = buildGalleryItems(posts)
  const [lightbox, setLightbox] = useState<LightboxData | null>(null)

  /** Ouvre la lightbox avec toutes les photos du post parent, départ sur la cover */
  function openLightbox(item: GalleryItem) {
    const post = posts.find((p) => p.id === item.postId)
    if (!post) return

    setLightbox({
      images: post.images.map((img) => ({ url: img.url, alt: img.alt })),
      currentIndex: 0,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
      // Format propagé : la lightbox respecte le ratio choisi à la création
      // (second-agent/18). post.format est toujours '16:9' | 'portrait' | '1:1'.
      format: post.format,
      // Identité du post pour activer le bouton Partager (second-agent/20)
      postId: post.id,
      postTitle: post.title,
    })
  }

  return (
    <>
      <div className="gallery-masonry" role="grid" aria-label="Galerie des observations">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openLightbox(item)}
            className="gallery-item group block relative overflow-hidden rounded w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            role="gridcell"
            aria-label={
              item.imagesCount > 1
                ? `${item.postTitle} — ${item.author.name} — ${item.imagesCount} photos`
                : `${item.postTitle} — ${item.author.name}`
            }
          >
            {/* Cover du post — aspect-ratio dérivé du display_format */}
            <img
              src={item.imageUrl || undefined}
              alt={item.alt}
              loading="lazy"
              className={['w-full object-cover', ASPECT_CLASSES[item.format]].join(' ')}
            />

            {/* Badge multi-photos — visible si le post a plusieurs images */}
            {item.imagesCount > 1 && (
              <span
                className="absolute top-2 right-2 flex items-center gap-1 bg-black/55 text-white text-xs font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm"
                aria-hidden="true"
              >
                <Images className="size-3" aria-hidden="true" />
                {item.imagesCount}
              </span>
            )}

            {/* Overlay hover/focus — auteur + titre */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {/* Titre sur 2 lignes max — donne plus de contexte sur les
                    titres longs (second-agent/03 — révision 2026-04-30). */}
                <p className="text-white text-sm font-bold leading-snug line-clamp-2">
                  {item.postTitle}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <img
                    src={item.author.avatar || hermineIcon}
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                  <span className="text-white/90 text-xs">{item.author.name}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox plein écran */}
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
