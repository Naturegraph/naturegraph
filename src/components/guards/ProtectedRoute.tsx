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

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth()
  const location = useLocation()

  // V1.1.4 hotfix post-round-11 (Nicolas 2026-06-02 18h50) : pas de loader
  // visible pendant le check session. Avant : AppLoader size=md affichait
  // un mini residu visuel apres refresh (le BootSplash sessionStorage peut
  // skipper et le AppLoader inline restait dans la viewport quelques 100ms).
  // Maintenant : aplat cream-lighter pleine page = invisible si check
  // rapide, neutre si check lent. Le BootSplash (premier mount) reste
  // intact pour l effet branding.
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-cream-lighter" role="status" aria-label="Chargement">
        <span className="sr-only">Chargement</span>
      </div>
    )
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
