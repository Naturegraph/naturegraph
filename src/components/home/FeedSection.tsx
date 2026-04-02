/**
 * FeedSection — Section centrale du feed
 *
 * Tabs (Récent / Pour toi / Populaire) + vue liste/grille + filtre.
 * Liste des posts filtrés selon l'onglet actif.
 *
 * Fonctionnalités :
 *   - Panneau de filtres (FeedFilterPanel) : catégories, type, rayon, période
 *   - État vide avec illustration hermine si aucun résultat
 *   - Limite de posts pour les invités (GUEST_MAX_POSTS)
 *
 * TODO [BACKEND] — Remplacer mockPosts par postService.getFeed() :
 *   import { getFeed } from '@/services/postService'
 *   Appeler getFeed({ tab, page, limit, filters }) via TanStack Query (useQuery).
 *   Activer la pagination infinie (useInfiniteQuery) pour le scroll.
 *   Le filtre "Pour vous" doit utiliser l'algorithme de recommandation back-end
 *   (basé sur les intérêts de l'utilisateur connecté + historique).
 *   Ref: table `posts` + vue `post_feed_items` (avec join author + media + reactions)
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, Lock } from 'lucide-react'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
import type { FeedFilters } from './FeedFilterPanel'
import { mockPosts } from '@/data/mockPosts'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

/** Nombre maximum d'observations visibles en mode invité.
 * TODO [BACKEND] — Cette limite sera appliquée côté requête (LIMIT 20) dans postService.getFeed()
 * plutôt que côté client, pour éviter de charger des données inutiles.
 */
const GUEST_MAX_POSTS = 20

export type FeedTab = 'recent' | 'for-you' | 'popular' | 'trending'

// TODO [BACKEND] — Cette fonction sera supprimée. La logique de tri/filtrage
// sera gérée côté Supabase via des requêtes avec .order() et .filter().
// "Pour vous" → endpoint dédié avec scoring ML ou règles métier back-end.
// "Tendances" → basé sur le volume de réactions/commentaires sur 24h.
function getFilteredPosts(tab: FeedTab, filters: FeedFilters) {
  let result = [...mockPosts]

  // Filtre par onglet
  switch (tab) {
    case 'recent':
      result = mockPosts.slice(0, 5)
      break
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
      // TODO [BACKEND] — Requête dédiée : posts avec le plus d'activité (réactions + commentaires) sur 24h
      result = [...mockPosts].sort((a, b) => {
        const scoreA = Object.values(a.reactions).reduce((s, v) => s + v, 0) + a.comments
        const scoreB = Object.values(b.reactions).reduce((s, v) => s + v, 0) + b.comments
        return scoreB - scoreA
      })
      break
  }

  // Filtre par catégorie d'espèces (si au moins une sélectionnée)
  if (filters.categories.length > 0) {
    result = result.filter((p) => filters.categories.includes(p.category.label))
  }

  return result
}

// ─── Props ───────────────────────────────────────────────────────────────────

/**
 * Props optionnelles pour partager l'état vue/filtres avec Home.tsx.
 * Utilisées sur mobile pour que la navbar puisse contrôler le feed.
 * Sur desktop, les boutons internes du FeedSection fonctionnent directement.
 */
interface FeedSectionProps {
  /** Vue liste ou grille — contrôlée depuis Home.tsx */
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  /** Panneau filtres — ouvert depuis la navbar mobile OU le header desktop */
  showFilters: boolean
  onShowFiltersChange: (show: boolean) => void
  /** Signale au parent si des filtres non-défaut sont actifs (badge navbar) */
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

  /** Indique si des filtres personnalisés sont actifs (non par défaut) */
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.helpOnly ||
    !filters.shareTypes.encounter ||
    !filters.shareTypes.instant ||
    filters.radius !== 0 ||
    filters.period !== 'all'

  // Notifie le parent dès que l'état des filtres actifs change (badge navbar mobile)
  useEffect(() => {
    onHasActiveFiltersChange(hasActiveFilters)
  }, [hasActiveFilters, onHasActiveFiltersChange])

  const allPosts = getFilteredPosts(activeTab, filters)
  // Invité : limité à GUEST_MAX_POSTS observations
  // TODO [BACKEND] — Remplacer par postService.getFeed({ limit: isAuthenticated ? undefined : GUEST_MAX_POSTS })
  const posts = isAuthenticated ? allPosts : allPosts.slice(0, GUEST_MAX_POSTS)
  const isGuestLimitReached = !isAuthenticated && allPosts.length >= GUEST_MAX_POSTS

  const TABS: { id: FeedTab; label: string }[] = [
    { id: 'recent', label: t('home.feed.recent') },
    { id: 'for-you', label: t('home.feed.forYou') },
    { id: 'popular', label: t('home.feed.popular') },
    { id: 'trending', label: t('home.feed.trends') },
  ]

  /** Réinitialise les filtres et ferme le panneau */
  function handleResetFilters() {
    setFilters({ ...DEFAULT_FILTERS })
  }

  return (
    <section aria-label="Feed des observations">
      {/* Header tabs + contrôles — desktop seulement */}
      <div className="hidden md:flex gap-3 items-center justify-between mb-4">
        {/* Tabs */}
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

        {/* Contrôles vue + filtre */}
        <div className="relative rounded-full border-[0.5px] border-border">
          <div className="flex items-center gap-2 p-1">
            {/* Vue liste */}
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

            {/* Vue grille */}
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

            {/* Séparateur vertical */}
            <div aria-hidden="true" className="w-px h-5 bg-border" />

            {/* Filtre — indicateur actif si des filtres sont appliqués */}
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
              {/* Dot indicateur de filtres actifs */}
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

      {/* État vide — aucune observation trouvée */}
      {posts.length === 0 ? (
        <div className="bg-background relative md:rounded-card rounded-none overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
          />
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
            {/* Illustration hermine */}
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
              {/* Réinitialiser les filtres si des filtres sont actifs */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center h-10 px-6 rounded-button border border-border hover:border-foreground/40 transition-colors text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('home.feed.emptyReset')}
                </button>
              )}

              {/* CTA contribuer (connecté) ou créer un compte (invité) */}
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
      ) : (
        <>
          {/* Posts — vue liste ou galerie masonry */}
          {viewMode === 'grid' ? (
            <FeedGallery posts={posts} />
          ) : (
            <div className="flex flex-col md:gap-4 gap-0">
              {posts.map((post) => (
                <FeedPost key={post.id} {...post} canInteract={isAuthenticated} />
              ))}
            </div>
          )}

          {/* Mur d'inscription invité — affiché après la limite de posts */}
          {isGuestLimitReached && (
            <div className="mt-4 mx-0 md:mx-0 bg-background relative md:rounded-card rounded-none overflow-hidden">
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
