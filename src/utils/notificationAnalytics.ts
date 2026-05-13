/**
 * notificationAnalytics — Événements analytics du système de notifications
 *
 * EPIC 5.4 du PRD.
 *
 * Pour l'instant (MVP) : on log dans la console en dev et on expose un
 * pont global `window.ngTrack` qui peut être branché plus tard sur un
 * backend (Plausible / Matomo / PostHog selon la décision finale).
 *
 * Événements couverts :
 *   - panel_opened      : ouverture du dropdown header
 *   - panel_closed      : fermeture
 *   - notif_clicked     : clic sur une notif (deep-link)
 *   - mark_all_read     : clic "Tout marquer comme lu"
 *   - tab_changed       : changement d'onglet sur la page /notifications
 *   - preference_toggled: toggle d'un type dans Settings
 *
 * Eco-conception :
 *   - Pas de batch réseau par défaut (zero-dépendance)
 *   - Pas de PII dans les props — seulement des id anonymisés ou type
 */

import { debugLog } from '@/lib/debugLog'

export type NotifAnalyticsEvent =
  | 'panel_opened'
  | 'panel_closed'
  | 'notif_clicked'
  | 'mark_all_read'
  | 'tab_changed'
  | 'preference_toggled'

export interface NotifAnalyticsProps {
  /** Type de la notif (pour notif_clicked / preference_toggled). */
  notif_type?: string
  /** Onglet actif pour tab_changed. */
  tab?: string
  /** Valeur du toggle pour preference_toggled. */
  enabled?: boolean
  /** Index signature — compatibilité Record<string, unknown> pour window.ngTrack. */
  [key: string]: unknown
}

type Tracker = (event: string, props?: Record<string, unknown>) => void

declare global {
  interface Window {
    ngTrack?: Tracker
  }
}

/** Log un événement — passe par `window.ngTrack` si défini, sinon console. */
export function trackNotifEvent(event: NotifAnalyticsEvent, props: NotifAnalyticsProps = {}): void {
  try {
    const fn = typeof window !== 'undefined' ? window.ngTrack : undefined
    if (fn) {
      fn(`notif:${event}`, props)
      return
    }
    // BATCH 15 / QW-CL2 : migre vers debugLog (centralise + tree-shake en prod)
    debugLog('notif-analytics', event, props)
  } catch {
    // silencieux — jamais bloquer l'UI pour un log
  }
}
