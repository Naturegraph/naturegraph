/**
 * savedPostsService : Posts sauvegardés (favoris privés)
 *
 * Table `saved_posts` (migration 20260501) : RLS user-scoped en lecture/écriture.
 * Utilisé par le bouton Sauvegarder du FeedPost (second-agent/13) et par
 * l'onglet Collection du profil utilisateur (à venir).
 */

import { supabase } from '@/lib/supabase'
import type { PostFeedItem } from '@/types/database'

const POST_FEED_SELECT = `
  *,
  author:profiles!user_id(id, username, first_name, last_name, avatar_url, interests),
  media(id, post_id, user_id, type, format, orientation, status, url, thumbnail_url,
        original_url, display_order, alt, width, height, file_size, mime_type,
        is_cover, license, created_at, updated_at)
` as const

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Retourne la liste des post_id sauvegardés par l'utilisateur connecté.
 * Lookup O(1) côté React via Set ou Array.includes pour l'état du bouton.
 */
export async function getSavedPostIds(userId: string): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId)
  if (error) return []
  return (data ?? []).map((r) => r.post_id as string)
}

/**
 * Retourne les posts sauvegardés (avec join author + media) pour la page profil.
 * Triés par date de sauvegarde DESC (le plus récent en premier).
 */
export async function getSavedPosts(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{
  data: PostFeedItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}> {
  if (!supabase) {
    return {
      data: [],
      pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrevious: false },
    }
  }

  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('saved_posts')
    .select(`saved_at, post:posts(${POST_FEED_SELECT})`, { count: 'exact' })
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(error.message)

  // Le shape retourné par PostgREST inclut `user_reaction` côté serveur via la
  // vue/RPC dédiée, mais quand on join via `post:posts(...)`, on récupère un
  // Post brut (sans user_reaction). On cast via `unknown` pour absorber la
  // différence puis on enrichit côté hook (useFeed) si besoin.
  const posts: PostFeedItem[] = (data ?? [])
    .map((row) => (row as unknown as { post: PostFeedItem | null }).post)
    .filter((p): p is PostFeedItem => !!p)

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: posts,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  }
}

/**
 * Toggle save/unsave optimiste.
 * Si déjà sauvegardé → DELETE, sinon → INSERT.
 * Retourne le nouvel état (true = sauvegardé après l'opération).
 */
export async function toggleSavedPost(
  userId: string,
  postId: string,
  currentlySaved: boolean,
): Promise<boolean> {
  if (!supabase) throw new Error('Supabase non configuré')

  if (currentlySaved) {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    if (error) throw new Error(error.message)
    return false
  }

  const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
  if (error) throw new Error(error.message)
  return true
}
