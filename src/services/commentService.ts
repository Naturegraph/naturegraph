/**
 * commentService — Couche d'accès aux commentaires
 *
 * Schema cible (table `comments`) :
 *   id, post_id, user_id, content, created_at, updated_at
 *
 * Le compteur posts.comments_count est maintenu par trigger PostgreSQL.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string | null
  author?: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

const COMMENT_SELECT = `
  id, post_id, user_id, content, created_at, updated_at,
  author:profiles!user_id(id, username, first_name, last_name, avatar_url)
` as const

/** Liste les commentaires d'un post, du plus ancien au plus recent. */
export async function getComments(postId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Comment[]
}

/** Cree un nouveau commentaire. */
export async function createComment(
  postId: string,
  userId: string,
  content: string,
): Promise<Comment> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('createComment : non disponible en mode demo')
  }
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > 1000) {
    throw new Error('Contenu invalide (1-1000 caracteres)')
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content: trimmed })
    .select(COMMENT_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as Comment
}

/** Supprime un commentaire (RLS : owner-only). */
export async function deleteComment(commentId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error(error.message)
}
