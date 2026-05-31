import { QueryClient } from '@tanstack/react-query'

/**
 * React Query global client.
 *
 * NG-004 (Nicolas 2026-05-31) : rebascule sur refetchOnWindowFocus = true
 * et baisse du staleTime a 60s pour eliminer l effet "necessite refresh
 * manuel" rapporte par les beta-testers. L app se re-hydrate maintenant
 * automatiquement quand l user revient sur l onglet, sans casser la
 * perf (cache hits sub-60s restent gratuits).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
