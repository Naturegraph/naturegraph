/**
 * useHiddenPosts — Hook React Query pour les posts masqués
 *
 * Voir second-agent/22 et hiddenPostsService.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHiddenPostIds, hidePost } from '@/services/hiddenPostsService'
import { useAuth } from '@/contexts/AuthContext'

const HIDDEN_KEY = (userId: string | undefined) => ['hidden-post-ids', userId] as const

export function useHiddenPostIds() {
  const { user } = useAuth()
  return useQuery({
    queryKey: HIDDEN_KEY(user?.id),
    queryFn: () => getHiddenPostIds(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useHidePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId }: { postId: string }) => hidePost(postId),
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: HIDDEN_KEY(user?.id) })
      const previous = queryClient.getQueryData<string[]>(HIDDEN_KEY(user?.id)) ?? []
      queryClient.setQueryData(HIDDEN_KEY(user?.id), [...previous, postId])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(HIDDEN_KEY(user?.id), ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HIDDEN_KEY(user?.id) })
    },
  })
}
