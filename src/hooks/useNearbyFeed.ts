/**
 * useNearbyFeed — Feed géolocalisé via RPC nearby_posts
 * ======================================================
 * Charge les posts dans le rayon déclaré par l'utilisateur courant.
 * Utilise la RPC Supabase nearby_posts (SECURITY DEFINER) pour que
 * location_point ne soit jamais exposé côté client.
 *
 * Fallback : si l'utilisateur n'est pas localisé, retourne null
 * (le composant affiche alors un CTA pour activer la localisation).
 *
 * Éco-conception :
 *   - Paginator max 20 items (conforme GUIDELINES.md)
 *   - staleTime 2 min (même que le feed standard)
 *   - Disabled si pas de localisation (évite la requête inutile)
 */

import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import type { PostFeedItem } from '@/types/database'
import { getFeed } from '@/services/postService'

// ─── Clé de cache ─────────────────────────────────────────────

export const NEARBY_FEED_QUERY_KEY = (userId: string, page: number) =>
  ['feed', 'nearby', userId, page] as const

// ─── Types ────────────────────────────────────────────────────

interface NearbyFeedResult {
  data: PostFeedItem[]
  total: number
  hasMore: boolean
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Feed géolocalisé pour le tab "Près de moi".
 *
 * @param page - Page courante (pagination, défaut 1)
 */
export function useNearbyFeed(page = 1) {
  const { user } = useAuth()
  const { isLocalized } = useLocation()
  const limit = 20

  return useQuery<NearbyFeedResult, Error>({
    queryKey: NEARBY_FEED_QUERY_KEY(user?.id ?? '', page),
    queryFn: async (): Promise<NearbyFeedResult> => {
      if (!user?.id || !supabase || !isSupabaseConfigured) {
        // Mode démo — fallback sur le feed standard
        const fallback = await getFeed({ tab: 'recent', page, limit })
        return {
          data: fallback.data,
          total: fallback.pagination.total,
          hasMore: fallback.pagination.hasNext,
        }
      }

      // 1. Récupère les IDs de posts dans le rayon via RPC
      // RPC non encore dans supabase.ts généré — cast any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: nearbyData, error } = await (supabase as any).rpc('nearby_posts', {
        requesting_user_id: user.id,
        result_limit: limit,
        result_offset: (page - 1) * limit,
      })

      if (error) throw error

      const postIds = (nearbyData ?? []).map(
        (row: { post_id: string; distance_km: number }) => row.post_id,
      )

      if (postIds.length === 0) {
        return { data: [], total: 0, hasMore: false }
      }

      // 2. Charge les détails des posts avec jointure author + media
      //
      // Lecture via `posts_public` (cf. Fix #2 et migration
      // `20260503_posts_public_view.sql`) qui masque latitude/longitude/city
      // quand `location_hidden=true` pour les non-propriétaires. Le filtre
      // radius PostGIS s'applique en amont (RPC nearby) sur la table `posts`
      // (avec coords floutées par le trigger `blur_hidden_location`), puis
      // on charge les détails enrichis via la vue.
      // Cast `any` temporaire — `posts_public` sera dans `supabase.ts`
      // après régénération des types post-application de la migration.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: posts, error: postsError } = await (supabase as any)
        .from('posts_public')
        .select(
          `
          *,
          author:profiles!user_id(id, username, first_name, last_name, avatar_url),
          media(*)
        `,
        )
        .in('id', postIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (postsError) throw postsError

      // 3. Enrichir avec les réactions de l'utilisateur courant

      let enrichedPosts = (posts ?? []) as unknown as PostFeedItem[]
      if (user?.id && enrichedPosts.length > 0) {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('post_id, type')
          .eq('user_id', user.id)
          .in('post_id', postIds)

        const reactionMap = Object.fromEntries(
          (reactions ?? []).map((r: { post_id: string; type: string }) => [r.post_id, r.type]),
        )

        enrichedPosts = enrichedPosts.map((post) => ({
          ...post,
          user_reaction: (reactionMap[post.id] ?? null) as PostFeedItem['user_reaction'],
        }))
      }

      return {
        data: enrichedPosts,
        total: enrichedPosts.length,
        hasMore: enrichedPosts.length === limit,
      }
    },
    // Ne charger que si l'utilisateur est localisé et authentifié
    enabled: !!user?.id && isLocalized,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}
