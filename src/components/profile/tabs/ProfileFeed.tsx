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
import { LayoutList, LayoutGrid, Filter } from 'lucide-react'
import { FeedPost } from '@/components/home/FeedPost'
import type { MockPost } from '@/components/home/FeedPost'
import { FeedGallery } from '@/components/home/FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from '@/components/home/FeedFilterPanel'
import type { FeedFilters } from '@/components/home/FeedFilterPanel'
import { ProfileEmptyState } from '../ProfileEmptyState'

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
  const [sort, setSort] = useState<SortMode>('recent')
  // Vue : liste (FeedPost en cards) ou grille (FeedGallery comme la home).
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  // Panneau de filtres — réutilise FeedFilterPanel du feed home.
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })

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

        {/* View toggle (list / grid) + séparateur + Filter — Figma 6385:74541.
            DESKTOP UNIQUEMENT : sur mobile la HomeNavbar (top) propose déjà
            les contrôles vue+filtres → pas de duplication (Nicolas 2026-05-01). */}
        <div className="hidden md:inline-flex items-center rounded-full border border-border bg-cream-lighter p-1 gap-1">
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
          <span aria-hidden="true" className="h-5 w-px bg-border mx-1" />
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            aria-label={t('profile.journal.filter', { defaultValue: 'Filtrer' })}
            aria-expanded={showFilters}
            className="size-8 rounded-full flex items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Filter className="size-4" aria-hidden="true" />
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
          <div className="-mx-4 md:mx-0 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">
            {sortedPosts.map((post) => (
              // `isOwnPost` : sur son propre profil, tous les posts du tab
              // Journal sont siens → menu 3-pts expose Modifier / Supprimer.
              // TODO [BACKEND] postService.deletePost(postId) — soft delete via
              // posts.deleted_at + RLS (auth.uid() = author_id).
              <FeedPost key={post.id} {...post} isOwnPost={isOwnProfile} />
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

      {/* Panneau de filtres — réutilise FeedFilterPanel du feed home pour
          cohérence visuelle (mêmes filtres : catégorie, période, etc.). */}
      {showFilters && (
        <FeedFilterPanel
          filters={filters}
          onApply={(next) => {
            setFilters(next)
            setShowFilters(false)
          }}
          onClose={() => setShowFilters(false)}
          activeTab="recent"
          onTabChange={() => {
            /* tab-change non utilisé sur le profil (pas de tabs Pour vous/Récent ici) */
          }}
        />
      )}
    </div>
  )
}
