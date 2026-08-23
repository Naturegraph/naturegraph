/**
 * FeedSection : Section centrale du feed
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
import { useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
// BATCH 74 : ForYouDiscoveryModal supprime de la beta (decision Nicolas)
// import { ForYouDiscoveryModal } from './ForYouDiscoveryModal'
import type { FeedFilters } from './FeedFilterPanel'
import type { MockPost } from './FeedPost'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import { useQueryClient } from '@tanstack/react-query'
import { FEED_QUERY_KEY } from '@/hooks/useFeed'
// V1.1.4 NG-026 (Nicolas 2026-06-03) : feed principal en scroll infini.
// useFeed (pagination boutons) reste expose pour compat, mais le composant
// utilise maintenant useInfiniteFeed + useInfiniteScroll.
import { useInfiniteFeed, INFINITE_FEED_QUERY_KEY } from '@/hooks/useInfiniteFeed'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Loader2 } from 'lucide-react'
import { useHiddenPostIds } from '@/hooks/useHiddenPosts'
import { useToggleReaction } from '@/hooks/usePost'
// CTA géoloc (modale de permission + useLocationCTA) retiré en Phase 1 (Nicolas
// 2026-05-19) : peu de données, modale prématurée. Les composants ont été
// supprimés du repo (Lot 3 chantier qualité) ; à reconstruire en Phase 2 si le
// volume justifie un CTA géoloc.
// import type { LocationFormData } from '@/types/location'
import type { PostFeedItem, ReactionType } from '@/types/database'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

/**
 * Tabs du feed : ordre : Récent · Populaire · Pour vous
 * "for-you" nécessite d'être connecté (tab disabled + modale discovery sinon)
 */
export type FeedTab = 'recent' | 'popular' | 'for-you'

