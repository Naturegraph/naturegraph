/**
 * OnboardingGuard — Force l'onboarding pour les users authentifiés sans username valide
 *
 * Cas d'usage : un utilisateur s'inscrit via OTP. Le trigger DB `handle_new_auth_user`
 * crée un profil minimal avec un username temporaire `user_xxxxxxxx`. Tant que cet
 * utilisateur n'a pas choisi un vrai username via l'onboarding, il doit y être renvoyé
 * dès qu'il essaie d'accéder à une page authentifiée (home, contribute, profile, etc.).
 *
 * Les pages publiques (landing, /signup, /login) ne sont pas concernées : le mode invité
 * et le flux d'auth doivent rester accessibles. /home est ouvert aux invités donc le guard
 * ne bloque que les users authentifiés sans onboarding.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'

interface OnboardingGuardProps {
  children: React.ReactNode
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Si l'utilisateur est connecté mais sans onboarding terminé, le forcer à le faire
  // (ne pas rediriger s'il est déjà sur /onboarding pour éviter une boucle)
  if (isAuthenticated && !onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
