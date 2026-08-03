/**
 * SentryRouteTracker : contexte Sentry "OU" + "QUI" (aucun rendu visible).
 *
 * Place dans l'arbre du router ET de l'AuthProvider, il met a jour :
 *   - le tag `route` a chaque navigation -> filtrer les incidents par ecran
 *     ("cet incident frappe /post/:id") ;
 *   - l'utilisateur courant (id seul) -> Sentry compte "combien d'UTILISATEURS
 *     touches" par incident, pour prioriser ce qui frappe le plus de monde.
 *
 * On tague le PATTERN generique (`/post/:id`, `/profile/:username`) et non l'URL
 * brute : sinon chaque post/profil produirait une route distincte et le
 * regroupement deviendrait inutile.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { setMonitoringRoute, setMonitoringUser } from '@/lib/monitoring'

/** Remplace les identifiants dynamiques par leur parametre pour regrouper. */
function routeGenerique(pathname: string): string {
  return pathname
    .replace(/\/post\/[^/]+/, '/post/:id')
    .replace(/\/profile\/[^/]+/, '/profile/:username')
    .replace(/\/species\/[^/]+/, '/species/:id')
}

export function SentryRouteTracker(): null {
  const { pathname } = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    setMonitoringRoute(routeGenerique(pathname))
  }, [pathname])

  useEffect(() => {
    setMonitoringUser(user?.id ?? null)
  }, [user?.id])

  return null
}
