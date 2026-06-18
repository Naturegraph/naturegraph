/**
 * blockService : Blocage d'utilisateurs
 *
 * Table `blocks` (migration 20260420) : RLS : on ne peut bloquer que pour
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

// ─── Listing pour les Settings, profils enrichis ─────────────────────────────

/**
 * Profil minimal d un user bloque, suffisant pour l affichage dans
 * SettingsBlocked. On ne joint que les colonnes utilisees (avatar, username,
 * created_at du blocage) pour limiter le payload.
 */
export interface BlockedUserRow {
  /** Id du user bloque (target) */
  user_id: string
  username: string
  avatar_url: string | null
  /** Date du blocage, pour info dans l UI */
  blocked_at: string
}

/**
 * Recupere la liste enrichie des users bloques par l user connecte avec leur
 * profil minimal (username + avatar). Utilise pour l ecran Settings to Confidentialite to
 * Comptes bloques.
 *
 * Si la jointure RLS profiles cache un user (profil prive ou supprime), il
 * apparaitra sans username/avatar. On garde quand meme la ligne dans la liste
 * pour que l action de deblocage reste disponible.
 */
export async function getBlockedUsersWithProfile(): Promise<BlockedUserRow[]> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(username, avatar_url)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  // Mapping defensif, certains user peuvent avoir un profil supprime apres
  // le blocage. On normalise pour l UI.
  return data.map((row) => {
    const profile = (
      row as unknown as { blocked: { username: string; avatar_url: string | null } | null }
    ).blocked
    return {
      user_id: row.blocked_id as string,
      username: profile?.username ?? '',
      avatar_url: profile?.avatar_url ?? null,
      blocked_at: row.created_at as string,
    }
  })
}
