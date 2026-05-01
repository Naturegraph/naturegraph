/**
 * useSavedPosts — Hooks React Query pour les posts sauvegardés
 *
 * Voir second-agent/13 et savedPostsService.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSavedPostIds, getSavedPosts, toggleSavedPost } from '@/services/savedPostsService'
import { useAuth } from '@/contexts/AuthContext'

const SAVED_IDS_KEY = (userId: string | undefined) => ['saved-post-ids', userId] as const
const SAVED_POSTS_KEY = (userId: string | undefined, page: number) =>
  ['saved-posts', userId, page] as const

/**
 * Liste des post_id sauvegardés par l'utilisateur connecté.
 * Utilisée par FeedPost pour savoir si un post est sauvegardé (lookup O(1)).
 */
export function useSavedPostIds() {
  const { user } = useAuth()
  return useQuery({
    queryKey: SAVED_IDS_KEY(user?.id),
    queryFn: () => getSavedPostIds(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Liste paginée des posts sauvegardés (avec join author + media).
 * Utilisée par l'onglet Collection du profil.
 */
export function useSavedPostsPage(page = 1, limit = 20) {
  const { user } = useAuth()
  return useQuery({
    queryKey: SAVED_POSTS_KEY(user?.id, page),
    queryFn: () => getSavedPosts(user!.id, page, limit),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  })
}

/**
 * Toggle save/unsave d'un post avec optimistic update.
 * Appelé par le bouton Sauvegarder du FeedPost.
 */
export function useToggleSavedPost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, currentlySaved }: { postId: string; currentlySaved: boolean }) => {
      if (!user?.id) throw new Error('Non authentifié')
      return toggleSavedPost(user.id, postId, currentlySaved)
    },
    onMutate: async ({ postId, currentlySaved }) => {
      // Optimistic update : on toggle l'id dans le cache des saved-ids
      await queryClient.cancelQueries({ queryKey: SAVED_IDS_KEY(user?.id) })
      const previous = queryClient.getQueryData<string[]>(SAVED_IDS_KEY(user?.id)) ?? []

      const next = currentlySaved ? previous.filter((id) => id !== postId) : [...previous, postId]
      queryClient.setQueryData(SAVED_IDS_KEY(user?.id), next)

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SAVED_IDS_KEY(user?.id), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_IDS_KEY(user?.id) })
      // La liste paginée est aussi invalidée pour refléter la suppression / l'ajout
      queryClient.invalidateQueries({ queryKey: ['saved-posts', user?.id] })
    },
  })
}
