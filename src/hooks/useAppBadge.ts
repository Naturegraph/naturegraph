/**
 * useAppBadge : pastille "non lues" sur l'icône de l'app installée (PWA)
 * =====================================================================
 *
 * Utilise la Badging API (`navigator.setAppBadge` / `clearAppBadge`). Sur une
 * PWA installée (Android Chrome, desktop Chrome/Edge, macOS, iOS >= 16.4),
 * affiche le nombre de notifications non lues directement sur l'icône d'accueil
 * -> rappel de retour léger et gratuit (rétention).
 *
 * Éco-conception / stabilité : feature-detect strict + `.catch()` silencieux.
 * Si l'API n'existe pas (navigateur non installé / non supporté) c'est un no-op
 * total : aucun risque, et AUCUNE permission n'est demandée par cette API
 * (contrairement au Web Push). C'est le "quick win" rétention sans dépendance.
 *
 * Limite assumée : la pastille ne se met à jour que quand l'app tourne (ou est
 * en arrière-plan avec le Realtime actif). Notifier app FERMÉE nécessiterait du
 * Web Push + service worker (feature séparée à scoper plus tard).
 */

import { useEffect } from 'react'

type BadgingNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/**
 * Synchronise la pastille de l'icône PWA avec le nombre passé.
 * @param count Nombre de notifications non lues (0 = pastille effacée).
 */
export function useAppBadge(count: number): void {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const nav = navigator as BadgingNavigator
    if (typeof nav.setAppBadge !== 'function') return // API absente -> no-op

    if (count > 0) {
      nav.setAppBadge(count).catch(() => {
        /* contexte/permission indispo : best-effort, on ignore */
      })
    } else {
      nav.clearAppBadge?.().catch(() => {})
    }
  }, [count])
}
