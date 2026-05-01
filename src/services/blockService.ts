/**
 * blockService — Blocage d'utilisateurs
 *
 * Table `blocks` (migration 20260420) — RLS : on ne peut bloquer que pour
 * soi-même, le bloqué ne peut pas voir le profil/posts du bloqueur.
 *
 * Utilisé par "Masquer @user" du PostOptionsMenu (second-agent/12).
 */

import { supabase } from '@/lib/supabase'

/**
 * Bloque un utilisateur. Idempotent (PK unique).
 *
 * Effet : le profil + les posts du bloqué disparaissent du feed du bloqueur
 * (filtrage côté serveur via les RLS posts/profiles).
 */
export async function block(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  if (user.id === targetUserId) {
    throw new Error('On ne peut pas se bloquer soi-même')
  }

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: targetUserId })
  if (error && error.code !== '23505') throw new Error(error.message)
}

/** Annule un blocage. */
export async function unblock(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId)
  if (error) throw new Error(error.message)
}

/** Liste des userIds bloqués par l'user connecté (pour filtrage client si besoin). */
export async function getBlockedIds(): Promise<string[]> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
  return (data ?? []).map((r) => r.blocked_id as string)
}
