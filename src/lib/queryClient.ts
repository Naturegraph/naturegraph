import { QueryClient } from '@tanstack/react-query'

/**
 * React Query global client.
 *
 * V1.1.4 NG-004 Phase 1 (Nicolas 2026-05-31) :
 * - refetchOnWindowFocus : true. Combine avec staleTime 5 min, l app
 *   se re-hydrate quand l user revient sur l onglet apres 5+ min sans
 *   ramener systematiquement des donnees au moindre focus (eviter races).
 * - staleTime 5 min : compromis entre freshness et performance.
 * - retry 5xx avec backoff exponentiel : 3 tentatives 1s/2s/4s sur les
 *   erreurs serveur transitoires (Supabase peut renvoyer 502/503 sous
 *   charge). Les erreurs 4xx (auth, validation) ne retentent jamais
 *   (la cause ne va pas disparaitre en re-essayant).
 * - refetchOnReconnect : true. Quand la connexion revient, refetch les
 *   queries stales pour repartir sur donnees fraiches.
 *
 * Historique :
 * - V1.0.0 : staleTime 5min, refetchOnWindowFocus false (eco initial)
 * - V1.1.3 essai #1 : focus refetch true + 60s -> race conditions mutations
 * - V1.1.3 ship : focus refetch false + 2min (stable, conservatif)
 * - V1.1.4 : focus refetch true + 5 min + retry 5xx (compromis robuste)
 */

/** Verifie si une erreur HTTP est une 5xx (serveur, retryable). */
function is5xxError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as { status?: number; statusCode?: number; code?: string; message?: string }
  const status = obj.status ?? obj.statusCode
  if (typeof status === 'number' && status >= 500 && status < 600) return true
  // PostgREST renvoie parfois l erreur dans le message avec un code custom
  // (PGRST500+, PostgresErrors). On detecte au pattern.
  const msg = obj.message ?? ''
  if (/PGRST5\d{2}|503|502|504|server error|gateway timeout/i.test(msg)) return true
  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // 4xx : pas de retry (pas la peine, la cause ne va pas changer)
        // 5xx : 3 tentatives max avec backoff
        if (!is5xxError(error)) return false
        return failureCount < 3
      },
      // Backoff exponentiel : 1s, 2s, 4s (NG-004 Phase 1)
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Mutations : pas de retry auto (risque doublons cote serveur).
      // L user clique a nouveau si l erreur le mentionne explicitement.
      retry: false,
    },
  },
})
