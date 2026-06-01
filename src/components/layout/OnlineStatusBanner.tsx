/**
 * OnlineStatusBanner - Bandeau global qui s affiche quand la connexion tombe
 *
 * V1.1.4 NG-004 Phase 1 (Nicolas 2026-05-31) :
 *   Avant : quand le wifi/4G tombait, les requetes timeout silencieusement,
 *   l user croyait que "l app est cassee" et faisait des refresh dans le vide.
 *   Maintenant : bandeau rouge en haut qui dit explicitement "Tu es hors
 *   ligne, tes actions ne seront pas sauvegardees".
 *
 * Detection :
 *   - navigator.onLine : initial value
 *   - 'online' / 'offline' events sur window
 *
 * Limites :
 *   - navigator.onLine est un best-effort. Sur certains OS / VPN il peut
 *     mentir (true alors que pas d acces internet reel). Pour une vraie
 *     detection, on pourrait pinger un endpoint Supabase, mais c est plus
 *     couteux et on accepte le compromis pour V1.1.4.
 *
 * Quand l app revient online :
 *   - On affiche brievement un bandeau vert "Connexion retablie" (3s)
 *   - On invalide TOUTES les queries React Query pour refetch les data
 *     fraiches (NG-004 : evite que l UI reste sur des donnees stales).
 */

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WifiOff, Wifi } from 'lucide-react'

export function OnlineStatusBanner() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })
  // Indicateur transitoire affiche quelques secondes apres la reconnexion
  // pour donner un feedback positif (sinon l user ne sait pas que c est OK).
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setShowReconnected(true)
      // Refetch tous les caches stales - l user voit ses donnees a jour
      // des le retour de connexion (NG-004 : evite les fantomes de cache).
      queryClient.invalidateQueries()
      window.setTimeout(() => setShowReconnected(false), 3000)
    }
    function handleOffline() {
      setIsOnline(false)
      setShowReconnected(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  if (isOnline && !showReconnected) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed top-0 left-0 right-0 z-[10000]
        flex items-center justify-center gap-2
        px-4 py-2
        text-sm font-medium
        motion-safe:animate-in motion-safe:slide-in-from-top motion-safe:duration-200
        ${
          isOnline
            ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
        }
      `}
    >
      {isOnline ? (
        <>
          <Wifi className="size-4" aria-hidden="true" />
          <span>Connexion rétablie</span>
        </>
      ) : (
        <>
          <WifiOff className="size-4" aria-hidden="true" />
          <span>Hors ligne, tes actions ne seront pas enregistrées</span>
        </>
      )}
    </div>
  )
}
