/**
 * FeedSection — Section centrale du feed
 *
 * Tabs (Récent / Pour toi / Populaire / Tendances) + vue liste/grille + filtre.
 *
 * Source de données :
 *  - Supabase configuré  → useFeed() (React Query → postService.getFeed())
 *  - Mode démo           → mockPosts avec filtrage côté client (inchangé)
 *
 * L'adaptateur postFeedItemToMockPost() fait le bridge entre PostFeedItem
 * (type DB) et MockPost (type UI). À supprimer quand FeedPost sera
 * refactorisé pour accepter PostFeedItem directement.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, Lock } from 'lucide-react'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
import type { FeedFilters } from './FeedFilterPanel'
import { mockPosts, type MockPost } from '@/data/mock/mockPosts'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useFeed, FEED_QUERY_KEY } from '@/hooks/useFeed'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { PostFeedItem } from '@/types/database'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

const GUEST_MAX_POSTS = 20

export type FeedTab = 'recent' | 'for-you' | 'popular' | 'trending'

// Mapping groupe taxonomique → emoji catégorie
const TAXONOMIC_EMOJI: Record<string, string> = {
  birds: '🐦',
  mammals: '🦌',
  insects: '🦋',
  amphibians: '🐸',
  reptiles: '🦎',
  arachnids: '🕷️',
  mollusks: '🐌',
  fish: '🐟',
  plants: '🌿',
  other: '🌍',
}

// ─── Adaptateur PostFeedItem → MockPost ──────────────────────────────────────
//
// Bridge temporaire pour éviter de refactoriser FeedPost.
// À supprimer lors du refacto FeedPost vers PostFeedItem.

/** Formate une date ISO en format lisible (ex: "10/04/2026") */
function formatPostDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

function postFeedItemToMockPost(item: PostFeedItem): MockPost {
  const authorName = item.author
    ? `${item.author.first_name} ${item.author.last_name}`.trim() || item.author.username
    : 'Utilisateur'

  // Titre = première phrase de la description (max 80 chars) ou la description entière
  const firstSentence = item.description.split(/[.!?]/)[0].trim()
  const title =
    firstSentence.length > 0 ? firstSentence.slice(0, 80) : item.description.slice(0, 80)

  return {
    id: item.id,
    author: {
      name: authorName,
      avatar: item.author?.avatar_url ?? '',
    },
    date: formatPostDate(item.created_at),
    location:
      [item.location_name, item.city, item.region, item.country].filter(Boolean).join(', ') ||
      'France',
    title,
    content: item.description,
    weather: item.weather ?? undefined,
    timeOfDay: item.time_of_day ?? undefined,
    category: {
      icon: TAXONOMIC_EMOJI[item.taxonomic_group ?? 'other'] ?? '🌍',
      label: item.taxonomic_group ?? 'Autre',
    },
    species: item.species_name ?? 'Espèce non identifiée',
    format: '16:9',
    images: (item.media ?? []).map((m) => ({ url: m.url, alt: m.alt ?? '' })),
    // Likes totaux attribués à 'love' — répartition détaillée en Sprint 4
    reactions: {
      love: item.likes_count,
      admire: 0,
      fire: 0,
      wow: 0,
      curious: 0,
      disappointed: 0,
    },
    comments: item.comments_count,
  }
}

// ─── Filtrage mock (mode démo uniquement) ────────────────────────────────────

