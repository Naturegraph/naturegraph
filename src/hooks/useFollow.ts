/**
 * useFollow — Hooks React Query pour suivre / ne plus suivre un user
 *
 * Voir second-agent/22.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  isFollowing,
  follow,
  unfollow,
  getFollowers,
  getFollowing,
  type CommunityProfile,
} from '@/services/followService'
import { useAuth } from '@/contexts/AuthContext'

const FOLLOW_KEY = (myId: string | undefined, targetId: string) =>
  ['is-following', myId, targetId] as const

const FOLLOWERS_KEY = (userId: string) => ['followers', userId] as const
const FOLLOWING_KEY = (userId: string) => ['following', userId] as const

/**
 * Liste les followers (migrateurs) d'un profil.
 * Utilisé par ProfileCommunity > onglet "Migrateurs".
 */
export function useFollowers(userId: string | undefined) {
  return useQuery<CommunityProfile[], Error>({
    queryKey: FOLLOWERS_KEY(userId ?? ''),
    queryFn: () => getFollowers(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

/**
 * Liste les profils suivis (migrations) par un profil.
 * Utilisé par ProfileCommunity > onglet "Migrations".
 */
export function useFollowing(userId: string | undefined) {
  return useQuery<CommunityProfile[], Error>({
    queryKey: FOLLOWING_KEY(userId ?? ''),
    queryFn: () => getFollowing(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

/** Indique si l'user connecté suit déjà la cible. */
export function useIsFollowing(targetUserId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: FOLLOW_KEY(user?.id, targetUserId ?? ''),
    queryFn: () => isFollowing(targetUserId!),
    enabled: !!user?.id && !!targetUserId,
    staleTime: 60 * 1000,
  })
}

/**
 * Toggle follow/unfollow d'un user avec optimistic update.
 */
export function useToggleFollow() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      targetUserId,
      currentlyFollowing,
    }: {
      targetUserId: string
      currentlyFollowing: boolean
    }) => (currentlyFollowing ? unfollow(targetUserId) : follow(targetUserId)),
    onMutate: async ({ targetUserId, currentlyFollowing }) => {
      const key = FOLLOW_KEY(user?.id, targetUserId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<boolean>(key)
      queryClient.setQueryData(key, !currentlyFollowing)
      return { previous, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous)
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_KEY(user?.id, vars.targetUserId) })
      // Invalide les listes "Migrateurs / Migrations" partout : la cible voit
      // ses followers évoluer + l'user connecté voit sa propre liste de
      // following bouger. Pas de filtrage fin par userId pour rester simple.
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
  })
}
