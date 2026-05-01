/**
 * useFeed — Hook React Query pour le feed principal
 *
 * Encapsule getFeed() derrière useQuery pour bénéficier du cache,
 * des états de chargement/erreur, et du refetch automatique.
 *
 * Responsabilités additionnelles :
 *   - Enrichit chaque post avec user_reaction (réaction de l'utilisateur connecté)
 *   - Applique le filtre de rayon géographique CÔTÉ CLIENT via Haversine
 *     (PostgREST n'expose pas ST_DWithin — un RPC dédié sera créé en v2)
 *
 * Clé de cache : inclut tab + page + limit + sérialisation des filtres pour
 * invalidation ciblée quand n'importe quel filtre change.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFeed, getUserReactions, type FeedParams, type FeedResult } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import type { PostFeedItem } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Distance Haversine en km entre deux points GPS.
 * Rayon Terre = 6371 km. Approximation sphérique suffisante pour un filtre UI.
 */
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

/**
 * Sérialisation stable des filtres pour utilisation comme clé de cache.
 * Deux objets ayant les mêmes valeurs → même clé (ordre des clés déterministe).
 */
function serializeFilters(filters?: FeedParams['filters']): string {
  if (!filters) return '{}'
  return JSON.stringify({
    categories: [...(filters.categories ?? [])].sort(),
    helpOnly: filters.helpOnly ?? false,
    shareTypes: filters.shareTypes ?? null,
    period: filters.period ?? 'all',
    radiusKm: filters.radiusKm ?? 0,
  })
}

/** Clé de cache React Query — permet l'invalidation ciblée post-contribution */
export const FEED_QUERY_KEY = (params: FeedParams) =>
  [
    'feed',
    params.tab ?? 'recent',
    params.page ?? 1,
    params.limit ?? 20,
    serializeFilters(params.filters),
    // currentUserId inclus pour que le tab 'for_you' invalide quand l'user
    // change (login/logout). Pas critique sinon.
    params.currentUserId ?? '',
  ] as const

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * @param params  Paramètres de pagination + onglet + filtres
 * @param userCoords Coordonnées GPS de l'utilisateur pour filtre radius (optionnel)
 * @param enabled Permet de désactiver la query (guest mode)
 */
export function useFeed(
  params: FeedParams = {},
  userCoords?: { lat: number; lon: number } | null,
  enabled = true,
) {
  const { user } = useAuth()
  const userId = user?.id
  const radiusKm = params.filters?.radiusKm ?? 0

  return useQuery<FeedResult, Error>({
    queryKey: FEED_QUERY_KEY(params),
    queryFn: async () => {
      const feedResult = await getFeed(params)

      // ── Filtre radius côté client (Haversine) ─────────────────────────
      // Appliqué seulement si radius > 0 ET coordonnées disponibles.
      // Les posts sans lat/lon sont exclus du résultat quand le filtre est actif.
      if (radiusKm > 0 && userCoords) {
        feedResult.data = feedResult.data.filter((post: PostFeedItem) => {
          const lat = (post as unknown as { latitude: number | null }).latitude
          const lon = (post as unknown as { longitude: number | null }).longitude
          if (lat == null || lon == null) return false
          return haversineKm(userCoords.lat, userCoords.lon, lat, lon) <= radiusKm
        })
        // Tronquer au limit demandé (postService a sur-fetché pour compenser)
        const limit = params.limit ?? 20
        feedResult.data = feedResult.data.slice(0, limit)
        // Recalculer la pagination pour refléter le résultat filtré
        feedResult.pagination = {
          ...feedResult.pagination,
          total: feedResult.data.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        }
      }

      // ── Enrichissement réactions utilisateur connecté ────────────────
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
