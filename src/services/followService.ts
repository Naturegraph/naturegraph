/**
 * followService — Suivi d'utilisateurs
 *
 * Table `follows` — RLS : on ne peut suivre que pour soi-même.
 * Utilisé par les boutons Follow / Unfollow et par "Ne plus suivre" du
 * PostOptionsMenu (second-agent/12).
 */

import { supabase } from '@/lib/supabase'

/**
 * Suit un utilisateur. Idempotent : si déjà suivi, ne fait rien (PK unique).
 */
export async function follow(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })
  // 23505 = duplicate PK = on ignore (déjà suivi)
  if (error && error.code !== '23505') throw new Error(error.message)
}

/**
 * Arrête de suivre un utilisateur. Idempotent : aucun effet si pas suivi.
 */
export async function unfollow(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
  if (error) throw new Error(error.message)
}

/**
 * Indique si l'user connecté suit déjà la cible.
 * Retourne false si l'user n'est pas authentifié.
 */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  if (!supabase) return false
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()
  if (error) return false
  return !!data
}
