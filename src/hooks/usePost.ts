/**
 * usePost : Hooks React Query pour les données post individuel
 *
 *  - usePost(postId)       : récupère un post par ID avec author + media
 *  - useToggleReaction()   : mutation optimiste pour les réactions
 *  - useCreatePost()       : mutation pour créer un post (sans upload média)
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  getPostById,
  getPostsByUser,
  getUserReactions,
  getReactionsBreakdown,
  toggleReaction,
  createPost,
  deletePost,
  updatePost,
  type CreatePostPayload,
} from '@/services/postService'
import type { PostFeedItem, ReactionType } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { invalidateFeeds } from '@/hooks/useFeed'
import { useToast } from '@/contexts/ToastContext'

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
/**
 * V1.1.4 NG-026 (Nicolas 2026-06-03) : variante scroll infini de
 * useUserPosts. Charge les posts d'un user page par page via React
 * Query useInfiniteQuery + getPostsByUser(offset, limit).
 *
 * Garde-fous CLAUDE.md (scroll infini autorise) :
 *  - Pagination backend (offset/limit Postgrest range())
 *  - maxPages: 10 (cap 200 posts max simultanes)
 *  - Enrichissement reactions par page (identique useUserPosts)
 */
export function useInfiniteUserPosts(
  userId: string | undefined,
  sort: 'recent' | 'popular' = 'recent',
  limit = 20,
) {
  const { user } = useAuth()
  const viewerId = user?.id

  const query = useInfiniteQuery<PostFeedItem[], Error>({
    queryKey: [...postQueryKey.byUser(userId ?? '', sort), viewerId ?? 'anon', 'infinite'],
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // V1.1.4 round 12 fix (Nicolas 2026-06-03) : on derive l'offset suivant
      // depuis lastPageParam (offset de la page courante) + limit, PAS depuis
      // allPages.length * limit. Avec maxPages: 10, allPages est plafonne a 10
      // entrees, donc allPages.length * limit se figeait a 200 et rechargeait
      // en boucle la meme page au-dela (loader infini). lastPageParam reste
      // l'offset reel de la derniere page chargee.
      if (lastPage.length < limit) return undefined
      return (lastPageParam as number) + limit
    },
    queryFn: async ({ pageParam }) => {
      const posts = await getPostsByUser(userId!, sort, limit, pageParam as number)
      if (posts.length === 0) return posts
      const postIds = posts.map((p) => p.id)
      const emptyReactions: Record<string, ReactionType> = {}
      const [userReactions, breakdown] = await Promise.all([
        viewerId ? getUserReactions(viewerId, postIds) : Promise.resolve(emptyReactions),
        getReactionsBreakdown(postIds),
      ])
      return posts.map((p) => ({
        ...p,
        user_reaction: userReactions[p.id] ?? null,
        reactions_breakdown: breakdown[p.id] ?? null,
      }))
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    maxPages: 10,
    // V1.1.4 round 12 fix : placeholderData retire (idem useInfiniteFeed).
  })

  // Flatten les pages pour usage direct dans le composant.
  const posts = (query.data?.pages ?? []).flat()

  // V1.1.4 round 12 : pas de useCallback manuel (React Compiler memoise).
  return {
    posts,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage()
    },
    isError: query.isError,
    refetch: () => {
      void query.refetch()
    },
  }
}

