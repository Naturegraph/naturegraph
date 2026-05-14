/**
 * useAdminAction — Hook helper pour logger les actions admin (DRY)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 ligne 562-589 + BATCH 36
 *
 * Avant ce hook, chaque page admin (AdminUsers, AdminModeration, AdminBeta)
 * dupliquait le code d'insertion dans admin_audit_logs :
 *
 *   ```ts
 *   if (adminUser) {
 *     await supabase.from('admin_audit_logs').insert({
 *       admin_user_id: adminUser.id,
 *       action: 'user.suspend',
 *       target_type: 'user',
 *       target_id: userId,
 *       metadata: { reason },
 *     })
 *   }
 *   ```
 *
 * Avec ce hook :
 *
 *   ```ts
 *   const { logAction } = useAdminAction()
 *   await logAction({
 *     action: 'user.suspend',
 *     targetType: 'user',
 *     targetId: userId,
 *     metadata: { reason },
 *   })
 *   ```
 *
 * Avantages :
 *   - Pas de boilerplate `if (adminUser)` repete
 *   - Type-safety (metadata: Json garantit JSON-serializable)
 *   - React Query invalidation auto sur ['admin-audit-logs'] (reflet UI live)
 *   - Toast d'erreur centralise si l'insert audit log echoue
 *   - Tests E2E : mock central possible (1 mock vs 5)
 *
 * Note importante : ce hook NE PEUT PAS empecher l'action si l'audit log echoue
 * (ex: connexion DB temporairement down). On log un toast d'erreur mais on
 * continue. Pour les actions ULTRA-critiques (ban, content_remove), on
 * recommande d'utiliser une transaction Postgres cote backend (Phase 2).
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import type { Json } from '@/types/supabase'

export interface AdminActionLog {
  /** Slug de l'action (ex: 'user.suspend', 'beta.key_gen', 'report.resolve'). */
  action: string
  /** Type d'entite ciblee : 'user' | 'moderation_report' | 'beta_access_key' | 'batch' | 'post' | ... */
  targetType?: string
  /** ID de l'entite ciblee (UUID). Optionnel pour les actions de masse (ex: 'beta.key_gen' cible un batch). */
  targetId?: string
  /** Metadata JSON-serializable (raison, parametres, etat avant/apres). */
  metadata?: Json
}

export interface UseAdminActionReturn {
  /**
   * Log une action admin dans `admin_audit_logs` (table immutable).
   *
   * @returns `true` si l'insert a reussi, `false` sinon (mais l'action calling continue).
   *          Pas d'exception pour eviter de casser le flow user — on log juste.
   */
  logAction: (params: AdminActionLog) => Promise<boolean>
  /** Indique si le hook est pret a logger (admin connecte + supabase initialise). */
  isReady: boolean
}

export function useAdminAction(): UseAdminActionReturn {
  const { adminUser } = useIsAdmin()
  const queryClient = useQueryClient()
  const toast = useToast()

  const isReady = !!adminUser && !!supabase

  const logAction = useCallback(
    async ({ action, targetType, targetId, metadata }: AdminActionLog): Promise<boolean> => {
      if (!supabase || !adminUser) {
        // Pas d'admin connecte : on ne logge rien (cas degrade — ne devrait pas
        // arriver car AdminGuard protege deja les pages).
        console.warn('[useAdminAction] logAction called but admin not ready', { action })
        return false
      }

      try {
        const { error } = await supabase.from('admin_audit_logs').insert({
          admin_user_id: adminUser.id,
          action,
          target_type: targetType ?? null,
          target_id: targetId ?? null,
          metadata: metadata ?? null,
        })

        if (error) {
          // Toast d'erreur visible pour l'admin (debug live).
          toast.error(
            'Audit log echoue',
            `${action} : ${error.message} — l'action a continue mais n'est pas tracee.`,
          )
          return false
        }

        // Invalidation pour refresh /admin/audit en temps reel.
        queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] })
        return true
      } catch (err) {
        toast.error('Audit log exception', err instanceof Error ? err.message : 'erreur inconnue')
        return false
      }
    },
    [adminUser, queryClient, toast],
  )

  return { logAction, isReady }
}
