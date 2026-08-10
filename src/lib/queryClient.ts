import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'
import { captureException, trackAction } from './monitoring'
import { supabase } from './supabase'

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

/**
 * Erreur d'authentification (token JWT expire / invalide). Typiquement au retour
 * de veille : `autoRefreshToken` (timer) a ete gele, le token a expire, la requete
 * part avec ce token -> PostgREST renvoie 401 / PGRST301. AVANT : les 4xx ne
 * retentaient jamais -> echec silencieux -> page vide jusqu'a un refresh manuel
 * (R1/C1 du plan de fiabilite). On veut alors tenter UN refresh de session + UN retry.
 */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as { status?: number; statusCode?: number; code?: string; message?: string }
  const status = obj.status ?? obj.statusCode
  if (status === 401 || status === 403) return true
  if (obj.code === 'PGRST301') return true
  return /jwt (expired|invalid)|invalid token|not authenticated|\b401\b/i.test(obj.message ?? '')
}

/** Hors-ligne : un echec est ATTENDU, inutile de le reporter (bruit). */
function estHorsLigne(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Nom lisible d'une mutation depuis sa `mutationKey` (sinon "inconnue"). */
function nomMutation(mutation: { options: { mutationKey?: unknown } }): string {
  const key = mutation.options.mutationKey
  if (Array.isArray(key)) {
    const parts = key.filter((k): k is string => typeof k === 'string')
    if (parts.length) return parts.join('.')
  }
  return 'inconnue'
}

export const queryClient = new QueryClient({
  // FILET GLOBAL (Nicolas 2026-08-03 : "pousser au maximum le suivi") : toute
  // MUTATION qui echoue = une action utilisateur qui n'a pas marche (reagir,
  // suivre, echanger, sauvegarder, supprimer, publier, modifier son profil...).
  // Un SEUL endroit couvre TOUTE la plateforme -> on ne rate plus une action
  // ratee, sans avoir a instrumenter chaque bouton. Le message d'erreur Supabase
  // (table/RLS/RPC) suffit souvent a identifier l'action meme sans mutationKey.
  // On ignore le hors-ligne (attendu, pas un bug) pour ne pas polluer Sentry.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (estHorsLigne()) return
      captureException(error, { kind: 'mutation', action: nomMutation(mutation) })
    },
  }),
  // QUERIES qui echouent APRES retries = une donnee qui n'a pas charge (feed,
  // fil, profil...). Souvent transitoire (reseau mobile) -> on ne cree PAS
  // d'issue (bruit), mais un simple FIL D'ARIANE : quand une VRAIE erreur ou un
  // echec d'action survient ensuite, on voit "la query X venait d'echouer".
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (estHorsLigne()) return
      const cle = Array.isArray(query.queryKey)
        ? query.queryKey.filter((k) => typeof k === 'string').join('.')
        : 'inconnue'
      trackAction('query.echec', {
        cle,
        message: error instanceof Error ? error.message.slice(0, 120) : 'echec',
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // V1.1.6 (Nicolas 2026-05-31) : gcTime explicite 10 min pour eviter
      // l accumulation memoire sur les sessions longues. Sans cette config,
      // React Query garde les queries jusqu a explicit garbage collect (5 min
      // par defaut mais peut s accumuler avec des cle distincts par user/post).
      // 10 min = compromis : assez court pour liberer la memoire, assez long
      // pour eviter les refetch inutiles quand l user revient sur une page.
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        // Auth (401 apres veille) : token probablement expire. On declenche UN
        // refresh de session (non bloquant) et on rejoue UNE fois -> la query
        // repart avec un token frais au lieu d'echouer en silence (page vide).
        // Le retryDelay (~1 s) laisse le temps au refresh d'aboutir avant le rejeu.
        if (isAuthError(error)) {
          if (failureCount === 0) {
            void supabase?.auth.refreshSession()
            return true
          }
          return false
        }
        if (!is5xxError(error)) return false
        return failureCount < 3
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      // Meme gcTime sur les mutations pour liberer les onMutate context.
      gcTime: 5 * 60 * 1000,
    },
  },
})
