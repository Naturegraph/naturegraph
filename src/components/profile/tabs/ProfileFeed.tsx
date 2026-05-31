/**
 * ProfileFeed — Onglet "Journal nature" du profil
 *
 * Affiche les observations partagées par l'utilisateur sous forme de liste.
 * Sous-onglets : Récent | Populaire (filtre côté client sur les mocks).
 * État vide : illustration hermine + message.
 *
 * TODO [BACKEND] — Remplacer par postService.getPostsByUser(userId, { sort })
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { FeedPost } from '@/components/home/FeedPost'
import type { MockPost } from '@/components/home/FeedPost'
import { FeedGallery } from '@/components/home/FeedGallery'
import { ProfileEmptyState } from '../ProfileEmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useToggleReaction } from '@/hooks/usePost'
import type { ReactionType } from '@/types/database'

// View toggle types
type ViewMode = 'list' | 'grid'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'recent' | 'popular'

interface ProfileFeedProps {
  /** Posts de l'utilisateur à afficher */
  userPosts: MockPost[]
  /** Si true → l'utilisateur regarde son propre journal et peut supprimer
   *  ses posts via le menu 3-pts. Sinon : pas d'option Supprimer. */
  isOwnProfile: boolean
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Journal nature : liste des observations avec tri Récent / Populaire.
 */
export function ProfileFeed({ userPosts, isOwnProfile }: ProfileFeedProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sort, setSort] = useState<SortMode>('recent')
  // Vue : liste (FeedPost en cards) ou grille (FeedGallery comme la home).
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // NG-001 (2026-05-31) : reactions dans le profil. La mutation invalide
  // ['feed'] + ['posts','by-user'] (cf. usePost.ts onSettled) donc les
  // changements faits ici remontent automatiquement dans le feed Home,
  // garantissant une source de verite unique entre les deux vues.
  const reactionMutation = useToggleReaction(user?.id)
  const profilePostsQueryKey = ['posts', 'by-user'] as const
  function handleReact(postId: string, type: ReactionType) {
    const post = userPosts.find((p) => p.id === postId)
    reactionMutation.mutate({
      postId,
      type,
      currentReaction: (post?.userReaction ?? null) as ReactionType | null,
      feedQueryKey: profilePostsQueryKey,
    })
  }

  /**
   * NG-002 (2026-05-31) : edition possible depuis le profil.
   * Le panel d edition vit dans Home.tsx (state editingPostId + activePanelType).
   * On navigue vers / en passant l intention via location.state, Home.tsx la
   * detecte au mount et ouvre le panel pre-rempli automatiquement. Pas de
   * duplication de logique entre Home et Profil.
   */
  function handleEditPost(postId: string, postType: 'nature_encounter' | 'nature_instant') {
    navigate('/', { state: { editPostId: postId, editPostType: postType } })
  }

  /** Tri côté client sur les données mock */
  const sortedPosts =
    sort === 'popular'
      ? [...userPosts].sort(
          (a, b) =>
            b.reactions.love +
            b.reactions.admire +
            b.reactions.fire -
            (a.reactions.love + a.reactions.admire + a.reactions.fire),
        )
      : userPosts

  return (
    // Pas de padding latéral ici : le parent (Profile.tsx → md:px-12) gère
    // l'alignement avec les cards et la photo de profil. Sinon double padding.
    <div className="flex flex-col gap-4 pb-4 pt-4">
      {/* ── Header row : Récent/Populaire à gauche, View/Filter à droite ──
          Figma 6385:74534 (Header) avec 2 sous-blocs séparés. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Récent / Populaire — segmented control Figma 6385:74536 */}
        <div
          className="inline-flex items-center rounded-full border border-border bg-cream-lighter p-1 gap-1"
          role="group"
          aria-label="Tri des observations"
        >
          {(['recent', 'popular'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              aria-pressed={sort === mode}
              className={`px-4 py-1 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                sort === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:text-primary'
              }`}
            >
              {mode === 'recent' ? t('profile.journal.recent') : t('profile.journal.popular')}
            </button>
          ))}
        </div>

        {/* View toggle (list / grid) — visible mobile + desktop.
            Nicolas 2026-05-22 : ancienne version `hidden md:inline-flex` partait
            du principe que la HomeNavbar exposait ces contrôles aussi sur le
            profil, mais elle ne le fait que sur la home. Résultat : un user
            mobile ne pouvait pas basculer en galerie sur un profil.
            Le filtre a été retiré : peu utile sur un profil déjà filtré par
            user, et il restait non fonctionnel. À réintroduire si demande
            forte (catégorie / période). */}
        <div className="inline-flex items-center rounded-full border border-border bg-cream-lighter p-1 gap-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label={t('profile.journal.viewList', { defaultValue: 'Vue liste' })}
            className={`size-8 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:text-primary'
            }`}
          >
            <LayoutList className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label={t('profile.journal.viewGrid', { defaultValue: 'Vue grille' })}
            className={`size-8 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:text-primary'
            }`}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Posts ─────────────────────────────────────────────────────────
          Mode list  : FeedPost en grille 1 col mobile (edge-to-edge) / 2 cols desktop
          Mode grid  : FeedGallery (mosaïque comme la home view grid)
          `-mx-4 md:mx-0` annule le padding latéral du parent sur mobile pour
          que les posts touchent les bords de l'écran (cohérence feed home). */}
      {sortedPosts.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="-mx-4 md:mx-0">
            <FeedGallery posts={sortedPosts} />
          </div>
        ) : (
          <div className="-mx-4 md:mx-0 columns-1 md:columns-2 gap-0 md:gap-6 [column-fill:_balance]">
            {/* CSS Multi-Column Layout (Masonry pure) :
                - columns-1 / md:columns-2 : 1 colonne mobile, 2 colonnes desktop
                - column-fill: balance : remplit toutes les colonnes uniformement
                - chaque card en break-inside:avoid pour eviter les coupures
                Decision Nicolas 2026-05-04 : layout Pinterest-style, vide
                blanc elimine, decalage horizontal accepte. */}
            {sortedPosts.map((post, idx) => (
              <div key={post.id} className="break-inside-avoid mb-0 md:mb-6">
                <FeedPost
                  {...post}
                  isOwnPost={isOwnProfile}
                  onReact={handleReact}
                  onEditPost={isOwnProfile ? handleEditPost : undefined}
                  hideEndBorder={idx === sortedPosts.length - 1}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        /* État vide — Figma 6385:77220 (desktop) / 6385:74690 (mobile).
           Réutilise <ProfileEmptyState /> pour cohérence DS. */
        <ProfileEmptyState
          title={t('profile.journal.noObsTitle', {
            defaultValue: 'Aucune rencontre partagée sur ce profil',
          })}
          subtitle={t('profile.journal.noObsSubtitle', {
            defaultValue: 'Reviens plus tard pour découvrir ses prochaines découvertes',
          })}
        />
      )}
    </div>
  )
}
