/**
 * RelatedPostCard — Carte compacte d'observation recommandee
 * ============================================================
 *
 * Utilisee dans la section "Observations susceptibles de t'interesser" de la
 * page detail (PostDetail). Difference avec FeedPost :
 *   - Version allegee : header auteur + titre + description (2 lignes) + chips
 *     espece + UNE photo de couverture. Pas de slider, pas de barre de
 *     reactions, pas de menu contextuel.
 *   - La carte ENTIERE est un lien vers la page detail du post (exploration
 *     continue). Aucun element interactif imbrique (pas de <a>/<button> dans
 *     un <a>) : l'avatar/nom et les chips sont donc passifs.
 *   - Format fixe (photo en ratio constant + description clampee) pour que
 *     toutes les cartes aient la meme hauteur, peu importe le contenu.
 *
 * Regle produit (Nicolas 2026-06-04) : on n'affiche jamais ici un post sans
 * photo. Le filtrage est garanti en amont (getRelatedPosts) ; ce composant
 * suppose donc `images[0]` present mais reste defensif.
 *
 * Accessibilite :
 *   - Le lien porte un aria-label explicite (titre + auteur).
 *   - Image avec alt descriptif, dimensions implicites via aspect-ratio.
 */

import { Link } from 'react-router-dom'
import { Bird, MountainSnow } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ImagePresets } from '@/lib/supabaseImage'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'
import { buildPostPath } from '@/lib/postSlug'
import type { MockPost } from './FeedPost'

// Chip passif (display only) — meme apparence que les chips FeedPost mais
// sans interaction (la carte entiere est deja un lien).
const CHIP_CLASS =
  'bg-primary-light text-foreground text-sm font-bold px-3 py-1.5 rounded-full leading-tight inline-flex items-center'

// Icone + couleur par type de post (aligne sur FeedPost / second-agent/04).
const TYPE_ICON = {
  nature_encounter: { Icon: Bird, colorClass: 'text-[var(--color-highlight-primary)]' },
  nature_instant: { Icon: MountainSnow, colorClass: 'text-[var(--color-amber-primary)]' },
} as const

export function RelatedPostCard(post: MockPost) {
  const {
    id,
    postType,
    author,
    date,
    location,
    title,
    content,
    species,
    scientific_name,
    taxonomic_group,
    individualsCount,
    images,
  } = post

  const cover = images?.[0]
  if (!cover) return null // garde-fou : jamais de carte sans photo

  const { Icon, colorClass } = TYPE_ICON[postType] ?? TYPE_ICON.nature_encounter

  // Espece (display only) : nom commun > scientifique. Suffixe ({N}) si plusieurs.
  const speciesName = species || scientific_name || null
  const categoryLabel = taxonomic_group ? TAXONOMIC_GROUP_CONFIG[taxonomic_group]?.label : null
  const countSuffix = individualsCount && individualsCount > 1 ? ` (${individualsCount})` : ''

  // Pas de chips espece pour un instant nature (ne decrit pas une observation).
  const showSpeciesRow = postType !== 'nature_instant' && (categoryLabel || speciesName)

  return (
    <Link
      to={buildPostPath(id, { title, species })}
      aria-label={`Voir l'observation${title ? ` "${title}"` : ''} de ${author.name}`}
      className="group flex flex-col rounded-card bg-background border-[0.5px] border-border overflow-hidden hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3 p-4">
        {/* Header auteur — passif (avatar + nom + type/date/lieu) */}
        <div className="flex items-center gap-3">
          <span className="relative size-10 shrink-0 rounded-full overflow-hidden">
            <img
              src={author.avatar ? ImagePresets.avatarSmall(author.avatar) : hermineIcon}
              alt={author.name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute border-border border-[0.5px] inset-[-0.5px] rounded-full pointer-events-none"
            />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-base leading-[1.2] text-foreground font-bold truncate">
              {author.name}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
              <Icon className={`size-4 shrink-0 ${colorClass}`} aria-hidden="true" />
              <span className="shrink-0">{date}</span>
              {location && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="truncate">{location}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Titre + description (2 lignes max, pas de "voir plus") */}
        {(title?.trim() || content?.trim()) && (
          <div className="flex flex-col gap-1">
            {title?.trim() && (
              <h3 className="text-base font-bold leading-[1.3] text-foreground line-clamp-1 group-hover:underline">
                {title}
              </h3>
            )}
            {content?.trim() && (
              <p className="text-sm leading-snug text-muted-foreground line-clamp-2">{content}</p>
            )}
          </div>
        )}

        {/* Chips espece (display only) */}
        {showSpeciesRow && (
          <div className="flex flex-wrap gap-2">
            {categoryLabel && <span className={CHIP_CLASS}>{categoryLabel}</span>}
            {speciesName && (
              <span className={CHIP_CLASS}>
                {speciesName}
                {countSuffix}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Photo de couverture — ratio fixe pour une hauteur de carte constante */}
      <div className="px-4 pb-4">
        <div className="aspect-[3/2] w-full overflow-hidden rounded-md bg-muted">
          <img
            src={ImagePresets.feedPhoto(cover.url)}
            alt={cover.alt || title || species || author.name}
            loading="lazy"
            decoding="async"
            width={cover.width}
            height={cover.height}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        </div>
      </div>
    </Link>
  )
}
