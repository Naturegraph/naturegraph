/**
 * useFeed — Hook React Query pour le feed principal
 *
 * Encapsule getFeed() derrière useQuery pour bénéficier du cache,
 * des états de chargement/erreur, et du refetch automatique.
 *
 * Utilisé par FeedSection pour remplacer le filtrage mockPosts côté client.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFeed, type FeedParams, type FeedResult } from '@/services/postService'

/** Clé de cache React Query — permet l'invalidation ciblée post-contribution */
export const FEED_QUERY_KEY = (params: FeedParams) =>
  ['feed', params.tab ?? 'recent', params.page ?? 1, params.limit ?? 20] as const

/**
 * @param params - Paramètres de pagination et d'onglet
 * @param enabled - Permet de désactiver la query (ex: guest mode sans fetch)
 */
export function useFeed(params: FeedParams = {}, enabled = true) {
  return useQuery<FeedResult, Error>({
    queryKey: FEED_QUERY_KEY(params),
    queryFn: () => getFeed(params),
    enabled,
    // Le feed reste frais 2 minutes — équilibre fraîcheur et requêtes réseau
    staleTime: 2 * 60 * 1000,
    // Garde les données précédentes visibles pendant le chargement de la nouvelle page
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
