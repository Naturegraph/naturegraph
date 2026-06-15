/**
 * useIsAdmin — Role et permissions de l'utilisateur courant (RBAC)
 *
 * Lit la row active dans `admin_users` correspondant a l'`auth.uid()`.
 *
 * Modele de roles (cf. migration 20260612_rbac_roles.sql) :
 *   - super_admin     : tout (gestion des roles, ban, suppression, taxonomie)
 *   - moderator       : moderation + beta + suspension (can_moderate)
 *   - support         : acces panneau en lecture seule
 *   - equipe_produit  : acces panneau en lecture seule (dashboard, analytics, beta, feedbacks)
 *   - developpeur     : AUCUN acces panneau (tag technique). is_admin() l'exclut cote DB ET ici.
 *
 * `isAdmin` = acces au panneau /admin : tous les roles staff SAUF developpeur.
 * Le cote serveur (RLS via is_admin/can_moderate/is_super_admin) reste la source de verite ;
 * ces helpers ne servent qu'a l'affichage et au gating UI (defense en profondeur).
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type AdminRole = 'super_admin' | 'moderator' | 'support' | 'equipe_produit' | 'developpeur'

/** Roles qui donnent acces au panneau /admin (developpeur exclu). */
const PANEL_ROLES: readonly AdminRole[] = ['super_admin', 'moderator', 'support', 'equipe_produit']

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
    // staleTime court + refetch on mount : un changement de role se reflete vite.
    staleTime: 30 * 1000,
    refetchOnMount: true,
  })

  const role = (query.data?.role as AdminRole | undefined) ?? null
  // Acces panneau : role staff present ET different de developpeur.
  const isPanelAdmin = role !== null && PANEL_ROLES.includes(role)

  return {
    /** Acces au panneau /admin (exclut developpeur). */
    isAdmin: isPanelAdmin,
    isLoading: query.isLoading,
    adminUser: query.data ?? null,
    role,
    /** super_admin : gestion des roles, ban, suppression. */
    isSuperAdmin: role === 'super_admin',
    /** super_admin ou moderator : actions de moderation / beta / suspension. */
    canModerate: role === 'super_admin' || role === 'moderator',
    /** equipe_produit : staff produit (lecture seule). */
    isProductTeam: role === 'equipe_produit',
    /** developpeur : tag technique, aucun acces panneau. */
    isDeveloper: role === 'developpeur',
    // ── Alias retro-compatibles (consommateurs existants) ──
    isModerator: role === 'super_admin' || role === 'moderator',
    isSupport: isPanelAdmin,
  }
}