function getFilteredMockPosts(tab: FeedTab, filters: FeedFilters): MockPost[] {
  let result = [...mockPosts]

  switch (tab) {
    case 'for-you':
      result = mockPosts.filter(
        (p) => p.category.label === 'Oiseaux' || p.category.label === 'Mammifères',
      )
      break
    case 'popular':
      result = [...mockPosts].sort((a, b) => {
        const sumA = Object.values(a.reactions).reduce((s, v) => s + v, 0)
        const sumB = Object.values(b.reactions).reduce((s, v) => s + v, 0)
        return sumB - sumA
      })
      break
    case 'trending':
      result = [...mockPosts].sort((a, b) => {
        const scoreA = Object.values(a.reactions).reduce((s, v) => s + v, 0) + a.comments
        const scoreB = Object.values(b.reactions).reduce((s, v) => s + v, 0) + b.comments
        return scoreB - scoreA
      })
      break
    default: // 'recent'
      break
  }

  if (filters.categories.length > 0) {
    result = result.filter((p) => filters.categories.includes(p.category.label))
  }

  return result
}

// ─── Skeleton de chargement ──────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="flex flex-col md:gap-4 gap-0" aria-busy="true" aria-label="Chargement du feed">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-background md:rounded-card rounded-none overflow-hidden animate-pulse"
        >
          <div className="p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-2 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="h-56 bg-muted mx-4 rounded-xl mb-4" />
          <div className="px-4 pb-4 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FeedSectionProps {
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  showFilters: boolean
  onShowFiltersChange: (show: boolean) => void
  onHasActiveFiltersChange: (has: boolean) => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FeedSection({
  viewMode,
  onViewModeChange,
  showFilters,
  onShowFiltersChange,
  onHasActiveFiltersChange,
}: FeedSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { locationLabel } = useLocation()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })
  const [page, setPage] = useState(1)

  // Map des onglets UI → paramètres postService
  const tabToServiceTab: Record<FeedTab, 'recent' | 'popular' | 'for_you' | 'trending'> = {
    recent: 'recent',
    'for-you': 'for_you',
    popular: 'popular',
    trending: 'trending',
  }

  // useFeed — actif uniquement en mode Supabase
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
  } = useFeed({ tab: tabToServiceTab[activeTab], page, limit: 20 }, isSupabaseConfigured)

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.helpOnly ||
    !filters.shareTypes.encounter ||
    !filters.shareTypes.instant ||
    filters.radius !== 0 ||
    filters.period !== 'all'

  useEffect(() => {
    onHasActiveFiltersChange(hasActiveFilters)
  }, [hasActiveFilters, onHasActiveFiltersChange])

  // Remettre à la page 1 quand l'onglet change (reset pendant le render via useState).
  const [prevTab, setPrevTab] = useState(activeTab)
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    setPage(1)
  }

  // ── Source de données selon le mode ──────────────────────────────────────
  let posts: MockPost[]

  if (isSupabaseConfigured) {
    // Mode Supabase : convertir PostFeedItem → MockPost via adaptateur
    posts = (feedData?.data ?? []).map(postFeedItemToMockPost)
  } else {
    // Mode démo : filtrage côté client sur mockPosts
    const allMock = getFilteredMockPosts(activeTab, filters)
    posts = isAuthenticated ? allMock : allMock.slice(0, GUEST_MAX_POSTS)
  }

  const isGuestLimitReached =
    !isAuthenticated && !isSupabaseConfigured && posts.length >= GUEST_MAX_POSTS

  const TABS: { id: FeedTab; label: string }[] = [
    { id: 'recent', label: t('home.feed.recent') },
    { id: 'for-you', label: t('home.feed.forYou') },
    { id: 'popular', label: t('home.feed.popular') },
    { id: 'trending', label: t('home.feed.trends') },
  ]

  function handleResetFilters() {
    setFilters({ ...DEFAULT_FILTERS })
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Feed des observations">
      {/* Header tabs + contrôles — desktop seulement */}
      <div className="hidden md:flex gap-3 items-center justify-between mb-4">
        <div
          role="tablist"
          aria-label={t('home.feed.filterFeed')}
          className="relative rounded-full border-[0.5px] border-border"
        >
          <div className="flex items-center p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                className={[
                  'flex h-8 items-center justify-center px-4 rounded-full transition-colors text-base',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground hover:bg-muted/50',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-full border-[0.5px] border-border">
          <div className="flex items-center gap-2 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('home.feed.listView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutList className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('home.feed.gridView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>
            <div aria-hidden="true" className="w-px h-5 bg-border" />
            <button
              type="button"
              onClick={() => onShowFiltersChange(true)}
              aria-label={t('home.feed.filterObs')}
              aria-expanded={showFilters}
              className={[
                'relative flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                showFilters
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <Filter className="size-4" aria-hidden="true" />
              {hasActiveFilters && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 size-2 bg-primary rounded-full"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* État chargement Supabase */}
      {isSupabaseConfigured && isFeedLoading && <FeedSkeleton />}

      {/* État erreur Supabase */}
      {isSupabaseConfigured && isFeedError && (
        <div role="alert" className="bg-background md:rounded-card rounded-none p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('home.feed.loadError', {
              defaultValue: 'Impossible de charger le feed. Réessaie dans un instant.',
            })}
          </p>
        </div>
      )}

      {/* État vide */}
      {!isFeedLoading && !isFeedError && posts.length === 0 && (
        <div className="bg-background relative md:rounded-card rounded-none overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
          />
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
            <img src={hermineEmptyState} alt="" className="w-48 opacity-80" aria-hidden="true" />
            <div className="flex flex-col gap-2 max-w-sm">
              <p className="text-lg font-bold text-foreground">{t('home.feed.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locationLabel
                  ? t('home.feed.emptyDescLocation', { location: locationLabel })
                  : t('home.feed.emptyDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center h-10 px-6 rounded-button border border-border hover:border-foreground/40 transition-colors text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('home.feed.emptyReset')}
                </button>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate('/contribute')}
                  className="bg-primary flex items-center justify-center h-10 px-6 rounded-button text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('home.feed.emptyContribute')}
                </button>
              ) : (
                <Link
                  to="/signup"
                  className="bg-primary flex items-center justify-center h-10 px-6 rounded-button text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('home.feed.guestLimitCreate')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des posts */}
      {!isFeedLoading && !isFeedError && posts.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <FeedGallery posts={posts} />
          ) : (
            <div className="flex flex-col md:gap-4 gap-0">
              {posts.map((post) => (
                <FeedPost key={post.id} {...post} canInteract={isAuthenticated} />
              ))}
            </div>
          )}

          {/* Pagination Supabase */}
          {isSupabaseConfigured && feedData && feedData.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!feedData.pagination.hasPrevious}
                className="h-9 px-4 rounded-full border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('common.previous', { defaultValue: 'Précédent' })}
              </button>
              <span className="h-9 px-4 flex items-center text-sm text-muted-foreground">
                {page} / {feedData.pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!feedData.pagination.hasNext}
                className="h-9 px-4 rounded-full border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('common.next', { defaultValue: 'Suivant' })}
              </button>
            </div>
          )}

          {/* Mur d'inscription invité — mode démo uniquement */}
          {isGuestLimitReached && (
            <div className="mt-4 bg-background relative md:rounded-card rounded-none overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
              />
              <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                <div className="flex items-center justify-center size-12 rounded-full bg-primary-light">
                  <Lock className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-foreground">{t('home.feed.guestLimitTitle')}</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t('home.feed.guestLimitDesc')}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to="/signup"
                    className="bg-primary flex items-center justify-center h-10 px-6 rounded-button text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {t('home.feed.guestLimitCreate')}
                  </Link>
                  <Link
                    to="/login"
                    className="flex items-center justify-center h-10 px-6 rounded-button border border-border hover:border-foreground/40 transition-colors text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {t('home.feed.guestLimitLogin')}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Panneau de filtres */}
      {showFilters && (
        <FeedFilterPanel
          filters={filters}
          onApply={setFilters}
          onClose={() => onShowFiltersChange(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </section>
  )
}

// Export de la clé de cache pour invalidation externe (ContributeForm)
export { FEED_QUERY_KEY }
