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
 * Gère 3 cas :
 *  1. Aucune réaction → ajout (likes_count +1, user_reaction = type)
 *  2. Même type → suppression (likes_count -1, user_reaction = null)
 *  3. Type différent → remplacement (likes_count inchangé, user_reaction = type)
 *
 * Rollback automatique en cas d'erreur serveur.
 */
type ToggleReactionVars = {
  postId: string
  type: ReactionType
  currentReaction: ReactionType | null
  feedQueryKey: readonly unknown[]
}
type ToggleReactionResult = { added: boolean; activeType: ReactionType | null }
type ToggleReactionContext = { previousData: unknown; feedQueryKey: readonly unknown[] }

export function useToggleReaction(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<ToggleReactionResult, Error, ToggleReactionVars, ToggleReactionContext>({
    mutationFn: ({ postId, type }) => {
      if (!userId) throw new Error('Utilisateur non connecté')
      return toggleReaction(postId, userId, type)
    },

    // Mise à jour optimiste selon le cas (ajout / suppression / changement)
    onMutate: async ({ postId, type, currentReaction, feedQueryKey }) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey as readonly unknown[] })

      const previousData = queryClient.getQueryData(feedQueryKey)

      queryClient.setQueryData(
        feedQueryKey,
        (old: { data: PostFeedItem[]; pagination: unknown } | undefined) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((post: PostFeedItem) => {
              if (post.id !== postId) return post

              if (currentReaction === null) {
                // Cas 1 : ajout d'une nouvelle réaction
                return { ...post, likes_count: post.likes_count + 1, user_reaction: type }
              } else if (currentReaction === type) {
                // Cas 2 : toggle off (même type)
                return {
                  ...post,
                  likes_count: Math.max(0, post.likes_count - 1),
                  user_reaction: null,
                }
              } else {
                // Cas 3 : changement de type (count inchangé, triggers font delete+insert)
                return { ...post, user_reaction: type }
              }
            }),
          }
        },
      )

      return { previousData, feedQueryKey }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.feedQueryKey, context.previousData)
      }
    },

    onSettled: (_data, _error, { feedQueryKey }) => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey as readonly unknown[] })
    },
  })
}

/**
 * Mutation pour créer un nouveau post.
 * Invalide le feed après succès pour que la nouvelle contribution apparaisse.
 */
export function useCreatePost(userId: string) {
  // NOTE : on n'invalide PAS le feed ici — les formulaires uploadent les
  // médias APRÈS createPost, donc une invalidation prématurée refetcherait
  // un post sans media et le mettrait en cache. L'invalidation doit être
  // déclenchée par le form après l'upload media (voir Contribute*Form).
  return useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(userId, payload),
  })
}
