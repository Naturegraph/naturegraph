/**
 * ActivityHeartbeat : monte le heartbeat d'activité au niveau application
 * =========================================================================
 *
 * Monté UNE seule fois dans App.tsx (sous tous les providers), sur le même
 * modèle qu'AppBadgeSync. Alimente `profiles.last_active_at` (NG-045, règle
 * E7 : pas d'email réaction/migrateur si connecté depuis moins de 30 min).
 *
 * Ne rend rien (return null) : simple effet de bord global.
 */

import { useAuth } from '@/contexts/AuthContext'
import { useActivityHeartbeat } from '@/hooks/useActivityHeartbeat'

export function ActivityHeartbeat(): null {
  const { profile } = useAuth()
  useActivityHeartbeat(profile?.id)
  return null
}
