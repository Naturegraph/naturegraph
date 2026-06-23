/**
 * FeedGallery : Vue galerie masonry du feed
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
 * (préféré à une solution JS : RGESN, sobriété numérique).
 */

import { Link } from 'react-router-dom'
import { Images } from 'lucide-react'
import type { MockPost } from './FeedPost'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { buildPostPath } from '@/lib/postSlug'

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
  /** Nombre total de photos du post : affiche le badge si > 1 */
  imagesCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit le format MockPost en format galerie : respecte le display_format du post */
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

/** Classes CSS d'aspect-ratio par format : aligné avec l'ImageSlider du feed */
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

  return (
    <>
      <div className="gallery-masonry" role="grid" aria-label="Galerie des observations">
        {items.map((item) => (
          // Nicolas 2026-06-06 : un clic galerie ouvre la PAGE DÉTAIL du post
          // (plus logique/conforme qu'un agrandissement d'image). On utilise un
          // <Link> (navigation réelle) pour que le bouton retour du navigateur
          // ramène l'utilisateur exactement à sa place dans la galerie (la vue
          // galerie + la position de scroll sont restaurées côté Home).
          <Link
            key={item.id}
            to={buildPostPath(item.postId, { title: item.postTitle })}
            className="gallery-item group block relative overflow-hidden w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            role="gridcell"
            aria-label={
              item.imagesCount > 1
                ? `${item.postTitle} : ${item.author.name} : ${item.imagesCount} photos`
                : `${item.postTitle} : ${item.author.name}`
            }
          >
            {/* Cover du post : aspect-ratio dérivé du display_format */}
            <img
              src={item.imageUrl || undefined}
              alt={item.alt}
              loading="lazy"
              className={['w-full object-cover', ASPECT_CLASSES[item.format]].join(' ')}
            />

            {/* Badge multi-photos : visible si le post a plusieurs images.
                V1.1.4 QA round 6 (Nicolas 2026-06-01) : font-size INLINE
                pour bypass tout purge/cache Tailwind. Avant les arbitrary
                values text-[9px] etaient peut-etre purgees -> aucun
                changement visible apres mes commits. Inline style = source
                de verite, prioritaire sur tout. */}
            {item.imagesCount > 1 && (
              <span
                className="absolute top-2 right-2 inline-flex items-center bg-black/55 text-white rounded backdrop-blur-sm"
                style={{ gap: '3px', padding: '3px 6px' }}
                aria-hidden="true"
              >
                <Images aria-hidden="true" style={{ width: '12px', height: '12px' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1 }}>
                  {item.imagesCount}
                </span>
              </span>
            )}

            {/* Overlay hover/focus : auteur + titre */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {/* Titre sur 2 lignes max : donne plus de contexte sur les
                    titres longs (second-agent/03 : révision 2026-04-30). */}
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
          </Link>
        ))}
      </div>
    </>
  )
}
