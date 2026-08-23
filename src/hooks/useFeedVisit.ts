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

/**
 * Cle sessionStorage : reference de visite FIGEE pour toute la session de
 * navigation (onglet). Sans ca, le fil se re-marquerait a chaque ouverture et
 * le bandeau "contenus manques" disparaitrait des le 1er rechargement. Valeur =
 * ISO de la visite precedente, ou chaine vide pour "premiere visite / invite".
 */
const SESSION_KEY = 'naturegraph:feed-visit-ref'

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
    // Garde `done` : un SEUL traitement par montage (dont double-invoke StrictMode).
    if (!enabled || done.current) return
    done.current = true

    // Tout le travail (dont les setState) est dans l'IIFE async : on ne fait aucun
    // setState synchrone dans le corps de l'effet (regle set-state-in-effect).
    void (async () => {
      // Reference deja figee pour cette session (onglet) ? On la reutilise : le fil
      // ne se re-marque pas, le bandeau reste stable au fil des rechargements et
      // allers-retours. Le marquage serveur n'a lieu qu'une fois par session.
      let cached: string | null = null
      try {
        cached = sessionStorage.getItem(SESSION_KEY)
      } catch {
        /* sessionStorage indisponible (mode prive) : on marquera a ce montage */
      }

      let prev: string | null
      if (cached !== null) {
        prev = cached === '' ? null : cached
      } else {
        prev = await markFeedVisit()
        try {
          sessionStorage.setItem(SESSION_KEY, prev ?? '')
        } catch {
          /* ignore : reference juste non persistee pour la session */
        }
      }

      setLastVisitRef(prev)
      if (prev) setMissedCount(await countNewFeedPosts(prev))
      setLoading(false)
    })()
  }, [enabled])

  return { lastVisitRef, missedCount, loading }
}
