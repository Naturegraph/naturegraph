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
import { Spinner } from '@/components/ui'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Pendant la vérification de session, afficher un spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Si non authentifié, rediriger vers login en conservant la destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
