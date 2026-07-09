/**
 * useNotificationPreferences : React Query hook pour les préférences par type
 *
 * - Query : liste des rows persistées
 * - Helpers `isEnabled(type)` (cloche) / `isEmailEnabled(type)` (email) :
 *   appliquent le défaut SQL si pas de row
 * - Mutation `setChannels({ type, enabled, emailEnabled })` : upsert optimiste
 *   des DEUX canaux d'un type (couper un type coupe cloche + email)
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listPreferences,
  setPreferenceChannels,
  defaultEnabled,
  defaultEmailEnabled,
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

  // Maps type → canal pour un lookup O(1)
  const { enabledMap, emailMap } = useMemo(() => {
    const en = new Map<NotificationType, boolean>()
    const em = new Map<NotificationType, boolean>()
    for (const p of query.data ?? []) {
      en.set(p.type, p.enabled)
      em.set(p.type, p.email_enabled)
    }
    return { enabledMap: en, emailMap: em }
  }, [query.data])

  /** État cloche effectif (row persistée sinon défaut du type). */
  const isEnabled = (type: NotificationType): boolean =>
    enabledMap.has(type) ? !!enabledMap.get(type) : defaultEnabled(type)

  /** État email effectif (row persistée sinon défaut du type). */
  const isEmailEnabled = (type: NotificationType): boolean =>
    emailMap.has(type) ? !!emailMap.get(type) : defaultEmailEnabled(type)

  const mutation = useMutation({
    mutationFn: ({
      type,
      enabled,
      emailEnabled,
    }: {
      type: NotificationType
      enabled: boolean
      emailEnabled: boolean
    }) => {
      if (!userId) throw new Error('Utilisateur non connecte')
      return setPreferenceChannels(userId, type, enabled, emailEnabled)
    },
    // Optimiste : patch le cache immédiatement (les 2 canaux)
    onMutate: async ({ type, enabled, emailEnabled }) => {
      if (!userId) return
      const key = notifPrefsQueryKey(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<NotificationPreference[]>(key) ?? []
      const existing = prev.find((p) => p.type === type)
      const next = existing
        ? prev.map((p) => (p.type === type ? { ...p, enabled, email_enabled: emailEnabled } : p))
        : [
            ...prev,
            {
              user_id: userId,
              type,
              enabled,
              email_enabled: emailEnabled,
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

  return {
    query,
    isEnabled,
    isEmailEnabled,
    setChannels: mutation.mutate,
    isPending: mutation.isPending,
  }
}
