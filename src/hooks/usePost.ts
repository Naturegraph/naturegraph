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
  getPostsByUser,
  toggleReaction,
  createPost,
  deletePost,
  updatePost,
  type CreatePostPayload,
} from '@/services/postService'
import type { PostFeedItem, ReactionType } from '@/types/database'

export const postQueryKey = {
  byId: (postId: string) => ['post', postId] as const,
  byUser: (userId: string, sort: 'recent' | 'popular') =>
    ['posts', 'by-user', userId, sort] as const,
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
 * Récupère les posts publiés par un utilisateur donné.
 * Utilisé sur la page Profil > onglet "Journal nature".
 *
 * Les posts retournés respectent la RLS (status='published' + visibility='public').
 * Si le hook est appelé pour le profil propriétaire, il pourrait à terme
 * accepter un flag `includeDrafts` pour aussi remonter les brouillons.
 */
export function useUserPosts(
  userId: string | undefined,
  sort: 'recent' | 'popular' = 'recent',
  limit = 20,
) {
  return useQuery<PostFeedItem[], Error>({
    queryKey: postQueryKey.byUser(userId ?? '', sort),
    queryFn: () => getPostsByUser(userId!, sort, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
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

              // Snapshot du breakdown actuel (immutable) — on incrémente/
              // décrémente uniquement les buckets concernés pour que
              // l'affichage des badges reflète immédiatement le changement
              // sans attendre l'invalidation serveur.
              const bd: Record<ReactionType, number> = {
                love: 0,
                admire: 0,
                fire: 0,
                wow: 0,
                curious: 0,
                disappointed: 0,
                ...(post.reactions_breakdown ?? {}),
              }

              if (currentReaction === null) {
                // Cas 1 : ajout d'une nouvelle réaction
                bd[type] = (bd[type] ?? 0) + 1
                return {
                  ...post,
                  likes_count: post.likes_count + 1,
                  user_reaction: type,
                  reactions_breakdown: bd,
                }
              } else if (currentReaction === type) {
                // Cas 2 : toggle off (même type)
                bd[type] = Math.max(0, (bd[type] ?? 0) - 1)
                return {
                  ...post,
                  likes_count: Math.max(0, post.likes_count - 1),
                  user_reaction: null,
                  reactions_breakdown: bd,
                }
              } else {
                // Cas 3 : changement de type (total inchangé, swap buckets)
                bd[currentReaction] = Math.max(0, (bd[currentReaction] ?? 0) - 1)
                bd[type] = (bd[type] ?? 0) + 1
                return { ...post, user_reaction: type, reactions_breakdown: bd }
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

/**
 * Mutation pour supprimer un post (avec invalidation cache feed).
 * Utilisé par DeleteConfirmModal.
 */
export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/**
 * Mutation pour modifier un post existant.
 * Utilisé par le formulaire d'édition (/contribute?edit=postId).
 */
export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: Partial<CreatePostPayload> }) =>
      updatePost(postId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: postQueryKey.byId(vars.postId) })
    },
  })
}
