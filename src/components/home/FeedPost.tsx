/**
 * FeedPost — Carte d'un partage dans le feed
 *
 * Reproduit le design Figma : header auteur, contenu, météo/moment,
 * badges catégorie/espèce, slider d'images, réactions, actions.
 *
 * Accessibilité :
 * - Boutons réactions avec aria-label
 * - Images avec alt descriptif
 * - "Voir plus / Voir moins" annonce le changement d'état
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Share2, MoreHorizontal, Bird } from 'lucide-react'
import { PostOptionsMenu } from './PostOptionsMenu'
import { ImageSlider } from './ImageSlider'
import hermineIcon from '@/assets/images/hermine-icon.png'
import type { ReactionType } from '@/types/database'
import { useSpecies } from '@/contexts/SpeciesContext'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/taxrefSpecies'

// ─── Type UI pour les posts du feed ──────────────────────────────────────────
// Bridge entre le type DB (PostFeedItem) et le composant FeedPost.
// TODO : refactoriser FeedPost pour accepter PostFeedItem directement.

export interface MockPost {
  id: string
  author: { name: string; avatar: string; badge?: string }
  date: string
  location: string
  title: string
  content: string
  weather?: string
  clouds?: string
  timeOfDay?: string
  category: { icon: string; label: string }
  /** Nom commun ou "Espèce non identifiée" — affiché dans le chip */
  species: string
  /** Nom scientifique TAXREF (optionnel — enrichit le SpeciesHit pour le filtre) */
  scientific_name?: string | null
  /** cd_nom TAXREF — identifiant unique espèce (optionnel) */
  taxref_id?: string | null
  /** Groupe taxonomique de l'espèce (optionnel — emoji dans le chip) */
  taxonomic_group?: string | null
  format: '16:9' | 'portrait' | '1:1'
  images: Array<{
    url: string
    alt: string
    /** Dimensions natives — déterminent l'aspect ratio dans le feed. */
    width?: number
    height?: number
  }>
  reactions: {
    love: number
    admire: number
    fire: number
    wow: number
    curious: number
    disappointed: number
  }
  /** Réaction de l'utilisateur connecté sur ce post (null si aucune) */
  userReaction: ReactionType | null
  /** Total des réactions (likes_count) */
  totalReactions: number
  /** Nombre de commentaires (préservé pour usage post-MVP — non affiché en MVP). */
  comments: number
}

// ─── Configuration ──────────────────────────────────────────────────────────

// Doit rester alignée avec ReactionType dans @/types/database.
// 'disappointed' ajouté suite à la décision Nicolas (2026-04-01).
const REACTION_CONFIG = [
  { key: 'love' as const, emoji: '❤️', labelKey: 'home.post.reactions.love' },
  { key: 'admire' as const, emoji: '😍', labelKey: 'home.post.reactions.admire' },
  { key: 'fire' as const, emoji: '🔥', labelKey: 'home.post.reactions.fire' },
  { key: 'wow' as const, emoji: '😱', labelKey: 'home.post.reactions.wow' },
  { key: 'curious' as const, emoji: '🧐', labelKey: 'home.post.reactions.curious' },
  { key: 'disappointed' as const, emoji: '😕', labelKey: 'home.post.reactions.disappointed' },
]

// Tailwind du chip Figma (node 6385:60456) — bg Content/Action/Light, h-32,
// px-12 py-8, rounded-99, Mulish Bold 16px. Réutilisé pour catégorie + espèce.
const CHIP_BASE_CLASS =
  'bg-primary-light text-foreground text-base font-bold px-3 py-2 h-8 rounded-full leading-tight inline-flex items-center gap-2'
const CHIP_INTERACTIVE_CLASS =
  'hover:bg-primary/15 transition-colors cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'

interface FeedPostProps extends MockPost {
  /** true = utilisateur connecté — boutons actifs. false = redirige /signup */
  canInteract?: boolean
  /** true = post de l'utilisateur connecté (Modifier / Supprimer) */
  isOwnPost?: boolean
  /** Callback pour réagir à un post (emoji picker → type) */
  onReact?: (postId: string, type: ReactionType) => void
}

