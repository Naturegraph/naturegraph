import { QueryClient } from '@tanstack/react-query'

/**
 * React Query global client.
 *
 * Historique config :
 * - V1.0.0 : staleTime 5min + refetchOnWindowFocus false (eco-conception).
 * - V1.1.3 essai #1 : staleTime 60s + refetchOnWindowFocus true (NG-004 #1).
 *   Resultat : race conditions sur les mutations (reactions) car le focus
 *   refetch ramenait des donnees stale pendant une mutation en vol.
 * - V1.1.3 essai #2 (actuel) : staleTime 2min + refetchOnReconnect true,
 *   refetchOnWindowFocus laisse a false. Compromis : freshness honnete sans
 *   over-refetcher sur chaque tab switch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})
