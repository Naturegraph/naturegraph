/**
 * useIsAdmin — Verifie si le user courant est un admin
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 + BATCH 31
 *
 * Lit la row dans `admin_users` correspondant a l'`auth.uid()` courant.
 * RLS policy "admins_read_admin_users" autorise SELECT pour tout admin.
 *
 * Cache React Query 5 min (`staleTime: 5 * 60 * 1000`) — invalide au login.
 *
 * @returns { isAdmin, isLoading, adminUser, role }
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type AdminRole = 'super_admin' | 'moderator' | 'support'

export interface AdminUserRow {
  id: string
  user_id: string
  role: AdminRole
  is_active: boolean
  created_at: string
  notes: string | null
}

export function useIsAdmin() {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery<AdminUserRow | null>({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      if (!supabase || !userId) return null
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, role, is_active, created_at, notes')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !data) return null
      return data as unknown as AdminUserRow
    },
    enabled: !!userId,
    // BATCH 98 : staleTime réduit de 5min → 30s + refetch on mount.
    // Avant : un changement de role en DB ne se reflétait pas avant 5min,
    // donnant l'impression que le bouton Admin disparaissait (cache stale).
    staleTime: 30 * 1000,
    refetchOnMount: true,
  })

  return {
    isAdmin: !!query.data,
    isLoading: query.isLoading,
    adminUser: query.data ?? null,
    role: (query.data?.role as AdminRole | undefined) ?? null,
    /** Helpers de role pour gardes fines (super_admin > moderator > support). */
    isSuperAdmin: query.data?.role === 'super_admin',
    isModerator: query.data?.role === 'moderator' || query.data?.role === 'super_admin',
    isSupport:
      query.data?.role === 'support' ||
      query.data?.role === 'moderator' ||
      query.data?.role === 'super_admin',
  }
}
