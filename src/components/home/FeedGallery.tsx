/**
 * FeedGallery — Vue galerie masonry du feed
 *
 * Affiche les photos des posts dans une grille masonry :
 *   - 3 colonnes sur desktop, 2 colonnes sur mobile
 *   - Formats variés : paysage (4:3), portrait (3:4), carré (1:1)
 *   - Overlay auteur + titre sur la première image de chaque post
 *   - Clic → ouvre la PhotoLightbox plein écran
 *   - Lazy loading images pour l'éco-conception
 *
 * Utilise la propriété CSS `columns` pour le layout masonry
 * (préféré à une solution JS — RGESN, sobriété numérique).
 *
 * TODO [BACKEND] — Remplacer mockPosts par un endpoint dédié galerie :
 *   postService.getGalleryFeed({ page, limit: 20 }) → images + post metadata
 */

import { useState } from 'react'
import type { MockPost } from '@/data/mockPosts'
import { PhotoLightbox } from './PhotoLightbox'
import type { LightboxData } from './PhotoLightbox'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryItem {
  /** ID unique pour la clé React */
  id: string
  imageUrl: string
  alt: string
  /** Format visuel déterminant l'aspect-ratio CSS */
  format: 'landscape' | 'portrait' | 'square'
  /** Métadonnées du post parent pour l'overlay */
  postId: string
  postTitle: string
  author: { name: string; avatar: string }
  /** Afficher l'overlay auteur en permanence (première image du post) */
  showOverlay: boolean
  /** Index de l'image dans le post parent (pour la lightbox) */
  imageIndexInPost: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit le format MockPost en format galerie */
function toGalleryFormat(
  postFormat: string,
  imageIndex: number,
): 'landscape' | 'portrait' | 'square' {
  // Première image : respecte le format du post
  if (imageIndex === 0) {
    if (postFormat === 'portrait') return 'portrait'
    if (postFormat === '1:1') return 'square'
    return 'landscape'
  }
  // Images suivantes : alterne pour créer de la variété visuelle
  const cycle: Array<'square' | 'landscape' | 'portrait'> = ['square', 'landscape', 'portrait']
  return cycle[imageIndex % cycle.length]
}

/** Construit la liste d'items galerie à partir des posts */
function buildGalleryItems(posts: MockPost[]): GalleryItem[] {
  const items: GalleryItem[] = []

  for (const post of posts) {
    for (let i = 0; i < post.images.length; i++) {
      const img = post.images[i]
      items.push({
        id: `${post.id}-img${i}`,
        imageUrl: img.url,
        alt: img.alt,
        format: toGalleryFormat(post.format, i),
        postId: post.id,
        postTitle: post.title,
        author: post.author,
        showOverlay: i === 0 && items.length % 3 === 2,
        imageIndexInPost: i,
      })
    }
  }

  return items
}

/** Classes CSS d'aspect-ratio par format */
const ASPECT_CLASSES: Record<string, string> = {
  landscape: 'aspect-[4/3]',
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

  /** Ouvre la lightbox avec toutes les images du post parent, en commençant à l'index cliqué */
  function openLightbox(item: GalleryItem) {
    const post = posts.find((p) => p.id === item.postId)
    if (!post) return

    setLightbox({
      images: post.images.map((img) => ({ url: img.url, alt: img.alt })),
      currentIndex: item.imageIndexInPost,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
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
            className="gallery-item group block relative overflow-hidden rounded-lg mb-2 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            role="gridcell"
            aria-label={`${item.alt} — ${item.author.name}`}
          >
            {/* Image avec aspect-ratio contrôlé */}
            <img
              src={item.imageUrl}
              alt={item.alt}
              loading="lazy"
              className={['w-full object-cover', ASPECT_CLASSES[item.format]].join(' ')}
            />

            {/* Overlay hover — visible sur toutes les images au survol */}
            <div
              className={[
                'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity',
                item.showOverlay
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              ].join(' ')}
              aria-hidden="true"
            >
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-bold leading-snug truncate">
                  {item.postTitle}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <img
                    src={item.author.avatar}
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
