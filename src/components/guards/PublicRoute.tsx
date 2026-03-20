/**
 * PublicRoute — Route guard pour les pages publiques (login, signup)
 *
 * Redirige vers /home si l'utilisateur est déjà connecté.
 * Empêche un user connecté de retourner sur login/signup.
 *
 * Usage dans router.tsx :
 *   element: <PublicRoute><Login /></PublicRoute>
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // Pendant la vérification de session, afficher un spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Si déjà connecté, rediriger vers le feed
  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