// Adaptateur PostFeedItem -> MockPost extrait dans feedPostMapper.ts (Lot 4).
import { postFeedItemToMockPost } from './feedPostMapper'
import { buildFeedTimeline } from './feedTimeline'
import { FeedDaySeparator, FeedMissedBanner, FeedSeenDivider } from './FeedTimelineParts'
import { useFeedVisit } from '@/hooks/useFeedVisit'

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
  /**
   * V1.1.4 QA round 4 : remontee du COMPTE de filtres actifs (0..N) pour
   * que la HomeNavbar puisse afficher un vrai badge chiffre coherent
   * desktop/mobile (au lieu d un simple point rond).
   */
  onHasActiveFiltersChange: (count: number) => void
  /** Callback pour ouvrir le panel "Rencontre Nature" depuis le CTA empty state.
   *  Géré au niveau Home (qui contrôle activePanelType). */
  onContributeClick?: () => void
  /**
   * Callback édition post : remonté à Home pour ouvrir le panel
   * Encounter/Instant pré-rempli avec les données du post existant
   * (Nicolas 2026-05-24 : permet aux users de corriger leurs obs).
   */
  onEditPost?: (postId: string, postType: 'nature_encounter' | 'nature_instant') => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FeedSection({
  viewMode,
  onViewModeChange,
  showFilters,
  onShowFiltersChange,
  onHasActiveFiltersChange,
  onContributeClick,
  onEditPost,
}: FeedSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  // updateLocation retiré avec la LocationPermissionModal (Phase 1) : n'est
  // plus déclenché qu'au signup/onboarding et via les Settings.
  // Nicolas 2026-05-22 : quand l'utilisateur est localisé, on applique
  // AUTOMATIQUEMENT son rayon de filtrage (sans qu'il doive ouvrir le panel
  // filtres). C'est le comportement attendu : « je suis localisé donc je
  // vois ce qui est autour de moi ». `locationDistance` (75-250 km) prend
  // le pas sur `filters.radius` (0 par défaut) si l'utilisateur est localisé.
  const { locationCoords, locationLabel, locationDistance } = useLocation()
  const isLocalized = !!(locationLabel && locationCoords)
  const queryClient = useQueryClient()
  // Species Context Layer, filtre global active depuis la recherche (PRD §3.4 / §6.1)
  // V1.1.4 : seule l espece passe par ce contexte. La categorie passe par
  // FeedFilters (panel filtres + badge compteur), cf. onSelectCategory plus bas.
  const { activeSpecies, clearActiveSpecies } = useSpecies()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })

  // BATCH 74 : suppression de la modale discovery "Pour vous" (decision Nicolas).
  // Le tab "Pour vous" reste disable visuellement pour les non-connectes
  // (cf. requiresAuth: true sur le tab) : aucun pop-up ne s'affiche, c'est
  // simplement non-cliquable. Plus simple et moins intrusif pour la beta.
  const handleTabClick = useCallback(
    (tabId: FeedTab) => {
      // Tab "Pour vous" requiert auth → si pas connecte, on ignore le clic.
      if (tabId === 'for-you' && !isAuthenticated) return
      setActiveTab(tabId)
    },
    [isAuthenticated],
  )

  // CTA localisation retiré de la Phase 1 (Nicolas 2026-05-19) : peu de
  // données au démarrage rend la modale prématurée. La géoloc reste
  // disponible via l'onboarding et le LocationModal dans la navbar header.

  // Map des onglets UI → paramètres postService
  const tabToServiceTab: Record<FeedTab, 'recent' | 'popular' | 'for_you'> = {
    recent: 'recent',
    popular: 'popular',
    'for-you': 'for_you',
  }

  // Construction du payload filtres → params backend
  // On omet shareTypes si les deux sont cochés (par défaut = tous types) pour
  // éviter des requêtes inutiles et une clé de cache qui change inutilement.
  // Si l'utilisateur est localisé, on force le rayon à `locationDistance`
  // (75-250 km défini dans LocationModal) : sauf si l'utilisateur a déjà
  // choisi un rayon plus restrictif dans le panel filtres. Sans localisation
  // active, on retombe sur `filters.radius` (0 = pas de filtre géographique).
  const effectiveRadius = isLocalized && filters.radius === 0 ? locationDistance : filters.radius

  const feedFilters = {
    categories: filters.categories,
    helpOnly: filters.helpOnly,
    // V1.1.4 NG-022 (Nicolas 2026-06-01) : propagation du Species Context Layer
    // au backend. Avant ce fix, activeSpecies n affichait qu un bandeau visuel
    // mais le feed retournait quand meme TOUS les posts -> l user pensait que
    // la recherche etait cassee. Maintenant on filtre reellement par taxref_id.
    taxrefId: activeSpecies?.taxref_id ?? undefined,
    shareTypes:
      filters.shareTypes.encounter && filters.shareTypes.instant ? undefined : filters.shareTypes,
    period: filters.period,
    radiusKm: effectiveRadius,
  }

  // V1.1.4 NG-026 (Nicolas 2026-06-03) : feed principal en scroll infini.
  // useInfiniteFeed accumule les pages et expose un array flat `posts`,
  // plus fetchNextPage/hasNextPage pour le sentinel IntersectionObserver.
  const {
    posts: rawPosts,
    isLoading: isFeedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError: isFeedError,
    refetch: refetchFeed,
  } = useInfiniteFeed(
    {
      tab: tabToServiceTab[activeTab],
      limit: 20,
      filters: feedFilters,
      // Pour vous : filtre côté serveur sur les utilisateurs suivis (follows).
      currentUserId: user?.id,
    },
    locationCoords,
  )

  // Sentinel scroll infini : declenche fetchNextPage quand visible.
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

  // Comptage des filtres actifs : affiché en badge numérique sur l'icône entonnoir.
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
    // V1.1.4 QA round 4 : on remonte le count (0..N) pour le badge chiffre
    onHasActiveFiltersChange(activeFiltersCount)
  }, [activeFiltersCount, onHasActiveFiltersChange])

  // V1.1.4 NG-026 : avec useInfiniteQuery, React Query reset automatiquement
  // les pages quand la queryKey change (changement d'onglet ou filtres ->
  // nouvelle cle). Le reset manuel de page n'est plus necessaire.

  const isLoading_ = isFeedLoading
  const isError_ = isFeedError

  // Filtrage côté client : masquer les posts cachés individuellement
  // (table hidden_posts) : second-agent/22. Les posts d'utilisateurs bloqués
  // sont déjà filtrés par les RLS DB (table blocks).
  const { data: hiddenIds } = useHiddenPostIds()
  const hiddenSet = new Set(hiddenIds ?? [])

  // Items bruts visibles (avec created_at) : base des separateurs temporels.
  const visibleRaw = rawPosts.filter((item) => !hiddenSet.has(item.id))
  const posts: MockPost[] = visibleRaw.map((item, idx) => postFeedItemToMockPost(item, idx))

  // Fil "oriente decouverte" (reperes temporels + contenus manques) : seulement
  // sur l'onglet chronologique "Recent" (created_at desc). Les autres onglets
  // ("Populaire" = tri par likes, non chronologique) gardent la liste simple.
  const feedVisit = useFeedVisit(isAuthenticated)

  // V1.1.4 NG-026 : cle de cache InfiniteFeed pour l'optimistic update des
  // reactions. Le useToggleReaction reconnait maintenant le shape useInfiniteQuery
  // ({ pages: [{ data, pagination }], pageParams }) en plus des 3 shapes existants.
  const currentFeedQueryKey = INFINITE_FEED_QUERY_KEY({
    tab: tabToServiceTab[activeTab],
    limit: 20,
    filters: feedFilters,
    currentUserId: user?.id,
  })

  // ── Mutation réaction ──────────────────────────────────────────────────
  const reactionMutation = useToggleReaction(user?.id)

  /** Callback passé à chaque FeedPost : déclenche la mutation optimiste */
  function handleReact(postId: string, type: ReactionType) {
    // V1.1.4 NG-026 : on cherche directement dans rawPosts (flat array
    // accumule des pages) au lieu de feedData.data (cas pagination).
    const post = rawPosts.find((p: PostFeedItem) => p.id === postId)
    reactionMutation.mutate({
      postId,
      type,
      currentReaction: post?.user_reaction ?? null,
      feedQueryKey: currentFeedQueryKey,
    })
  }

  /**
   * Rendu d'un post du fil, factorisé : utilisé tel quel par la liste simple
   * (onglets Populaire / Pour vous) ET par la timeline chronologique (onglet
   * Récent, avec séparateurs de jour et frontière "déjà vu").
   */
  function renderFeedPost(post: MockPost, idx: number, total: number, forceHideBorder?: boolean) {
    return (
      <FeedPost
        key={post.id}
        {...post}
        canInteract={isAuthenticated}
        isOwnPost={!!user?.id && post.authorId === user.id}
        onReact={handleReact}
        onEditPost={onEditPost}
        onSelectCategory={(group) => {
          setFilters((prev) =>
            prev.categories.includes(group)
              ? prev
              : { ...prev, categories: [...prev.categories, group] },
          )
          window.scrollTo({ top: 0, behavior: 'auto' })
        }}
        // Bordure de fin retiree : dernier item OU quand un separateur (jour /
        // "arrete ici") suit, pour eviter une double ligne collee au separateur.
        hideEndBorder={forceHideBorder ?? idx === total - 1}
        // NG-026 : seul le 1er post (above-the-fold, LCP) charge sa cover en eager.
        priority={idx === 0}
      />
    )
  }

  /**
   * Ordre PRD validé : Récent · Populaire · Pour vous
   * "Pour vous" est toujours visible : disabled si non connecté (conversion).
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
       * V1.1.4 NG-023 ext final (Nicolas 2026-06-01) :
       * Banniere "Feed filtre" RETIREE. Le filtre actif est desormais materialise
       * directement dans le bouton recherche de la HomeNavbar (pill avec nom +
       * croix X). Permet de garder l espace feed clean et integre l indication
       * de filtre la ou l user attend de la voir : dans la barre de recherche.
       * Cf. HomeNavbar.tsx pour l affichage du pill actif.
       */}

      {/* V1.1.4 QA round 6 (Nicolas 2026-06-01) : pill recherche active mobile
          sticky sous la navbar. Click sur le pill -> ouvre le SearchPanel
          pour changer d espece. X clear le filtre. */}
      {activeSpecies && (
        <div className="md:hidden sticky top-[72px] z-30 px-4 pt-3 pb-2 mb-2 bg-cream-lighter/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-cream-lighter border border-border rounded-full pl-3 pr-2 py-2">
            <button
              type="button"
              onClick={() => {
                // Ouvre le SearchPanel via un event que MobileNavLayer ecoute
                window.dispatchEvent(new CustomEvent('naturegraph:open-search'))
              }}
              className="flex-1 flex items-center gap-2 min-w-0 focus-visible:outline-none rounded-full"
              aria-label="Modifier la recherche"
            >
              <Search
                className="size-4 text-[var(--color-link)] shrink-0"
                strokeWidth={3}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground truncate text-left">
                {activeSpecies.common_name ?? activeSpecies.scientific_name}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearActiveSpecies()
              }}
              aria-label="Retirer le filtre"
              className="shrink-0 size-7 flex items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Header tabs + contrôles : desktop seulement */}
      {/*
        Bandeau des tabs + contrôles vue/filtres : sticky pour rester accessible
        au scroll (second-agent/24).
        - top-[72px] : juste sous la HomeNavbar (header h-[72px] sticky top-0)
        - bg-background avec léger backdrop-blur pour lisibilité quand le feed
          défile derrière
        - z-30 : sous la navbar (z-40) mais au-dessus des cartes posts
        - py-2 -mx-4 px-4 : étend le fond pour couvrir la pleine largeur sans
          gap visible quand sticky
      */}
      <div className="hidden md:flex gap-3 items-center justify-between mb-4 sticky top-[72px] z-30 bg-cream-lighter/95 backdrop-blur-sm py-2 -mx-2 px-2 rounded-full">
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
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-[var(--color-link)] text-[11px] font-bold leading-none border border-background"
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

      {/* État erreur : utilise la primitive ErrorState (BATCH 6 / T-020).
          Ajoute un bouton "Réessayer" qui declenche refetch() : UX amelioree. */}
      {isError_ && (
        <div className="bg-background md:rounded-card rounded-none">
          <ErrorState
            title={t('home.feed.loadErrorTitle', { defaultValue: 'Impossible de charger le feed' })}
            description={t('home.feed.loadError', {
              defaultValue:
                'Réessaie dans un instant. Si le probleme persiste, verifie ta connexion.',
            })}
            onRetry={() => refetchFeed()}
            retryLabel={t('common.retry', { defaultValue: 'Réessayer' })}
          />
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
              <p className="text-lg font-bold text-foreground">
                {isLocalized
                  ? t('home.feed.emptyLocationTitle', {
                      defaultValue: 'Aucune observation dans ce rayon',
                    })
                  : t('home.feed.emptyTitle')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isLocalized
                  ? t('home.feed.emptyLocationDesc', {
                      defaultValue:
                        'Aucune observation publique trouvée dans un rayon de {{km}} km autour de {{city}}. Élargis ton rayon ou contribue pour démarrer la dynamique locale.',
                      km: effectiveRadius,
                      city: locationLabel,
                    })
                  : t('home.feed.emptyDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Boutons alignés sur le design system : variant secondary (outline teal)
                  pour l'action secondaire et primary (violet solid) pour le CTA principal.
                  Effet btn-press 3D géré par le composant Button. */}
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  {t('home.feed.emptyReset')}
                </Button>
              )}
              {isAuthenticated ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // Ouvre directement le panel Rencontre Nature (cas d'usage
                    // le plus fréquent depuis l'empty state du feed). Si non
                    // câblé par le parent, fallback sur la route /contribute.
                    if (onContributeClick) onContributeClick()
                    else navigate('/contribute')
                  }}
                >
                  {t('home.feed.emptyContribute')}
                </Button>
              ) : (
                <Button variant="primary" size="sm" to="/signup">
                  {t('home.feed.guestLimitCreate')}
                </Button>
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
          ) : activeTab === 'recent' ? (
            // Fil chronologique enrichi (onglet Récent) : bandeau "nouveaux
            // moments" + séparateurs de jour + frontière "arrêté ici". Cf.
            // feedTimeline (logique pure) + FeedTimelineParts (rendu).
            (() => {
              const total = visibleRaw.length
              const rows = buildFeedTimeline(
                visibleRaw,
                feedVisit.lastVisitRef,
                new Date(),
                (k, o) => t(k, o) as string,
              )
              const showBanner = !feedVisit.loading && feedVisit.missedCount > 0
              // Padding haut sauf si le fil commence par un post (le post gère déjà
              // son espacement) : évite de coller le bandeau/séparateur à la topbar.
              const firstIsPost = !showBanner && rows[0]?.kind === 'post'
              let pIdx = -1
              return (
                <div className={firstIsPost ? undefined : 'pt-6'}>
                  {showBanner && <FeedMissedBanner count={feedVisit.missedCount} />}
                  {/* gap-0 mobile : les posts sont collés ; l'air ne vient que des
                      séparateurs (date / "arrêté ici"). Cartes espacées en desktop. */}
                  <div className="flex flex-col md:gap-4 gap-0">
                    {rows.map((row, i) => {
                      if (row.kind === 'day')
                        return <FeedDaySeparator key={row.key} label={row.label} />
                      if (row.kind === 'seen-divider') return <FeedSeenDivider key={row.key} />
                      pIdx += 1
                      // Masque la bordure quand un separateur suit (pas de double ligne).
                      const nextIsSeparator = i + 1 < rows.length && rows[i + 1].kind !== 'post'
                      const hideBorder = i === rows.length - 1 || nextIsSeparator
                      return renderFeedPost(
                        postFeedItemToMockPost(row.post, pIdx),
                        pIdx,
                        total,
                        hideBorder,
                      )
                    })}
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="flex flex-col md:gap-4 gap-0">
              {posts.map((post, idx) => renderFeedPost(post, idx, posts.length))}
            </div>
          )}

          {/* V1.1.4 NG-026 (Nicolas 2026-06-03) : sentinel scroll infini.
              Le div est observe par useInfiniteScroll qui declenche
              fetchNextPage des qu'il entre dans le viewport. Loader visible
              pendant le fetch. */}
          {hasNextPage && (
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

          {/* V1.1.4 round 12 (Nicolas 2026-06-03) : message de fin de liste.
              L'utilisateur sait qu'il a tout vu (pas de fausse impression
              qu'il reste du contenu a charger). Affiche seulement quand il y
              a au moins quelques posts (sinon l'empty state suffit). */}
          {!hasNextPage && posts.length >= 5 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              {t('home.feed.endOfList', {
                defaultValue: 'Tu as vu toutes les observations pour le moment.',
              })}
            </p>
          )}
        </>
      )}

      {/* Panneau de filtres */}
      {showFilters && (
        <FeedFilterPanel
          filters={filters}
          onApply={(next) => {
            setFilters(next)
            // Force invalidation TOUT le cache 'feed' : défensif au cas où
            // React Query reste sur des données stale après changement de
            // filtres (Nicolas 2026-05-22 : retour beta « rien ne change »).
            queryClient.invalidateQueries({ queryKey: ['feed'] })
          }}
          onClose={() => onShowFiltersChange(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* BATCH 74 : modale discovery "Pour vous" supprimee de la beta. */}
      {/* LocationPermissionModal retirée Phase 1 (Nicolas 2026-05-19) -
          composant conservé dans /components/location pour réactivation Phase 2. */}
    </section>
  )
}

// Export de la clé de cache pour invalidation externe (ContributeForm)
export { FEED_QUERY_KEY }
