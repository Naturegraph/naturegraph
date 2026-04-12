/**
 * useSettings — React Query wrapper pour user_settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettings,
  updateSettings,
  type UserSettings,
  type UserSettingsUpdate,
} from '@/services/settingsService'

export const settingsQueryKey = (userId: string) => ['settings', userId] as const

export function useSettings(userId: string | undefined) {
  return useQuery<UserSettings | null, Error>({
    queryKey: settingsQueryKey(userId ?? ''),
    queryFn: () => getSettings(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettings(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: UserSettingsUpdate) => {
      if (!userId) throw new Error('Utilisateur non connecte')
      return updateSettings(userId, patch)
    },
    onSuccess: (data) => {
      if (!userId) return
      qc.setQueryData(settingsQueryKey(userId), data)
    },
  })
}
