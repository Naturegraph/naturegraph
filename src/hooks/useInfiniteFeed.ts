/**
 * useInfiniteFeed — Variante scroll infini de useFeed
 * ====================================================
 *
 * V1.1.4 NG-026 (Nicolas 2026-06-03) : alternative a useFeed (pagination
 * boutons) avec React Query useInfiniteQuery. Les pages sont accumulees
 * et flattenees dans `posts` au retour.
 *
 * Garde-fous eco-conception (cf CLAUDE.md V1.1.4) :
 *   - Pagination backend conservee (limit 20 par page)
 *   - maxPages: 10 pour cap memoire navigateur (200 posts max simultanes)
 *   - placeholderData pour eviter le flash blanc entre fetch
 *
 * Compatible avec FEED_QUERY_KEY de useFeed pour les invalidations
 * cross-pages (Contribute -> Feed).
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  getFeed,
  getUserReactions,
  getReactionsBreakdown,
  type FeedParams,
  type FeedResult,
} from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import type { PostFeedItem, ReactionType } from '@/types/database'
import { FEED_QUERY_KEY } from './useFeed'

// Reuse Haversine helper logique (defini ici pour ne pas exporter de useFeed)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Cle infinite : meme params que FEED_QUERY_KEY mais sans la page (gere par useInfiniteQuery). */
export const INFINITE_FEED_QUERY_KEY = (params: Omit<FeedParams, 'page'>) =>
  [
    'feed-infinite',
    params.tab ?? 'recent',
    params.limit ?? 20,
    JSON.stringify({
      categories: [...(params.filters?.categories ?? [])].sort(),
      helpOnly: params.filters?.helpOnly ?? false,
      shareTypes: params.filters?.shareTypes ?? null,
      period: params.filters?.period ?? 'all',
      radiusKm: params.filters?.radiusKm ?? 0,
      taxrefId: params.filters?.taxrefId ?? null,
    }),
    params.currentUserId ?? '',
  ] as const

export interface UseInfiniteFeedResult {
  /** Tous les posts accumules de toutes les pages chargees, deja enriches. */
  posts: PostFeedItem[]
  /** True pendant le premier chargement (avant la 1ere page). */
  isLoading: boolean
  /** True pendant le fetch d'une page suivante. */
  isFetchingNextPage: boolean
  /** True si une page suivante existe (utilise par useInfiniteScroll). */
  hasNextPage: boolean
  /** Callback pour charger la page suivante. */
  fetchNextPage: () => void
  /** True si la query a echoue. */
  isError: boolean
  /** Refetch force (apres contribution par ex). */
  refetch: () => void
}

/**
 * @param params  Parametres feed (sans page, gere automatiquement)
 * @param userCoords Coordonnees user pour filtre radius (optionnel)
 * @param enabled Permet de desactiver (guest mode)
 */
export function useInfiniteFeed(
  params: Omit<FeedParams, 'page'> = {},
  userCoords?: { lat: number; lon: number } | null,
  enabled = true,
): UseInfiniteFeedResult {
  const { user } = useAuth()
  const userId = user?.id
  const radiusKm = params.filters?.radiusKm ?? 0
  const limit = params.limit ?? 20
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<FeedResult, Error>({
    queryKey: INFINITE_FEED_QUERY_KEY(params),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const feedResult = await getFeed({
        ...params,
        page: pageParam as number,
        limit,
      })

      // Filtre radius cote client (Haversine), identique a useFeed.
      if (radiusKm > 0 && userCoords) {
        feedResult.data = feedResult.data.filter((post: PostFeedItem) => {
          const lat = (post as unknown as { latitude: number | null }).latitude
          const lon = (post as unknown as { longitude: number | null }).longitude
          if (lat == null || lon == null) return false
          return haversineKm(userCoords.lat, userCoords.lon, lat, lon) <= radiusKm
        })
        feedResult.data = feedResult.data.slice(0, limit)
      }

      // Enrichissement reactions (identique a useFeed).
      if (feedResult.data.length > 0) {
        const postIds = feedResult.data.map((p) => p.id)
        const emptyReactions: Record<string, ReactionType> = {}
        const [userReactions, breakdown] = await Promise.all([
          userId ? getUserReactions(userId, postIds) : Promise.resolve(emptyReactions),
          getReactionsBreakdown(postIds),
        ])
        feedResult.data = feedResult.data.map((post) => ({
          ...post,
          user_reaction: userReactions[post.id] ?? null,
          reactions_breakdown: breakdown[post.id] ?? null,
        }))
      }

      return feedResult
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    // V1.1.4 NG-026 garde-fou memoire : cap a 10 pages = 200 posts max
    // simultanes en memoire. Au-dela, React Query libere les anciennes
    // pages (mais hasNextPage reste vrai donc l'user peut continuer).
    maxPages: 10,
    placeholderData: (prev) => prev,
  })

  // Flatten les pages en un seul array de posts pour le composant consommateur.
  const posts = (query.data?.pages ?? []).flatMap((p) => p.data)

  // V1.1.4 NG-026 : helper pour invalider en parallele les caches useFeed
  // (pagination classique) ET useInfiniteFeed (scroll infini). Utile si on
  // migre progressivement les composants.
  void queryClient
  void FEED_QUERY_KEY

  return {
    posts,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage()
    },
    isError: query.isError,
    refetch: () => {
      void query.refetch()
    },
  }
}
