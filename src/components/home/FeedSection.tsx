/**
 * FeedSection — Section centrale du feed
 *
 * Tabs (Récent / Pour toi / Populaire / Tendances) + vue liste/grille + filtre.
 * Liste des posts filtrés selon l'onglet actif.
 *
 * TODO [BACKEND] — Remplacer mockPosts par postService.getFeed() :
 *   import { getFeed } from '@/services/postService'
 *   Appeler getFeed({ tab, page, limit }) via TanStack Query (useQuery).
 *   Activer la pagination infinie (useInfiniteQuery) pour le scroll.
 *   Le filtre "Pour vous" doit utiliser l'algorithme de recommandation back-end
 *   (basé sur les intérêts de l'utilisateur connecté + historique).
 *   Ref: table `posts` + vue `post_feed_items` (avec join author + media + reactions)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, Lock } from 'lucide-react'
import { FeedPost } from './FeedPost'
import { mockPosts } from '@/data/mockPosts'
import { useAuth } from '@/contexts/AuthContext'

/** Nombre maximum d'observations visibles en mode invité.
 * TODO [BACKEND] — Cette limite sera appliquée côté requête (LIMIT 20) dans postService.getFeed()
 * plutôt que côté client, pour éviter de charger des données inutiles.
 */
const GUEST_MAX_POSTS = 20

type FeedTab = 'recent' | 'for-you' | 'popular' | 'trends'

// TODO [BACKEND] — Cette fonction sera supprimée. La logique de tri/filtrage
// sera gérée côté Supabase via des requêtes avec .order() et .filter().
// "Pour vous" → endpoint dédié avec scoring ML ou règles métier back-end.
// "Tendances" → basé sur le volume de réactions/commentaires sur 24h.
function getFilteredPosts(tab: FeedTab) {
  switch (tab) {
    case 'recent':
      return mockPosts.slice(0, 5)
    case 'for-you':
      return mockPosts.filter(
        (p) => p.category.label === 'Oiseaux' || p.category.label === 'Mammifères',
      )
    case 'popular':
      return [...mockPosts].sort((a, b) => {
        const sumA = Object.values(a.reactions).reduce((s, v) => s + v, 0)
        const sumB = Object.values(b.reactions).reduce((s, v) => s + v, 0)
        return sumB - sumA
      })
    case 'trends':
      return [...mockPosts].sort((a, b) => b.comments - a.comments)
  }
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FeedSection() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const allPosts = getFilteredPosts(activeTab)
  // Invité : limité à GUEST_MAX_POSTS observations
  // TODO [BACKEND] — Remplacer par postService.getFeed({ limit: isAuthenticated ? undefined : GUEST_MAX_POSTS })
  const posts = isAuthenticated ? allPosts : allPosts.slice(0, GUEST_MAX_POSTS)
  const isGuestLimitReached = !isAuthenticated && allPosts.length >= GUEST_MAX_POSTS

  const TABS: { id: FeedTab; label: string }[] = [
    { id: 'recent', label: t('home.feed.recent') },
    { id: 'for-you', label: t('home.feed.forYou') },
    { id: 'popular', label: t('home.feed.popular') },
    { id: 'trends', label: t('home.feed.trends') },
  ]

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
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('home.feed.listView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'list' ? 'bg-primary' : 'hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutList
                className="size-4"
                color={viewMode === 'list' ? 'var(--text-light)' : 'var(--foreground)'}
                aria-hidden="true"
              />
            </button>

            {/* Vue grille */}
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('home.feed.gridView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'grid' ? 'bg-primary' : 'hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutGrid
                className="size-4"
                color={viewMode === 'grid' ? 'var(--text-light)' : 'var(--foreground)'}
                aria-hidden="true"
              />
            </button>

            {/* Séparateur vertical */}
            <div aria-hidden="true" className="w-px h-5 bg-border" />

            {/* Filtre */}
            <button
              type="button"
              aria-label={t('home.feed.filterObs')}
              className="flex items-center justify-center rounded-full size-[34px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <Filter className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Liste des posts */}
      <div className="flex flex-col md:gap-4 gap-0">
        {posts.map((post) => (
          <FeedPost key={post.id} {...post} canInteract={isAuthenticated} />
        ))}
      </div>

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
    </section>
  )
}
