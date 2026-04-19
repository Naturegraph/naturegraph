/**
 * FeedSection — Section centrale du feed
 *
 * Tabs : Récent · Populaire · Pour vous
 *   - Récent    : chronologique, accessible à tous
 *   - Populaire : tri par score d'engagement (30j), accessible à tous
 *   - Pour vous : personnalisé (intérêts + follows + localisation), connecté requis
 *     → non connecté : tab visible disabled + modale discovery douce au clic
 *
 * Source de données : Supabase via useFeed() (React Query → postService.getFeed())
 *
 * L'adaptateur postFeedItemToMockPost() fait le bridge entre PostFeedItem
 * (type DB) et MockPost (type UI). À supprimer quand FeedPost sera
 * refactorisé pour accepter PostFeedItem directement.
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, X } from 'lucide-react'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
import { ForYouDiscoveryModal } from './ForYouDiscoveryModal'
import type { FeedFilters } from './FeedFilterPanel'
import type { MockPost } from './FeedPost'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import { useFeed, FEED_QUERY_KEY } from '@/hooks/useFeed'
import { useLocationCTA } from '@/hooks/useLocationCTA'
import { useToggleReaction } from '@/hooks/usePost'
import { LocationPermissionModal } from '@/components/location/LocationPermissionModal'
import { requestBrowserLocation } from '@/lib/location/geocoding'
import type { PostFeedItem, ReactionType } from '@/types/database'
import type { LocationFormData } from '@/types/location'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

/**
 * Tabs du feed — ordre : Récent · Populaire · Pour vous
 * "for-you" nécessite d'être connecté (tab disabled + modale discovery sinon)
 */
