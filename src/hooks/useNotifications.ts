/**
 * useNotifications : Hooks React Query + Realtime pour les notifications
 *
 * Ecoute les INSERT sur `notifications` via un channel `notif:${userId}`
 * et invalide la query pour refetch automatique.
 */

import { useEffect } from 'react'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listNotificationsPage,
  countUnread,
  markAsRead,
  markManyAsRead,
  markAllAsRead,
  deleteNotification,
  type NotificationType,
} from '@/services/notificationService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const notificationsQueryKey = (userId: string) => ['notifications', userId] as const
export const unreadCountQueryKey = (userId: string) => ['notifications', userId, 'unread'] as const

/**
 * Nombre de notifications chargees par page, et nombre maximum de pages
 * chargees automatiquement au scroll.
 *
 * 20 x 10 = 200 elements au plus en memoire. Au-dela, le chargement auto
 * s'arrete et un bouton explicite prend le relais : c'est le garde-fou
 * eco-conception impose par CLAUDE.md pour le scroll infini (NG-026).
 *
 * Pourquoi ce plafond plutot que l'option `maxPages` de React Query : celle-ci
 * exige un curseur bidirectionnel (getPreviousPageParam), que notre service
 * n'expose pas, et elle SUPPRIME les premieres pages quand le plafond est
 * atteint. L'utilisateur qui remonte verrait alors la liste se vider par le
 * haut. Un plafond dur borne la memoire sans ce defaut.
 */
export const NOTIF_PAGE_SIZE = 20
export const NOTIF_MAX_AUTO_PAGES = 10

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

/**
 * Abonnement Realtime aux nouvelles notifications.
 *
 * Extrait de useNotifications pour etre partage avec la version paginee :
 * sans ca, le panneau paginé aurait perdu le temps reel, ou pire, deux
 * abonnements concurrents auraient ete crees.
 */
function useNotificationsRealtime(userId: string | undefined) {
  const qc = useQueryClient()

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
}

/**
 * Liste paginee par curseur + filtre par type + Realtime.
 *
 * Utilisee par le panneau de la cloche, devenu le centre de notifications
 * complet. La cle de cache commence par ['notifications', userId], donc les
 * mutations existantes (lu, tout lu, supprime) l'invalident deja par prefixe :
 * rien a changer de ce cote.
 */
export function useNotificationsInfinite(
  userId: string | undefined,
  types: NotificationType[] | undefined,
) {
  useNotificationsRealtime(userId)

  // La cle inclut les types filtres : changer d'onglet change de cache, sans
  // melanger les listes.
  const cle = [...notificationsQueryKey(userId ?? ''), 'infinite', types?.join(',') ?? 'all']

  return useInfiniteQuery({
    queryKey: cle,
    enabled: !!userId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listNotificationsPage(userId!, { before: pageParam, limit: NOTIF_PAGE_SIZE, types }),
    getNextPageParam: (derniere) => derniere.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  })
}

/**
 * Compteur non lues, global (cloche) ou par sous-ensemble de types (badges
 * d'onglet echanges/reactions). Sans `types`, la cle de cache reste IDENTIQUE a
 * avant (la cloche n'est pas impactee) ; avec `types`, on suffixe la cle. Les
 * mutations invalident par prefixe `['notifications', userId, 'unread']`, donc
 * les deux variantes sont rafraichies ensemble.
 */
export function useUnreadCount(userId: string | undefined, types?: NotificationType[]) {
  const base = unreadCountQueryKey(userId ?? '')
  const key = types && types.length > 0 ? [...base, types.join(',')] : base
  return useQuery<number, Error>({
    queryKey: key,
    queryFn: () => countUnread(userId!, types),
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
