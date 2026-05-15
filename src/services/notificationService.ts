/**
 * notificationService — Couche d'accès aux notifications
 *
 * Schema (table `notifications`) :
 *   id, user_id, type, title, body, reference_id, reference_type, read, created_at
 *
 * Realtime : channel `notif:${userId}` ecoute les INSERT pour ce user.
 * Voir useNotifications() pour le wiring React Query + Realtime.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export type NotificationType =
  | 'reaction'
  | 'follow'
  | 'post' // nouveau post d'un profil suivi (fan-out via trigger)
  | 'species_digest' // digest hebdo espèces (edge function cron)
  | 'comment'
  | 'mention'
  | 'identification'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string | null
  body: string | null
  reference_id: string | null
  reference_type: string | null
  read: boolean
  created_at: string
  /** Acteur (celui qui a déclenché la notif) — issu de la vue notifications_with_actor */
  actor_id: string | null
  actor_username: string | null
  actor_avatar_url: string | null
}

/** Liste les N dernieres notifications du user courant (vue enrichie avec actor). */
export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('notifications_with_actor')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Notification[]
}

/**
 * Liste paginée par curseur (created_at DESC).
 * `before` = ISO du plus ancien de la page précédente (ou undefined pour la première).
 * Retourne `items` + `nextCursor` (null si fin de liste).
 */
export async function listNotificationsPage(
  userId: string,
  opts: { before?: string; limit?: number; types?: NotificationType[] } = {},
): Promise<{ items: Notification[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 20
  if (!isSupabaseConfigured || !supabase) return { items: [], nextCursor: null }

  let q = supabase
    .from('notifications_with_actor')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (opts.before) q = q.lt('created_at', opts.before)
  if (opts.types && opts.types.length > 0) q = q.in('type', opts.types)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as Notification[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].created_at : null
  return { items, nextCursor }
}

/** Compte les notifications non lues. */
export async function countUnread(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Marque une notification comme lue. */
export async function markAsRead(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  if (error) throw new Error(error.message)
}

/**
 * Marque plusieurs notifications comme lues (mark-as-read groupé, BATCH 107).
 * Utilisé quand l'utilisateur clique sur une notif regroupée (ex: "Alice & Bob ont réagi")
 * pour marquer toutes les notifs sous-jacentes comme lues d'un coup.
 */
export async function markManyAsRead(notificationIds: string[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  if (notificationIds.length === 0) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', notificationIds)
  if (error) throw new Error(error.message)
}

/** Marque toutes les notifications du user comme lues. */
export async function markAllAsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(error.message)
}