export type FeedTab = 'recent' | 'popular' | 'for-you'

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
    scientific_name: item.scientific_name ?? null,
    taxref_id: item.taxref_id ?? null,
    taxonomic_group: item.taxonomic_group ?? null,
    format: '16:9',
    images: (item.media ?? []).map((m) => ({ url: m.url, alt: m.alt ?? '' })),
    // Tous les likes attribués à 'love' pour l'instant — la répartition détaillée
    // par type nécessite un agrégat SQL séparé (post-MVP)
    reactions: {
      love: item.likes_count,
      admire: 0,
      fire: 0,
      wow: 0,
      curious: 0,
      disappointed: 0,
    },
    userReaction: item.user_reaction ?? null,
    totalReactions: item.likes_count,
    comments: item.comments_count,
  }
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
  const { isAuthenticated, user } = useAuth()
  const { updateLocation, locationCoords } = useLocation()
  // Species Context Layer — filtre global activé depuis la recherche (PRD §3.4 / §6.1)
  const { activeSpecies, clearActiveSpecies } = useSpecies()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })
  const [page, setPage] = useState(1)

  // ─── Modale discovery "Pour vous" (non connecté) ──────────────
  // Affichée au clic sur "Pour vous" quand l'utilisateur n'est pas connecté.
  // Propose l'inscription sans forcer — CTA secondaire "Continuer à découvrir".
  const [showForYouModal, setShowForYouModal] = useState(false)

  /**
   * Clic sur un tab :
   *   - "Pour vous" non connecté → ouvre la modale discovery, reste sur Récent
   *   - sinon → change l'onglet normalement
   */
  const handleTabClick = useCallback(
    (tabId: FeedTab) => {
      if (tabId === 'for-you' && !isAuthenticated) {
        setShowForYouModal(true)
        return
      }
      setActiveTab(tabId)
    },
    [isAuthenticated],
  )

  /** Ferme la modale discovery et ramène sur Récent */
  const handleForYouModalClose = useCallback(() => {
    setShowForYouModal(false)
    setActiveTab('recent')
  }, [])

  // ─── CTA localisation (pour les utilisateurs connectés non-localisés) ─────
  // Modale affichée 1x/session — triggered depuis le tab "Pour vous"
  const { showModal, dismissModal } = useLocationCTA()

  /**
   * Handler "Activer" de la modale localisation — tente la géoloc navigateur.
   * Ferme la modale et sauvegarde la localisation si succès.
   */
  const handleActivateLocation = useCallback(async () => {
    dismissModal()
    const city = await requestBrowserLocation()
    if (city) {
      const locationData: LocationFormData = {
        city,
        radiusKm: 75,
        visibility: 'region',
        consentSource: 'browser',
      }
      await updateLocation(locationData).catch(() => {
        // Erreur non-bloquante — l'utilisateur peut réessayer depuis les Settings
      })
    }
  }, [dismissModal, updateLocation])

  // Map des onglets UI → paramètres postService
  const tabToServiceTab: Record<FeedTab, 'recent' | 'popular' | 'for_you'> = {
    recent: 'recent',
    popular: 'popular',
    'for-you': 'for_you',
  }

  // Construction du payload filtres → params backend
  // On omet shareTypes si les deux sont cochés (par défaut = tous types) pour
  // éviter des requêtes inutiles et une clé de cache qui change inutilement.
  const feedFilters = {
    categories: filters.categories,
    helpOnly: filters.helpOnly,
    shareTypes:
      filters.shareTypes.encounter && filters.shareTypes.instant ? undefined : filters.shareTypes,
    period: filters.period,
    radiusKm: filters.radius,
  }

  // useFeed — données Supabase via React Query, avec filtres appliqués
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
  } = useFeed(
    { tab: tabToServiceTab[activeTab], page, limit: 20, filters: feedFilters },
    locationCoords,
  )

  // Comptage des filtres actifs — affiché en badge numérique sur l'icône entonnoir.
  // Règle : chaque groupe de filtre "modifié" par rapport au défaut compte pour 1.
  //  - Catégories : 1 si au moins une est sélectionnée
  //  - Demandes d'aide : 1 si cochée
  //  - Types de partage : 1 si l'un des deux est décoché (subset)
  //  - Rayon : 1 si différent de 0
  //  - Période : 1 si différente de 'all'
  const activeFiltersCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.helpOnly ? 1 : 0) +
    (!filters.shareTypes.encounter || !filters.shareTypes.instant ? 1 : 0) +
    (filters.radius !== 0 ? 1 : 0) +
    (filters.period !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFiltersCount > 0

  useEffect(() => {
    onHasActiveFiltersChange(hasActiveFilters)
  }, [hasActiveFilters, onHasActiveFiltersChange])

  // Remettre à la page 1 quand l'onglet ou les filtres changent (reset synchrone via useState).
  const [prevTab, setPrevTab] = useState(activeTab)
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    setPage(1)
  }
  const filtersKey = JSON.stringify(filters)
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey)
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey)
    setPage(1)
  }

  const isLoading_ = isFeedLoading
  const isError_ = isFeedError
  const posts: MockPost[] = (feedData?.data ?? []).map(postFeedItemToMockPost)

  // Clé de cache du feed courant — passée au hook de réaction pour l'optimistic update
  // Doit inclure les filtres pour matcher exactement l'entrée cache de useFeed.
  const currentFeedQueryKey = FEED_QUERY_KEY({
    tab: tabToServiceTab[activeTab],
    page,
    limit: 20,
    filters: feedFilters,
  })

  // ── Mutation réaction ──────────────────────────────────────────────────
  const reactionMutation = useToggleReaction(user?.id)

  /** Callback passé à chaque FeedPost — déclenche la mutation optimiste */
  function handleReact(postId: string, type: ReactionType) {
    const sourcePosts = feedData?.data ?? []
    const post = sourcePosts.find((p: PostFeedItem) => p.id === postId)
    reactionMutation.mutate({
      postId,
      type,
      currentReaction: post?.user_reaction ?? null,
      feedQueryKey: currentFeedQueryKey,
    })
  }

  /**
   * Ordre PRD validé : Récent · Populaire · Pour vous
   * "Pour vous" est toujours visible — disabled si non connecté (conversion).
   */
  const TABS: { id: FeedTab; label: string; requiresAuth: boolean }[] = [
    { id: 'recent', label: t('home.feed.recent'), requiresAuth: false },
    { id: 'popular', label: t('home.feed.popular'), requiresAuth: false },
    { id: 'for-you', label: t('home.feed.forYou'), requiresAuth: true },
  ]

  function handleResetFilters() {
    setFilters({ ...DEFAULT_FILTERS })
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Feed des observations">
      {/*
       * Bannière Species Context Layer — visible quand une espèce est active (PRD §6.1).
       * Informe l'utilisateur que le feed est filtré + permet de revenir au feed global.
       */}
      {activeSpecies && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-3 rounded-xl bg-primary-light border border-primary/20 px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {activeSpecies.common_name ?? activeSpecies.scientific_name}
            </p>
            <p className="text-xs text-muted-foreground italic truncate">
              {activeSpecies.scientific_name}
            </p>
          </div>
          <span className="text-xs text-primary font-medium shrink-0">Feed filtré</span>
          <button
            type="button"
            onClick={clearActiveSpecies}
            aria-label="Revenir au feed global"
            className="size-7 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header tabs + contrôles — desktop seulement */}
      <div className="hidden md:flex gap-3 items-center justify-between mb-4">
        <div
          role="tablist"
          aria-label={t('home.feed.filterFeed')}
          className="relative rounded-full border-[0.5px] border-border"
        >
          <div className="flex items-center p-1">
            {TABS.map((tab) => {
              const isDisabled = tab.requiresAuth && !isAuthenticated
              const isActive = activeTab === tab.id && !isDisabled
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  aria-selected={isActive}
                  aria-disabled={isDisabled}
                  title={isDisabled ? t('home.feed.forYouModal.tabDisabledHint') : undefined}
                  className={[
                    'flex h-8 items-center justify-center gap-1.5 px-4 rounded-full transition-colors text-base',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : isDisabled
                        ? 'bg-transparent text-muted-foreground cursor-pointer opacity-60'
                        : 'bg-transparent text-foreground hover:bg-muted/50',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
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
                  aria-label={t('home.feed.activeFiltersCount', {
                    count: activeFiltersCount,
                    defaultValue: '{{count}} filtre(s) actif(s)',
                  })}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-primary text-[11px] font-bold leading-none border border-background"
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* État chargement */}
      {isLoading_ && <FeedSkeleton />}

      {/* État erreur */}
      {isError_ && (
        <div role="alert" className="bg-background md:rounded-card rounded-none p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('home.feed.loadError', {
              defaultValue: 'Impossible de charger le feed. Réessaie dans un instant.',
            })}
          </p>
        </div>
      )}

      {/* État vide */}
      {!isLoading_ && !isError_ && posts.length === 0 && (
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
                {t('home.feed.emptyDesc')}
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
      {!isLoading_ && !isError_ && posts.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <FeedGallery posts={posts} />
          ) : (
            <div className="flex flex-col md:gap-4 gap-0">
              {posts.map((post) => (
                <FeedPost
                  key={post.id}
                  {...post}
                  canInteract={isAuthenticated}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {feedData && feedData.pagination.totalPages > 1 && (
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
                {page} / {feedData?.pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!feedData?.pagination.hasNext}
                className="h-9 px-4 rounded-full border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('common.next', { defaultValue: 'Suivant' })}
              </button>
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

      {/* Modale discovery "Pour vous" — visiteurs non connectés */}
      <ForYouDiscoveryModal isOpen={showForYouModal} onContinue={handleForYouModalClose} />

      {/* Modale permission géolocalisation — utilisateurs connectés non-localisés (1x/session) */}
      <LocationPermissionModal
        isOpen={showModal}
        onActivate={handleActivateLocation}
        onSkip={dismissModal}
      />
    </section>
  )
}

// Export de la clé de cache pour invalidation externe (ContributeForm)
export { FEED_QUERY_KEY }
