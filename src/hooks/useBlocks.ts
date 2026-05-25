/**
 * useBlocks, Hooks React Query pour le blocage d utilisateurs
 *
 * - useBlockedUsers : liste des users bloques par l user connecte, avec
 *   leur profil minimal (username + avatar). Utilise dans SettingsBlocked.
 * - useBlock : bloque un user, optimistic UI + invalidation feed.
 * - useUnblock : annule un blocage, optimistic UI + invalidation feed.
 *
 * Cle React Query : ['blocked-users', userId]. Les hooks qui filtrent le
 * feed (useFeed, useProfile) doivent invalider cette cle pour rafraichir
 * apres un block/unblock.
 *
 * Note RLS : les operations passent par les services qui derivent l user
 * authentifie via supabase.auth.getUser(), donc impossible de bloquer/
 * debloquer au nom d un autre user.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  block,
  unblock,
  getBlockedUsersWithProfile,
  type BlockedUserRow,
} from '@/services/blockService'

const BLOCKED_KEY = (userId: string | undefined) => ['blocked-users', userId] as const

/** Liste enrichie des users bloques (pour SettingsBlocked). */
export function useBlockedUsers() {
  const { user } = useAuth()
  return useQuery<BlockedUserRow[]>({
    queryKey: BLOCKED_KEY(user?.id),
    queryFn: getBlockedUsersWithProfile,
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 min, le blocage evolue peu
  })
}

/** Hook de blocage avec invalidation feed/profile. */
export function useBlock() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (targetUserId: string) => block(targetUserId),
    onSuccess: () => {
      // Invalide la liste pour rafraichir l UI Settings, + feeds qui
      // filtrent par blocked_ids pour faire disparaitre les posts du bloque.
      qc.invalidateQueries({ queryKey: BLOCKED_KEY(user?.id) })
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

/** Hook de deblocage avec optimistic UI sur la liste Settings. */
export function useUnblock() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (targetUserId: string) => unblock(targetUserId),
    onMutate: async (targetUserId) => {
      await qc.cancelQueries({ queryKey: BLOCKED_KEY(user?.id) })
      const previous = qc.getQueryData<BlockedUserRow[]>(BLOCKED_KEY(user?.id)) ?? []
      qc.setQueryData(
        BLOCKED_KEY(user?.id),
        previous.filter((row) => row.user_id !== targetUserId),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      // Rollback si le serveur a rejete (RLS, deja debloque, etc.)
      if (ctx?.previous) qc.setQueryData(BLOCKED_KEY(user?.id), ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: BLOCKED_KEY(user?.id) })
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
