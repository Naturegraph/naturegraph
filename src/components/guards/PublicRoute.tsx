/**
 * PublicRoute, Route guard pour les pages publiques (login, signup, landing)
 *
 * Redirige vers /home si l'utilisateur est déjà connecté.
 * Empêche un user connecté de retourner sur login/signup/landing.
 *
 * V1.1.4 NG-004B (Nicolas 2026-06-01) :
 * Optimistic redirect. Avant ce fix, pendant le boot de la session
 * (isLoading: true peut prendre 1-3s en prod, 5s en cas de fail), l user
 * voyait un spinner sur la landing. Sur réouverture PWA cela donnait
 * l impression que l app était cassée. Maintenant on lit localStorage
 * AVANT le check session : si une session Supabase est stockée localement,
 * on présume que l user est auth et on redirect /home tout de suite.
 * Si la session est en fait expirée (cas degrade), ProtectedRoute sur /home
 * renvoie vers /login et l user est dans le bon flow.
 *
 * Usage dans router.tsx :
 *   element: <PublicRoute><Login /></PublicRoute>
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLoader } from '@/components/ui'

interface PublicRouteProps {
  children: React.ReactNode
}

/**
 * Vérifie de manière synchrone si une session Supabase est stockée localement.
 * Ne valide pas la session (faux positifs possibles si token expiré), juste
 * la présence. Sert d'indicateur optimiste pour pré-redirect au boot.
 */
function hasLocalSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // localStorage (remember me ON) OU sessionStorage (remember me OFF)
    const local = window.localStorage.getItem('naturegraph-auth')
    if (local && local.length > 10) return true
    const ephemeral = window.sessionStorage.getItem('naturegraph-auth')
    return !!ephemeral && ephemeral.length > 10
  } catch {
    return false
  }
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth()

  // V1.1.4 NG-004B : optimistic redirect avant fin du boot.
  // Si on a un hint de session locale, on assume que l user est auth.
  // Cas dégradé (session morte) : ProtectedRoute sur /home renvoie /login.
  if (isLoading && hasLocalSessionHint()) {
    return <Navigate to="/home" replace />
  }

  // Pendant la vérification de session (sans hint local), afficher le loader officiel
  if (isLoading) {
    return <AppLoader size="md" />
  }

  // Si connecté et onboarding terminé, /home
  // Si connecté mais onboarding pas terminé, /onboarding (forcé)
  if (isAuthenticated) {
    return <Navigate to={onboardingCompleted ? '/home' : '/onboarding'} replace />
  }

  return <>{children}</>
}
