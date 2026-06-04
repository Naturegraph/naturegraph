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
import { LayoutList, LayoutGrid, Loader2 } from 'lucide-react'
import { FeedPost } from '@/components/home/FeedPost'
import type { MockPost } from '@/components/home/FeedPost'
import { FeedGallery } from '@/components/home/FeedGallery'
import { ProfileEmptyState } from '../ProfileEmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useToggleReaction, postQueryKey } from '@/hooks/usePost'
// V1.1.4 NG-026 (Nicolas 2026-06-03) : scroll infini profil.
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import type { ReactionType } from '@/types/database'

// View toggle types
type ViewMode = 'list' | 'grid'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'recent' | 'popular'

interface ProfileFeedProps {
  /** Posts de l'utilisateur à afficher */
  userPosts: MockPost[]
  /** ID du profil affiche - utilise pour calculer la cache key exacte
   *  des mutations reactions (sinon optimistic update silent fail). */
  profileId?: string
  /** Si true → l'utilisateur regarde son propre journal et peut supprimer
   *  ses posts via le menu 3-pts. Sinon : pas d'option Supprimer. */
  isOwnProfile: boolean
  /** NG-002 : callback edition d observation, ouvre le panel directement
   *  dans le profil (rendu par Profile.tsx). */
  onEditPost?: (postId: string, postType: 'nature_encounter' | 'nature_instant') => void
  /** V1.1.4 NG-026 : pagination scroll infini.
   *  Si fourni, le composant rend un sentinel IntersectionObserver. */
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Journal nature : liste des observations avec tri Récent / Populaire.
 */
export function ProfileFeed({
  userPosts,
  profileId,
  isOwnProfile,
  onEditPost,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
}: ProfileFeedProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [sort, setSort] = useState<SortMode>('recent')

  // V1.1.4 NG-026 (Nicolas 2026-06-03) : sentinel scroll infini. Le
  // composant parent (Profile.tsx) gere la pagination via useInfiniteUserPosts.
  // Si pas de fetchNextPage fourni, le hook est neutralise (hasNextPage=false).
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: hasNextPage && !!fetchNextPage,
    isFetchingNextPage,
    fetchNextPage: fetchNextPage ?? (() => undefined),
  })
  // Vue : liste (FeedPost en cards) ou grille (FeedGallery comme la home).
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Cache key EXACT du useUserPosts (cf. usePost.ts) :
  // ['posts', 'by-user', userId, sort, viewerId]. On reconstruit la meme
  // shape pour que setQueryData (optimistic) matche reellement le cache,
  // sinon le badge ne change qu apres le refetch -> UX 'rien ne se passe'
  // (retour QA Nicolas 2026-05-31).
  const profilePostsQueryKey = [
    ...postQueryKey.byUser(profileId ?? '', sort),
    user?.id ?? 'anon',
  ] as const

  const reactionMutation = useToggleReaction(user?.id)
  function handleReact(postId: string, type: ReactionType) {
    const post = userPosts.find((p) => p.id === postId)
    reactionMutation.mutate({
      postId,
      type,
      currentReaction: (post?.userReaction ?? null) as ReactionType | null,
      feedQueryKey: profilePostsQueryKey,
    })
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
                  onEditPost={isOwnProfile ? onEditPost : undefined}
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
      {/* V1.1.4 NG-026 : sentinel scroll infini. Visible uniquement quand
          il y a encore des pages a charger. Loader pendant le fetch. */}
      {hasNextPage && fetchNextPage && (
        <div
          ref={sentinelRef}
          className="flex justify-center items-center py-6 text-muted-foreground"
          aria-hidden={!isFetchingNextPage}
        >
          {isFetchingNextPage && (
            <span className="inline-flex items-center gap-2 text-sm">
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
                strokeWidth={2.5}
              />
              {t('common.loading', { defaultValue: 'Chargement...' })}
            </span>
          )}
        </div>
      )}

      {/* V1.1.4 round 12 (Nicolas 2026-06-03) : message de fin de liste,
          quand on a tout charge et qu'il y a assez de posts pour que ce
          soit pertinent (fetchNextPage fourni = pagination active). */}
      {fetchNextPage && !hasNextPage && sortedPosts.length >= 5 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          {t('profile.journal.endOfList', {
            defaultValue: 'Fin du journal, toutes les observations sont affichées.',
          })}
        </p>
      )}
    </div>
  )
}
