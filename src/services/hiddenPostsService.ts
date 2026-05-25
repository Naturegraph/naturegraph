/**
 * hiddenPostsService — Posts masqués individuellement par un utilisateur
 *
 * Différent du blocage user (`blocks`) : ici on masque juste un post précis,
 * pas tout l'auteur. Signal pour l'algo de feed (futur).
 *
 * Voir second-agent/22.
 */

import { supabase } from '@/lib/supabase'

/** IDs des posts masqués par l'user connecté (pour filtrer le feed). */
export async function getHiddenPostIds(): Promise<string[]> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('hidden_posts')
    .select('post_id')
    .eq('user_id', user.id)
  if (error) return []
  return (data ?? []).map((r) => r.post_id as string)
}

/**
 * Masque (ou démasque) un post. Idempotent.
 * @returns true si l'opération laisse le post masqué, false sinon
 */
export async function toggleHiddenPost(postId: string, currentlyHidden: boolean): Promise<boolean> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  if (currentlyHidden) {
    const { error } = await supabase
      .from('hidden_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
    if (error) throw new Error(error.message)
    return false
  }

  const { error } = await supabase
    .from('hidden_posts')
    .insert({ user_id: user.id, post_id: postId })
  if (error && error.code !== '23505') throw new Error(error.message)
  return true
}

/** Action one-shot — masquer un post (sans toggle). */
export async function hidePost(postId: string): Promise<void> {
  await toggleHiddenPost(postId, false)
}

/** Action one-shot, demasquer un post (annule le hide). */
export async function unhidePost(postId: string): Promise<void> {
  await toggleHiddenPost(postId, true)
}

// ─── Listing pour les Settings, posts enrichis ──────────────────────────────

/**
 * Ligne d affichage pour un post masque dans Settings to Confidentialite to
 * Publications masquees. Contient juste de quoi reconnaitre le post sans
 * payload lourd.
 */
export interface HiddenPostRow {
  post_id: string
  hidden_at: string
  /** Titre/description courte pour l identifier (premiere ligne, max 80 chars) */
  preview: string
  /** Image cover (premier media) servie en thumbnail Supabase */
  cover_url: string | null
  /** Auteur du post pour contexte */
  author_username: string
  author_avatar: string | null
}

/**
 * Recupere les posts masques par l user connecte avec metadata d affichage.
 * Pagine cote serveur (limit 50, ordre desc de masquage) pour eviter de tirer
 * des centaines de posts si l user a beaucoup masque.
 *
 * Note : si le post original a ete supprime, on filtre la ligne cote client
 * (post relation = null). On pourrait aussi nettoyer ces hidden_posts orphelins
 * via un job pg_cron (cf SUPABASE_PRO_ROADMAP.md, Phase B5).
 */
export async function getHiddenPostsWithData(limit = 50): Promise<HiddenPostRow[]> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('hidden_posts')
    .select(
      `
      post_id,
      created_at,
      post:posts!hidden_posts_post_id_fkey(
        description,
        author:profiles!posts_user_id_fkey(username, avatar_url),
        media(media_url, display_order)
      )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  type RawRow = {
    post_id: string
    created_at: string
    post: {
      description: string | null
      author: { username: string; avatar_url: string | null } | null
      media: Array<{ media_url: string; display_order: number }> | null
    } | null
  }

  return (data as unknown as RawRow[])
    .filter((row) => row.post !== null)
    .map((row) => {
      const cover = row.post!.media?.slice().sort((a, b) => a.display_order - b.display_order)[0]
      const description = row.post!.description ?? ''
      const preview = description.length > 80 ? `${description.slice(0, 80).trim()}…` : description
      return {
        post_id: row.post_id,
        hidden_at: row.created_at,
        preview: preview || 'Publication sans description',
        cover_url: cover?.media_url ?? null,
        author_username: row.post!.author?.username ?? 'utilisateur',
        author_avatar: row.post!.author?.avatar_url ?? null,
      }
    })
}
