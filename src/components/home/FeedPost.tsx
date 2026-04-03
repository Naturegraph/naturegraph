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
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Leaf } from 'lucide-react'
import type { MockPost } from '@/data/mock/mockPosts'
import { PostOptionsMenu } from './PostOptionsMenu'
import { CommentsSection } from './CommentsSection'
import { ImageSlider } from './ImageSlider'

// ─── Composant principal ──────────────────────────────────────────────────────

// Configuration des réactions — doit rester alignée avec ReactionType dans database.ts
// 'disappointed' ajouté suite à la décision Nicolas (2026-04-01)
const REACTION_CONFIG = [
  { key: 'love' as const, emoji: '❤️', labelKey: 'home.post.reactions.love' },
  { key: 'admire' as const, emoji: '😍', labelKey: 'home.post.reactions.admire' },
  { key: 'fire' as const, emoji: '🔥', labelKey: 'home.post.reactions.fire' },
  { key: 'wow' as const, emoji: '😱', labelKey: 'home.post.reactions.wow' },
  { key: 'curious' as const, emoji: '🧐', labelKey: 'home.post.reactions.curious' },
  { key: 'disappointed' as const, emoji: '😕', labelKey: 'home.post.reactions.disappointed' },
]

interface FeedPostProps extends MockPost {
  /**
   * true (défaut) = utilisateur connecté — boutons d'interaction actifs.
   * false = mode invité — clic sur réactions/commentaires redirige vers /signup.
   * TODO [BACKEND] — Alimenté par `isAuthenticated` depuis useAuth()
   */
  canInteract?: boolean
  /**
   * true = post appartenant à l'utilisateur connecté.
   * Affiche "Modifier / Supprimer" au lieu de "Signaler / Masquer".
   * TODO [BACKEND] — Comparer post.author_id avec currentUser.id
   */
  isOwnPost?: boolean
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
  format,
  images,
  reactions,
  comments,
  canInteract = true,
  isOwnPost = false,
}: FeedPostProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const shouldTruncate = content.length > 200

  // Redirige vers /signup si l'invité tente d'interagir
  function requireAuth(e: React.MouseEvent) {
    if (!canInteract) {
      e.preventDefault()
      navigate('/signup')
    }
  }

  return (
    <article className="bg-background relative md:rounded-card rounded-none">
      {/* Bordure */}
      <div
        aria-hidden="true"
        className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
      />

      <div className="flex flex-col gap-5 md:p-6 px-5 py-8">
        {/* Header : auteur */}
        <div className="flex items-start justify-between">
          <div className="flex gap-5 items-center">
            {/* Avatar */}
            <div className="relative md:size-12 size-10 shrink-0">
              <div className="size-full rounded-full overflow-hidden">
                <img src={author.avatar} alt={author.name} className="size-full object-cover" />
                <div
                  aria-hidden="true"
                  className="absolute border-border border-[0.5px] inset-[-0.5px] rounded-full pointer-events-none"
                />
              </div>
              {author.badge && (
                <div
                  aria-hidden="true"
                  className="absolute bg-cream-lighter bottom-[-4px] right-[-4px] flex items-center justify-center rounded-full size-5"
                >
                  <span className="text-sm leading-none">{author.badge}</span>
                </div>
              )}
            </div>

            {/* Infos auteur */}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="md:text-xl text-lg leading-tight text-foreground font-bold truncate">
                {author.name}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Leaf className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-xs text-muted-foreground tracking-[0.48px]">{date}</span>
                <span aria-hidden="true" className="text-muted-foreground text-xs">
                  •
                </span>
                <span className="text-xs text-muted-foreground tracking-[0.48px]">{location}</span>
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
          <h3 className="leading-tight text-foreground">{title}</h3>

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

        {/* Badges catégorie + espèce */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-primary-light text-foreground text-base px-3 py-1 rounded-full leading-tight">
            {category.icon} {category.label}
          </span>
          <span className="bg-primary-light text-foreground text-base px-3 py-1 rounded-full leading-tight">
            {species}
          </span>
        </div>

        {/* Images — clic ouvre la lightbox plein écran */}
        <ImageSlider images={images} format={format} author={author} />

        {/* Compteurs de réactions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {REACTION_CONFIG.filter(({ key }) => reactions[key] > 0).map(
              ({ key, emoji, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  onClick={requireAuth}
                  aria-label={`${t(labelKey)} : ${reactions[key]}${!canInteract ? ` — ${t('home.post.reactLoginPrompt')}` : ''}`}
                  className="bg-cream flex gap-1 items-center h-6 px-2 rounded-full text-sm text-foreground tracking-[0.48px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span>{reactions[key]}</span>
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              if (canInteract) setShowComments(true)
              else requireAuth(e)
            }}
            aria-label={t('home.post.commentCount', { count: comments })}
            className="bg-cream flex gap-1 items-center h-6 px-2 rounded-full text-sm text-foreground tracking-[0.48px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
            <span>{comments}</span>
          </button>
        </div>

        {/* Séparateur */}
        <hr className="border-border border-[0.5px]" />

        {/* Actions */}
        <div className="flex items-center justify-between h-8">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={requireAuth}
              className="flex gap-2 items-center h-8 px-2 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label={t('home.post.react')}
            >
              <Heart className="size-4 text-foreground" aria-hidden="true" />
              <span className="hidden md:inline text-foreground text-base">
                {t('home.post.react')}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                if (canInteract) setShowComments(true)
                else requireAuth(e)
              }}
              className="flex gap-2 items-center h-8 px-2 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label={t('home.post.comments')}
            >
              <MessageCircle className="size-4 text-foreground" aria-hidden="true" />
              <span className="hidden md:inline text-foreground text-base">
                {t('home.post.comments')}
              </span>
            </button>
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

      {/* Modale de commentaires */}
      <CommentsSection
        postId={id}
        commentsCount={comments}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </article>
  )
}
