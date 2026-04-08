/**
 * useComments — Hooks React Query pour les commentaires d'un post
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getComments, createComment, deleteComment, type Comment } from '@/services/commentService'

export const commentsQueryKey = (postId: string) => ['comments', postId] as const

/** Liste des commentaires d'un post. */
export function useComments(postId: string | undefined) {
  return useQuery<Comment[], Error>({
    queryKey: commentsQueryKey(postId ?? ''),
    queryFn: () => getComments(postId!),
    enabled: !!postId,
    staleTime: 30 * 1000,
  })
}

/** Mutation pour creer un commentaire. Invalide la liste + le post. */
export function useCreateComment(postId: string, userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!userId) throw new Error('Utilisateur non connecte')
      return createComment(postId, userId, content)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsQueryKey(postId) })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/** Mutation pour supprimer un commentaire. */
export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsQueryKey(postId) })
    },
  })
}
