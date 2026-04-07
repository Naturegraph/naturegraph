/**
 * usePost — Hooks React Query pour les données post individuel
 *
 *  - usePost(postId)       : récupère un post par ID avec author + media
 *  - useToggleReaction()   : mutation optimiste pour les réactions
 *  - useCreatePost()       : mutation pour créer un post (sans upload média)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPostById,
  toggleReaction,
  createPost,
  type CreatePostPayload,
} from '@/services/postService'
import type { PostFeedItem, ReactionType } from '@/types/database'
import { FEED_QUERY_KEY } from './useFeed'

export const postQueryKey = {
  byId: (postId: string) => ['post', postId] as const,
}

/**
 * Récupère un post complet par son ID.
 * Utilisé sur la page de détail d'un post (/post/:id).
 */
export function usePost(postId: string | undefined) {
  return useQuery<PostFeedItem | null, Error>({
    queryKey: postQueryKey.byId(postId ?? ''),
    queryFn: () => getPostById(postId!),
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Mutation optimiste pour les réactions.
 *
 * Mise à jour immédiate du cache local avant la réponse serveur.
 * En cas d'erreur, rollback automatique vers l'état précédent.
 */
export function useToggleReaction(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<
    { added: boolean },
    Error,
    { postId: string; type: ReactionType; feedQueryKey: readonly unknown[] }
  >({
    mutationFn: ({ postId, type }) => {
      if (!userId) throw new Error('Utilisateur non connecté')
      return toggleReaction(postId, userId, type)
    },

    // Mise à jour optimiste : incrémente/décrémente likes_count immédiatement
    onMutate: async ({ postId, feedQueryKey }) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey as Parameters<typeof queryClient.cancelQueries>[0]['queryKey'] })

      const previousData = queryClient.getQueryData(feedQueryKey)

      queryClient.setQueryData(feedQueryKey, (old: { data: PostFeedItem[]; pagination: unknown } | undefined) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((post: PostFeedItem) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + 1 }
              : post,
          ),
        }
      })

      // Retourner le snapshot pour rollback en cas d'erreur
      return { previousData, feedQueryKey }
    },

    onError: (_err, _vars, context) => {
      // Rollback si la mutation échoue
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.feedQueryKey, context.previousData)
      }
    },

    onSettled: (_data, _error, { feedQueryKey }) => {
      // Toujours refetch pour synchroniser avec le serveur
      queryClient.invalidateQueries({ queryKey: feedQueryKey as Parameters<typeof queryClient.invalidateQueries>[0]['queryKey'] })
    },
  })
}

/**
 * Mutation pour créer un nouveau post.
 * Invalide le feed après succès pour que la nouvelle contribution apparaisse.
 */
export function useCreatePost(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(userId, payload),
    onSuccess: () => {
      // Invalider toutes les pages du feed pour forcer le refetch
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY({}) })
    },
  })
}
