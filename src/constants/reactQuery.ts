/**
 * reactQuery : Constantes partagees pour React Query
 *
 * Refs : audit Phase 3 (BATCH 41) : 35+ occurrences de `staleTime: X * 1000` inline.
 *
 * Centralisation des durees de cache pour coherence + lisibilite.
 * Utiliser SHORT pour les data live (admin actions), LONG pour les data
 * lentes a changer (profile metadata).
 */

/**
 * Durees de cache standardisees pour `staleTime` React Query.
 *
 * Convention :
 *   - SHORT (15s)     : data quasi-live (signalements, audit logs admin)
 *   - MEDIUM (30s)    : data fraiche utile (notifs, stats dashboard)
 *   - LONG (1 min)    : data normale (feed, posts)
 *   - VERY_LONG (5 min) : data lente (profile metadata, user list)
 *   - HOUR (1h)       : data tres stable (species master, taxref)
 */
export const STALE_TIMES = {
  SHORT: 15_000,
  MEDIUM: 30_000,
  LONG: 60_000,
  VERY_LONG: 5 * 60_000,
  HOUR: 60 * 60_000,
} as const

/**
 * Tailles de pagination standardisees.
 *
 * MVP : 20 items partout (audit Phase 1 : eco-conception : jamais de scroll infini).
 */
export const PAGE_SIZES = {
  /** Default pour admin pages (Users, Moderation, Audit). */
  ADMIN_DEFAULT: 20,
  /** Default pour feed posts. */
  FEED_DEFAULT: 20,
  /** Default pour notifications. */
  NOTIFICATIONS: 30,
  /** Default pour listes secondaires (followers, profile cards). */
  LIST_DEFAULT: 20,
} as const
