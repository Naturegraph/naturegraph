/**
 * useHiddenPosts — Hook React Query pour les posts masqués
 *
 * Voir second-agent/22 et hiddenPostsService.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHiddenPostIds,
  getHiddenPostsWithData,
  hidePost,
  unhidePost,
  type HiddenPostRow,
} from '@/services/hiddenPostsService'
import { useAuth } from '@/contexts/AuthContext'

const HIDDEN_KEY = (userId: string | undefined) => ['hidden-post-ids', userId] as const
const HIDDEN_LIST_KEY = (userId: string | undefined) => ['hidden-posts-list', userId] as const

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
      queryClient.invalidateQueries({ queryKey: HIDDEN_LIST_KEY(user?.id) })
    },
  })
}

/**
 * Liste enrichie des posts masques pour SettingsHidden, avec preview + cover
 * + auteur. Pagine 50 par defaut cote serveur.
 */
export function useHiddenPostsList() {
  const { user } = useAuth()
  return useQuery<HiddenPostRow[]>({
    queryKey: HIDDEN_LIST_KEY(user?.id),
    queryFn: () => getHiddenPostsWithData(50),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  })
}

/**
 * Demasque un post (annule le hide). Optimistic UI sur la liste enrichie +
 * sur la liste d ids utilisee par le filtrage feed.
 */
export function useUnhidePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId }: { postId: string }) => unhidePost(postId),
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: HIDDEN_KEY(user?.id) })
      await queryClient.cancelQueries({ queryKey: HIDDEN_LIST_KEY(user?.id) })
      const previousIds = queryClient.getQueryData<string[]>(HIDDEN_KEY(user?.id)) ?? []
      const previousList =
        queryClient.getQueryData<HiddenPostRow[]>(HIDDEN_LIST_KEY(user?.id)) ?? []
      queryClient.setQueryData(
        HIDDEN_KEY(user?.id),
        previousIds.filter((id) => id !== postId),
      )
      queryClient.setQueryData(
        HIDDEN_LIST_KEY(user?.id),
        previousList.filter((row) => row.post_id !== postId),
      )
      return { previousIds, previousList }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousIds) queryClient.setQueryData(HIDDEN_KEY(user?.id), ctx.previousIds)
      if (ctx?.previousList) queryClient.setQueryData(HIDDEN_LIST_KEY(user?.id), ctx.previousList)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HIDDEN_KEY(user?.id) })
      queryClient.invalidateQueries({ queryKey: HIDDEN_LIST_KEY(user?.id) })
      // Le feed doit re-prendre en compte le post demasque
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}
