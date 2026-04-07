/**
 * useProfile — Hooks React Query pour les données profil
 *
 * Trois variantes :
 *  - useProfile(userId)          : profil par ID (page Home, sidebar)
 *  - useProfileByUsername(slug)  : profil par username (page /profile/:username)
 *  - useUpdateProfile()          : mutation pour mettre à jour le profil
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfileById,
  getProfileByUsername,
  updateProfile,
  type UpdateProfilePayload,
} from '@/services/profileService'
import type { Profile } from '@/types/database'

/** Clés de cache — permettent l'invalidation croisée (update → refresh sidebar) */
export const profileQueryKey = {
  byId: (userId: string) => ['profile', 'id', userId] as const,
  byUsername: (username: string) => ['profile', 'username', username] as const,
}

/**
 * Récupère un profil par ID utilisateur.
 * Typiquement utilisé pour le profil de l'utilisateur connecté (sidebar, settings).
 */
export function useProfile(userId: string | undefined) {
  return useQuery<Profile | null, Error>({
    queryKey: profileQueryKey.byId(userId ?? ''),
    queryFn: () => getProfileById(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes — les profils changent rarement
  })
}

/**
 * Récupère un profil par son username.
 * Utilisé sur la page /profile/:username.
 */
export function useProfileByUsername(username: string | undefined) {
  return useQuery<Profile | null, Error>({
    queryKey: profileQueryKey.byUsername(username ?? ''),
    queryFn: () => getProfileByUsername(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Mutation pour mettre à jour le profil courant.
 * Invalide automatiquement le cache par ID et par username après succès.
 */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<Profile, Error, UpdateProfilePayload>({
    mutationFn: (payload) => updateProfile(userId, payload),
    onSuccess: (updatedProfile) => {
      // Mettre à jour le cache sans refetch réseau
      queryClient.setQueryData(profileQueryKey.byId(userId), updatedProfile)
      queryClient.setQueryData(
        profileQueryKey.byUsername(updatedProfile.username),
        updatedProfile,
      )
    },
  })
}