export function useUserPosts(
  userId: string | undefined,
  sort: 'recent' | 'popular' = 'recent',
  limit = 20,
) {
  // NG-001 (2026-05-31 retour QA Nicolas) : le profil n affichait aucune
  // reaction (ni les anciennes, ni les nouvelles). getPostsByUser ne
  // retournait pas user_reaction / reactions_breakdown, contrairement
  // a useFeed qui enrichit chaque post via 2 requetes parallel apres
  // fetch. On replique la meme logique ici pour avoir des reactions
  // pleinement fonctionnelles dans le profil.
  const { user } = useAuth()
  const viewerId = user?.id
  return useQuery<PostFeedItem[], Error>({
    queryKey: [...postQueryKey.byUser(userId ?? '', sort), viewerId ?? 'anon'],
    queryFn: async () => {
      const posts = await getPostsByUser(userId!, sort, limit)
      if (posts.length === 0) return posts
      const postIds = posts.map((p) => p.id)
      const emptyReactions: Record<string, ReactionType> = {}
      const [userReactions, breakdown] = await Promise.all([
        viewerId ? getUserReactions(viewerId, postIds) : Promise.resolve(emptyReactions),
        getReactionsBreakdown(postIds),
      ])
      return posts.map((p) => ({
        ...p,
        user_reaction: userReactions[p.id] ?? null,
        reactions_breakdown: breakdown[p.id] ?? null,
      }))
    },
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
  const toast = useToast()

  return useMutation<ToggleReactionResult, Error, ToggleReactionVars, ToggleReactionContext>({
    mutationKey: ['post', 'reaction'],
    mutationFn: ({ postId, type }) => {
      if (!userId) throw new Error('Utilisateur non connecté')
      return toggleReaction(postId, userId, type)
    },

    // Mise à jour optimiste selon le cas (ajout / suppression / changement).
    // Polymorphe : gere les 3 shapes de cache du produit :
    //   - useFeed         -> { data: PostFeedItem[], pagination: {...} }
    //   - useUserPosts    -> PostFeedItem[] (array nu)
    //   - usePost(postId) -> PostFeedItem (single)
    // Sans cette poly, l optimistic update silent fail sur profil/post detail
    // et le badge ne bouge que lors du refetch (UX "rien ne se passe").
    onMutate: async ({ postId, type, currentReaction, feedQueryKey }) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey as readonly unknown[] })

      const previousData = queryClient.getQueryData(feedQueryKey)

      function patchPost(post: PostFeedItem): PostFeedItem {
        if (post.id !== postId) return post
        const bd: Record<ReactionType, number> = {
          love: 0,
          admire: 0,
          fire: 0,
          wow: 0,
          curious: 0,
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
      }

      queryClient.setQueryData(feedQueryKey, (old: unknown) => {
        if (!old) return old
        // Shape 1 : array nu (useUserPosts)
        if (Array.isArray(old)) {
          return (old as PostFeedItem[]).map(patchPost)
        }
        // V1.1.4 NG-026 (Nicolas 2026-06-03) : shape 4, useInfiniteQuery
        // -> { pages: [{ data: [...], pagination: {...} }], pageParams: [...] }
        // On verifie AVANT shape 2 car { pages: [...] } a aussi un object,
        // mais pas de .data direct.
        if (
          typeof old === 'object' &&
          'pages' in old &&
          Array.isArray((old as { pages: unknown }).pages)
        ) {
          const typed = old as {
            pages: Array<{ data: PostFeedItem[]; pagination: unknown }>
            pageParams: unknown[]
          }
          return {
            ...typed,
            pages: typed.pages.map((p) => ({ ...p, data: p.data.map(patchPost) })),
          }
        }
        // Shape 2 : { data: [], pagination: ... } (useFeed)
        if (
          typeof old === 'object' &&
          'data' in old &&
          Array.isArray((old as { data: unknown }).data)
        ) {
          const typed = old as { data: PostFeedItem[]; pagination: unknown }
          return { ...typed, data: typed.data.map(patchPost) }
        }
        // Shape 3 : PostFeedItem single (usePost)
        if (typeof old === 'object' && 'id' in old) {
          return patchPost(old as PostFeedItem)
        }
        return old
      })

      return { previousData, feedQueryKey }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.feedQueryKey, context.previousData)
      }
      // Echec reel cote serveur : l'optimistic vient d'etre annule. On PREVIENT
      // (retour Nicolas 2026-08 : reactions "pas enregistrees" en silence).
      toast.error("Ta reaction n'a pas ete enregistree", 'Reessaie dans un instant.')
    },

    onSettled: (_data, _error, { feedQueryKey, postId }) => {
      // NG-001 (2026-05-31) : la reaction doit etre coherente entre TOUTES
      // les vues qui affichent ce post (feed, profil galerie, profil liste,
      // post detail). Sans cette invalidation globale, une reaction faite
      // dans le feed n etait pas visible dans le profil et vice versa.
      queryClient.invalidateQueries({ queryKey: feedQueryKey as readonly unknown[] })
      invalidateFeeds(queryClient)
      queryClient.invalidateQueries({ queryKey: ['posts', 'by-user'] })
      queryClient.invalidateQueries({ queryKey: postQueryKey.byId(postId) })
    },
  })
}

/**
 * Mutation pour créer un nouveau post.
 * Invalide le feed après succès pour que la nouvelle contribution apparaisse.
 */
export function useCreatePost(userId: string) {
  // NOTE : on n'invalide PAS le feed ici : les formulaires uploadent les
  // médias APRÈS createPost, donc une invalidation prématurée refetcherait
  // un post sans media et le mettrait en cache. L'invalidation doit être
  // déclenchée par le form après l'upload media (voir Contribute*Form).
  return useMutation({
    mutationKey: ['post', 'create'],
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
    mutationKey: ['post', 'delete'],
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_data, postId) => {
      // Invalider toutes les variantes du feed + le profil (galerie user).
      invalidateFeeds(queryClient)
      queryClient.invalidateQueries({ queryKey: ['posts', 'by-user'] })
      queryClient.invalidateQueries({ queryKey: postQueryKey.byId(postId) })
    },
    onError: (err) => {
      // Surfaçage explicite : sans ce log, un échec RLS / trigger / FK
      // restait totalement silencieux (Nicolas 2026-05-23 : delete instant
      // ne fonctionnait pas, aucune trace visible).
      console.error('[useDeletePost] échec suppression :', err)
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
    mutationKey: ['post', 'update'],
    mutationFn: ({ postId, payload }: { postId: string; payload: Partial<CreatePostPayload> }) =>
      updatePost(postId, payload),
    onSuccess: (_data, vars) => {
      invalidateFeeds(queryClient)
      queryClient.invalidateQueries({ queryKey: postQueryKey.byId(vars.postId) })
    },
  })
}
