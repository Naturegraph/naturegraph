/**
 * ProtectedRoute — Route guard pour les pages authentifiées
 *
 * Redirige vers /login si l'utilisateur n'est pas connecté.
 * Affiche un spinner pendant la vérification de l'auth.
 *
 * Usage dans router.tsx :
 *   element: <ProtectedRoute><Home /></ProtectedRoute>
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLoader } from '@/components/ui'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth()
  const location = useLocation()

  // V1.1.4 NG-013 : loader officiel Naturegraph pendant le check session
  if (isLoading) {
    return <AppLoader size="md" />
  }

  // Si non authentifié, rediriger vers login en conservant la destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Si authentifié mais onboarding pas terminé, forcer le passage par /onboarding
  // (sauf si on y est déjà — évite la boucle infinie)
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
