/**
 * useFeedVisit : capture la "derniere visite du fil" une fois par consultation.
 * =============================================================================
 *
 * Au montage (utilisateur connecte), appelle `mark_feed_visit()` : recupere la
 * visite PRECEDENTE (reference FIGEE pour toute la session d'affichage, elle ne
 * bouge pas quand l'utilisateur scrolle) et pose la nouvelle a maintenant.
 * Puis compte les observations publiees depuis cette reference (bandeau).
 *
 * - Invite / non connecte : ne fait rien (pas de suivi) -> premiere visite.
 * - Idempotent par instance (garde `done`) : un seul marquage par montage, y
 *   compris en StrictMode (double effet en dev).
 */

import { useEffect, useRef, useState } from 'react'
import { markFeedVisit, countNewFeedPosts } from '@/services/feedVisitService'

export interface UseFeedVisitResult {
  /** Visite precedente (ISO) : reference pour la frontiere "deja vu". null = 1ere visite/invite. */
  lastVisitRef: string | null
  /** Nombre d'observations publiees depuis la derniere visite (0 si 1ere visite). */
  missedCount: number
  /** True tant que le marquage initial n'est pas revenu (evite un flash de bandeau). */
  loading: boolean
}

export function useFeedVisit(enabled: boolean): UseFeedVisitResult {
  const [lastVisitRef, setLastVisitRef] = useState<string | null>(null)
  const [missedCount, setMissedCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const done = useRef(false)

  useEffect(() => {
    // Garde `done` : un SEUL marquage par montage, y compris avec le double-invoke
    // de StrictMode en dev. On n'annule PAS le resultat au cleanup : en StrictMode
    // le cleanup precede un re-run bloque par le garde, et le composant reste monte
    // (annuler jetterait la reference deja recuperee). setState apres unmount reel
    // est inoffensif en React 18.
    if (!enabled || done.current) return
    done.current = true

    void (async () => {
      const prev = await markFeedVisit()
      setLastVisitRef(prev)
      if (prev) setMissedCount(await countNewFeedPosts(prev))
      setLoading(false)
    })()
  }, [enabled])

  return { lastVisitRef, missedCount, loading }
}
