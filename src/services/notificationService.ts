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
}

/** Liste les N dernieres notifications du user courant. */
export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Notification[]
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
