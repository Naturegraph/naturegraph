/**
 * useFeed — Hook React Query pour le feed principal
 *
 * Encapsule getFeed() derrière useQuery pour bénéficier du cache,
 * des états de chargement/erreur, et du refetch automatique.
 *
 * Enrichit chaque post avec user_reaction (la réaction de l'utilisateur connecté)
 * via un appel parallèle à getUserReactions.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFeed, getUserReactions, type FeedParams, type FeedResult } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'

/** Clé de cache React Query — permet l'invalidation ciblée post-contribution */
export const FEED_QUERY_KEY = (params: FeedParams) =>
  ['feed', params.tab ?? 'recent', params.page ?? 1, params.limit ?? 20] as const

/**
 * @param params - Paramètres de pagination et d'onglet
 * @param enabled - Permet de désactiver la query (ex: guest mode sans fetch)
 */
export function useFeed(params: FeedParams = {}, enabled = true) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery<FeedResult, Error>({
    queryKey: FEED_QUERY_KEY(params),
    queryFn: async () => {
      const feedResult = await getFeed(params)

      // Enrichir avec les réactions de l'utilisateur connecté
      if (userId && feedResult.data.length > 0) {
        const postIds = feedResult.data.map((p) => p.id)
        const reactions = await getUserReactions(userId, postIds)
        feedResult.data = feedResult.data.map((post) => ({
          ...post,
          user_reaction: reactions[post.id] ?? null,
        }))
      }

      return feedResult
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Invalide le cache du feed après une contribution.
 * À appeler depuis ContributeEncounterForm après createPost() réussi.
 */
export function useInvalidateFeed() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['feed'] })
}