export function FeedPost({
  id,
  author,
  date,
  location,
  title,
  content,
  weather,
  clouds,
  timeOfDay,
  category,
  species,
  scientific_name,
  taxref_id,
  taxonomic_group,
  format,
  images,
  reactions,
  userReaction,
  totalReactions,
  canInteract = true,
  isOwnPost = false,
  onReact,
}: FeedPostProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setActiveSpecies } = useSpecies()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const shouldTruncate = content.length > 200

  // Configuration de la réaction active de l'utilisateur (null si aucune).
  // Permet de remplacer dynamiquement l'emoji + le label "Réagir" par celui de
  // la réaction choisie (ex: "😍 Adoré"), conformément au feedback Nicolas.
  const activeReaction = userReaction ? REACTION_CONFIG.find((r) => r.key === userReaction) : null

  // Redirige vers /signup si l'invité tente d'interagir
  function requireAuth(e: React.MouseEvent) {
    if (!canInteract) {
      e.preventDefault()
      navigate('/signup')
    }
  }

  /** Gère le clic sur une réaction dans le picker ou dans les badges */
  function handleReact(type: ReactionType) {
    if (!canInteract) {
      navigate('/signup')
      return
    }
    onReact?.(id, type)
    setShowReactionPicker(false)
  }

  return (
    // Largeur Figma : colonne post = 656px + p-6 (24px ×2) = 704px max sur desktop.
    // Centré (mx-auto) pour s'aligner dans la zone feed quel que soit son parent.
    // Sur mobile : pleine largeur (rounded-none, le cap ne joue pas).
    <article className="bg-background relative md:rounded-card rounded-none md:max-w-[704px] md:mx-auto w-full">
      {/* Bordure */}
      <div
        aria-hidden="true"
        className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
      />

      <div className="flex flex-col gap-5 md:p-6 px-5 py-8">
        {/* Header : auteur */}
        <div className="flex items-start justify-between">
          <div className="flex gap-5 items-center">
            {/* Avatar — Figma 48px, badge 24px (Background/Neutral/Secondary). */}
            <div className="relative size-12 shrink-0">
              <div className="size-full rounded-full overflow-hidden">
                <img
                  src={author.avatar || hermineIcon}
                  alt={author.name}
                  className="size-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute border-border border-[0.5px] inset-[-0.5px] rounded-full pointer-events-none"
                />
              </div>
              {author.badge && (
                <div
                  aria-hidden="true"
                  className="absolute bg-cream-lighter bottom-[-4px] right-[-4px] flex items-center justify-center rounded-full size-6"
                >
                  <span className="text-base leading-[1.5]">{author.badge}</span>
                </div>
              )}
            </div>

            {/* Infos auteur — Figma : nom 18px Quicksand Bold, date 14px Mulish. */}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-lg leading-[1.2] text-foreground font-bold truncate">
                {author.name}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Bird className="size-[18px] text-foreground shrink-0" aria-hidden="true" />
                <span className="text-sm text-foreground">{date}</span>
                <span aria-hidden="true" className="text-foreground text-xs">
                  •
                </span>
                <span className="text-sm text-foreground">{location}</span>
              </div>
            </div>
          </div>

          {/* Menu contextuel */}
          <div className="relative">
            <button
              type="button"
              aria-label={t('home.post.optionsMenu')}
              aria-expanded={showOptions}
              aria-haspopup="menu"
              onClick={() => setShowOptions((v) => !v)}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <MoreHorizontal className="size-5 text-foreground" aria-hidden="true" />
            </button>

            {showOptions && (
              <PostOptionsMenu
                postId={id}
                authorUsername={author.name}
                isOwnPost={isOwnPost}
                onClose={() => setShowOptions(false)}
              />
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex flex-col gap-2">
          {/* Figma : Headings/Subheading = Quicksand Bold 18px leading-1.2. */}
          <h3 className="text-lg font-bold leading-[1.2] text-foreground">{title}</h3>

          <div className="text-sm text-foreground leading-relaxed">
            {!isExpanded && shouldTruncate ? (
              <>
                <span className="line-clamp-3">{content}</span>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="text-primary underline decoration-solid inline ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  {t('home.post.seeMore')}
                </button>
              </>
            ) : (
              <>
                <span>{content}</span>
                {shouldTruncate && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="text-primary underline decoration-solid inline ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    {t('home.post.seeLess')}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Météo / moment */}
          {(weather || clouds || timeOfDay) && (
            <div className="flex gap-2 items-center flex-wrap text-sm text-foreground">
              {weather && <span>{weather}</span>}
              {weather && clouds && <span aria-hidden="true">•</span>}
              {clouds && <span>{clouds}</span>}
              {(weather || clouds) && timeOfDay && <span aria-hidden="true">•</span>}
              {timeOfDay && <span>{timeOfDay}</span>}
            </div>
          )}
        </div>

        {/* Badges catégorie + espèce — chips Figma node 6385:60455. */}
        <div className="flex flex-wrap gap-2">
          <span className={CHIP_BASE_CLASS}>
            {category.icon} {category.label}
          </span>

          {/* Chip espèce — cliquable si identifiée (active Species Context Layer,
              PRD §3.4). Sinon passif ("Espèce non identifiée"). */}
          {taxref_id ? (
            <button
              type="button"
              onClick={() =>
                setActiveSpecies({
                  taxref_id,
                  scientific_name: scientific_name ?? species,
                  common_name: species !== scientific_name ? species : null,
                  group_label: taxonomic_group ?? null,
                })
              }
              aria-label={t('home.post.filterBySpecies', { species })}
              className={`${CHIP_BASE_CLASS} ${CHIP_INTERACTIVE_CLASS}`}
            >
              {taxonomic_group && TAXONOMIC_GROUP_CONFIG[taxonomic_group]
                ? `${TAXONOMIC_GROUP_CONFIG[taxonomic_group].emoji} `
                : ''}
              {species}
            </button>
          ) : (
            <span className={CHIP_BASE_CLASS}>{species}</span>
          )}
        </div>

        {/* Images — clic ouvre la lightbox plein écran */}
        <ImageSlider images={images} format={format} author={author} />

        {/* Compteurs réactions (Figma node 6385:60468 — flex justify-between).
            Le slot droit accueillera le compteur commentaires en post-MVP. */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {totalReactions > 0 ? (
              REACTION_CONFIG.filter(({ key }) => reactions[key] > 0).map(
                ({ key, emoji, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleReact(key)}
                    aria-label={`${t(labelKey)} : ${reactions[key]}${userReaction === key ? ` — ${t('home.post.yourReaction')}` : ''}`}
                    className={[
                      'flex gap-1 items-center h-6 px-2 rounded-full text-sm transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      userReaction === key
                        ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30 reaction-active'
                        : 'bg-cream text-foreground hover:bg-muted/50',
                    ].join(' ')}
                  >
                    <span aria-hidden="true" className={userReaction === key ? 'reaction-pop' : ''}>
                      {emoji}
                    </span>
                    <span>{reactions[key]}</span>
                  </button>
                ),
              )
            ) : (
              <span className="text-xs text-muted-foreground">{t('home.post.noReactions')}</span>
            )}
          </div>
        </div>

        {/* Séparateur */}
        <hr className="border-border border-[0.5px]" />

        {/* Actions — réagir, sauvegarder, partager. Slot "Commentaires"
            (Figma node 6385:60494) sera ajouté post-MVP entre Réagir et le
            groupe droit. */}
        <div className="flex items-center justify-between h-8">
          <div className="relative flex gap-1">
            {/* Bouton React — affiche le picker d'emojis au clic */}
            <button
              type="button"
              onClick={(e) => {
                if (!canInteract) {
                  requireAuth(e)
                  return
                }
                setShowReactionPicker((o) => !o)
              }}
              aria-expanded={showReactionPicker}
              aria-label={
                activeReaction
                  ? `${t(activeReaction.labelKey)} — ${t('home.post.yourReaction')}`
                  : t('home.post.react')
              }
              className={[
                'flex gap-2 items-center h-8 px-2 rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                activeReaction ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              {/* Emoji + label : reflètent la réaction active si elle existe,
                  sinon affichent le call-to-action par défaut "❤️ Réagir". */}
              <span className="text-base" aria-hidden="true">
                {activeReaction ? activeReaction.emoji : '❤️'}
              </span>
              <span className="hidden md:inline text-base font-bold">
                {activeReaction ? t(activeReaction.labelKey) : t('home.post.react')}
              </span>
            </button>

            {/* Picker d'emojis — popup au-dessus du bouton */}
            {showReactionPicker && (
              <>
                {/* Backdrop invisible pour fermer le picker */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowReactionPicker(false)}
                  aria-hidden="true"
                />
                <div
                  role="group"
                  aria-label={t('home.post.chooseReaction')}
                  className="absolute bottom-full left-0 mb-2 z-50 flex gap-1 bg-background border border-border rounded-full px-2 py-1.5 shadow-lg reaction-picker-enter"
                >
                  {REACTION_CONFIG.map(({ key, emoji, labelKey }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleReact(key)}
                      aria-label={t(labelKey)}
                      aria-pressed={userReaction === key}
                      className={[
                        'size-9 flex items-center justify-center rounded-full text-xl transition-transform duration-150',
                        'hover:scale-125 hover:bg-muted/50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        userReaction === key ? 'bg-primary/15 scale-110' : '',
                      ].join(' ')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={requireAuth}
              aria-label={t('home.post.save')}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <Bookmark className="size-4 text-foreground" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={requireAuth}
              aria-label={t('home.post.share')}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <Share2 className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
