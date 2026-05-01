/**
 * useFollow — Hooks React Query pour suivre / ne plus suivre un user
 *
 * Voir second-agent/22.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isFollowing, follow, unfollow } from '@/services/followService'
import { useAuth } from '@/contexts/AuthContext'

const FOLLOW_KEY = (myId: string | undefined, targetId: string) =>
  ['is-following', myId, targetId] as const

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
    },
  })
}
