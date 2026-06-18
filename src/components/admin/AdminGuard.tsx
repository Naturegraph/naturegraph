/**
 * AdminGuard : Garde de route /admin/*
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 + BATCH 31
 *
 * Comportement :
 *   - Loading : affiche LoadingState
 *   - Non authentifie : redirige vers /auth (memorise return path)
 *   - Authentifie mais non admin : redirige vers /home (silencieux, pas de leak admin)
 *   - Admin : rend les children
 *
 * Defense en profondeur : meme si l'UI rend les routes, le RLS sur la DB
 * empechera tout access via API si role manquant.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { LoadingState } from '@/components/ui'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { isAdmin, isLoading: adminLoading } = useIsAdmin()
  const location = useLocation()

  // 1. Loading auth ou admin check
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-lighter">
        <LoadingState label="Verification administrateur..." />
      </div>
    )
  }

  // 2. Non authentifie -> /login (sauvegarder le path pour redirect post-login)
  // Note : route est /login dans router.tsx (pas /auth qui n'existe pas).
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 3. Authentifie mais pas admin -> /home (pas de page 403 pour eviter leak)
  if (!isAdmin) {
    return <Navigate to="/home" replace />
  }

  // 4. Admin -> render children
  return <>{children}</>
}
