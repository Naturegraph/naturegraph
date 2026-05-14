/**
 * BetaAccessGuard — Garde le site derriere le welcome screen
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { LoadingState } from '@/components/ui'

interface BetaAccessGuardProps {
  children: React.ReactNode
}

export function BetaAccessGuard({ children }: BetaAccessGuardProps) {
  const { hasAccess, isReady } = useBetaAccess()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-lighter">
        <LoadingState label="Chargement..." />
      </div>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/welcome" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
