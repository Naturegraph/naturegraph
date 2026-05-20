/**
 * BetaAccessGuard — Garde le site derrière le welcome screen.
 *
 * Laisse passer :
 *   - les visiteurs ayant validé une clé beta (gate localStorage), ET
 *   - les utilisateurs authentifiés : posséder un compte (créé via une clé OU
 *     via une invitation admin `inviteUserByEmail`) signifie qu'on est déjà
 *     membre de la beta. Le gate localStorage ne concerne donc que les
 *     visiteurs anonymes, avant entrée.
 *
 * Sans la règle « authentifié = accès », un invité qui vient de créer sa
 * session en cliquant le lien de son email d'invitation serait renvoyé en
 * boucle vers /welcome (il n'a pas de clé en localStorage).
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingState } from '@/components/ui'

interface BetaAccessGuardProps {
  children: React.ReactNode
}

export function BetaAccessGuard({ children }: BetaAccessGuardProps) {
  const { hasAccess, isReady } = useBetaAccess()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // On attend l'hydratation du gate localStorage ET la résolution de la
  // session Supabase (sinon un invité fraîchement authentifié serait, le temps
  // d'un render, considéré comme anonyme et renvoyé vers /welcome).
  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-lighter">
        <LoadingState label="Chargement..." />
      </div>
    )
  }

  if (!hasAccess && !isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
