/**
 * useNotificationPreferences : React Query hook pour les préférences par type
 *
 * - Query : liste des rows persistées
 * - Helper `isEnabled(type)` : applique le défaut SQL si pas de row
 * - Mutation `set({ type, enabled })` : upsert optimiste
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listPreferences,
  setPreference,
  defaultEnabled,
  type NotificationPreference,
} from '@/services/notificationPreferencesService'
import type { NotificationType } from '@/services/notificationService'

export const notifPrefsQueryKey = (userId: string) => ['notification_preferences', userId] as const

export function useNotificationPreferences(userId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery<NotificationPreference[], Error>({
    queryKey: notifPrefsQueryKey(userId ?? ''),
    queryFn: () => listPreferences(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  })

  // Map type → enabled pour un lookup O(1)
  const map = useMemo(() => {
    const m = new Map<NotificationType, boolean>()
    for (const p of query.data ?? []) m.set(p.type, p.enabled)
    return m
  }, [query.data])

  /** État effectif (row persistée sinon défaut du type). */
  const isEnabled = (type: NotificationType): boolean =>
    map.has(type) ? !!map.get(type) : defaultEnabled(type)

  const mutation = useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) => {
      if (!userId) throw new Error('Utilisateur non connecte')
      return setPreference(userId, type, enabled)
    },
    // Optimiste : patch le cache immédiatement
    onMutate: async ({ type, enabled }) => {
      if (!userId) return
      const key = notifPrefsQueryKey(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<NotificationPreference[]>(key) ?? []
      const existing = prev.find((p) => p.type === type)
      const next = existing
        ? prev.map((p) => (p.type === type ? { ...p, enabled } : p))
        : [
            ...prev,
            {
              user_id: userId,
              type,
              enabled,
              updated_at: new Date().toISOString(),
            } as NotificationPreference,
          ]
      qc.setQueryData(key, next)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (!userId || !ctx) return
      qc.setQueryData(notifPrefsQueryKey(userId), ctx.prev)
    },
    onSettled: () => {
      if (!userId) return
      qc.invalidateQueries({ queryKey: notifPrefsQueryKey(userId) })
    },
  })

  return { query, isEnabled, set: mutation.mutate, isPending: mutation.isPending }
}
