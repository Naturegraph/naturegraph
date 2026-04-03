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
import { FeedPost } from '@/components/home/FeedPost'
import type { MockPost } from '@/data/mockPosts'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'recent' | 'popular'

interface ProfileFeedProps {
  /** Posts de l'utilisateur à afficher */
  userPosts: MockPost[]
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Journal nature : liste des observations avec tri Récent / Populaire.
 */
export function ProfileFeed({ userPosts }: ProfileFeedProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortMode>('recent')

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
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* ── Sous-onglets Récent / Populaire ── */}
      <div className="flex items-center gap-2" role="group" aria-label="Tri des observations">
        {(['recent', 'popular'] as SortMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSort(mode)}
            aria-pressed={sort === mode}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              sort === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-cream border border-border text-foreground hover:bg-cream-lighter'
            }`}
          >
            {mode === 'recent' ? t('profile.journal.recent') : t('profile.journal.popular')}
          </button>
        ))}
      </div>

      {/* ── Liste des posts ── */}
      {sortedPosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {sortedPosts.map((post) => (
            <FeedPost key={post.id} {...post} />
          ))}
        </div>
      ) : (
        /* État vide */
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <img
            src={hermineEmptyState}
            alt=""
            className="w-28 h-28 opacity-60"
            loading="lazy"
            width={112}
            height={112}
          />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {t('profile.journal.noObs')}
          </p>
        </div>
      )}
    </div>
  )
}
