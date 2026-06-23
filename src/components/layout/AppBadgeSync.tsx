/**
 * AppBadgeSync : synchronise la pastille de l'icône PWA au niveau application
 * =========================================================================
 *
 * Monté UNE seule fois dans App.tsx (sous tous les providers), indépendamment
 * de la page affichée. Garantit que la pastille "non lues" sur l'icône de l'app
 * installée reflète toujours le compteur, même quand l'utilisateur lit ses
 * notifications depuis une page sans HomeNavbar (ex: /notifications).
 *
 * Ne rend rien (return null) : c'est un simple effet de bord global.
 */

import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useAppBadge } from '@/hooks/useAppBadge'

export function AppBadgeSync(): null {
  const { profile } = useAuth()
  const { data: unreadCount } = useUnreadCount(profile?.id)
  useAppBadge(unreadCount ?? 0)
  return null
}
