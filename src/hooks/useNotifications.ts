/**
 * useNotifications : Hooks React Query + Realtime pour les notifications
 *
 * Ecoute les INSERT sur `notifications` via un channel `notif:${userId}`
 * et invalide la query pour refetch automatique.
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listNotifications,
  countUnread,
  markAsRead,
  markManyAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/services/notificationService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const notificationsQueryKey = (userId: string) => ['notifications', userId] as const
export const unreadCountQueryKey = (userId: string) => ['notifications', userId, 'unread'] as const

/**
 * Compteur module-level : garantit un topic de canal Realtime UNIQUE par
 * abonnement (et pas seulement par userId).
 *
 * Bug prod 2026-06-12 : la cloche notifications crashait avec
 * "cannot add `postgres_changes` callbacks for realtime:notif:<id> after
 * `subscribe()`". Cause : HomeNavbar monte DEUX `NotificationsPanel` (desktop +
 * mobile) gates par le meme etat, tous deux presents dans le DOM (masques par
 * CSS, mais montes cote React). Chacun appelle useNotifications(userId) et
 * creait le meme canal `notif:${userId}`. Le client Supabase dedupe les canaux
 * par topic : la 2e instance recuperait un canal deja `subscribe()`, et son
 * `.on('postgres_changes')` jetait (comportement devenu strict depuis
 * @supabase/supabase-js >= 2.108). Un suffixe unique par abonnement supprime
 * toute collision sans changer le filtre (toujours sur user_id).
 */
let realtimeSubSeq = 0

/** Liste des notifications du user + subscription Realtime. */
export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery<Notification[], Error>({
    queryKey: notificationsQueryKey(userId ?? ''),
    queryFn: () => listNotifications(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return
    // Topic unique par abonnement -> jamais de reutilisation d'un canal deja
    // souscrit (cf. note sur realtimeSubSeq ci-dessus).
    realtimeSubSeq += 1
    const channel = supabase
      .channel(`notif:${userId}:${realtimeSubSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) })
          qc.invalidateQueries({ queryKey: unreadCountQueryKey(userId) })
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId, qc])

  return query
}

/** Compteur non lues. */
export function useUnreadCount(userId: string | undefined) {
  return useQuery<number, Error>({
    queryKey: unreadCountQueryKey(userId ?? ''),
    queryFn: () => countUnread(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/** Marque une notification lue. */
export function useMarkAsRead(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      if (!userId) return
      qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) })
      qc.invalidateQueries({ queryKey: unreadCountQueryKey(userId) })
    },
  })
}

/**
 * Marque plusieurs notifs lues en un appel (BATCH 107).
 * Utilisé pour les notifs regroupées : on marque tous les IDs du groupe d'un coup.
 */
export function useMarkManyAsRead(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notificationIds: string[]) => markManyAsRead(notificationIds),
    onSuccess: () => {
      if (!userId) return
      qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) })
      qc.invalidateQueries({ queryKey: unreadCountQueryKey(userId) })
    },
  })
}

/**
 * Supprime une notification : invalide la liste pour refresh immédiat.
 * Utilisé par le swipe-to-delete du NotificationsPanel.
 */
export function useDeleteNotification(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      if (!userId) return
      qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) })
      qc.invalidateQueries({ queryKey: unreadCountQueryKey(userId) })
    },
  })
}

/** Marque toutes lues. */
export function useMarkAllAsRead(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Utilisateur non connecte')
      return markAllAsRead(userId)
    },
    onSuccess: () => {
      if (!userId) return
      qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) })
      qc.invalidateQueries({ queryKey: unreadCountQueryKey(userId) })
    },
  })
}
