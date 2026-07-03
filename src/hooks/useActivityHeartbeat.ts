/**
 * useActivityHeartbeat : trace l'activité récente de l'utilisateur (NG-045)
 * ===========================================================================
 *
 * Met à jour `profiles.last_active_at` via le RPC `touch_last_active` quand
 * l'onglet redevient visible, throttlé à un appel par 5 minutes max. Sert
 * uniquement à la règle E7 ("ne pas envoyer d'email réaction/migrateur si
 * l'utilisateur est connecté depuis moins de 30 minutes") : ce n'est pas un
 * système de présence temps réel précis, juste un signal "vu récemment".
 *
 * Éco-conception : pas de setInterval qui tourne en continu. On se raccroche
 * à l'évènement `visibilitychange` (l'utilisateur revient sur l'onglet) plutôt
 * que de sonder en boucle. Un appel RPC minuscule, throttlé, largement sous
 * les seuils de sobriété du projet.
 */

import { useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * @param userId  UUID de l'user authentifié, ou undefined/null si non connecté
 *                (no-op dans ce cas : pas de heartbeat pour les invités).
 */
export function useActivityHeartbeat(userId: string | undefined | null): void {
  const lastPingRef = useRef<number>(0)

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return

    const ping = () => {
      const now = Date.now()
      if (now - lastPingRef.current < HEARTBEAT_THROTTLE_MS) return
      lastPingRef.current = now
      supabase!.rpc('touch_last_active').then(({ error }) => {
        if (error) {
          // Best-effort : un heartbeat manqué n'a aucun impact utilisateur
          // visible, juste une fenêtre E7 légèrement moins précise.
          console.warn('[useActivityHeartbeat] touch_last_active failed', error.message)
        }
      })
    }

    // Ping initial au mount (session qui démarre / reprend), puis à chaque
    // retour sur l'onglet (throttlé côté fonction, pas besoin de debounce ici).
    ping()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [userId])
}
