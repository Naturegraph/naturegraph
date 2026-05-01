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
