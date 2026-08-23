/**
 * feedVisitService : suivi minimal de la "derniere visite du fil".
 * =============================================================================
 *
 * Deux appels RPC (migration 20260821204509) :
 *   - mark_feed_visit()          -> renvoie la visite PRECEDENTE et pose now().
 *   - count_new_feed_posts(since) -> nb d'observations publiques depuis `since`.
 *
 * Aucun tracking par post : "nouveau" = publie apres la derniere visite. Simple
 * et performant (cf. ticket "reperes temporels & contenus manques").
 *
 * NB : les types Supabase generes n'incluent pas encore ces RPC (regeneration a
 * faire post-migration prod). On cast donc `supabase` en `any` localement, comme
 * le reste du code le fait deja pour `posts_public`.
 */

import { supabase } from '@/lib/supabase'

/**
 * Marque le fil comme visite : renvoie l'horodatage de la visite PRECEDENTE
 * (reference pour les "contenus manques"), ou null si premiere visite / invite.
 * Effet de bord : pose `last_feed_visit_at = now()` cote serveur.
 */
export async function markFeedVisit(): Promise<string | null> {
  if (!supabase) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('mark_feed_visit')
  if (error) return null
  return (data as string | null) ?? null
}

/**
 * Nombre d'observations publiques publiees depuis `sinceISO` (memes filtres que
 * le feed public). 0 si erreur/absence, jamais d'exception (repere non critique).
 */
export async function countNewFeedPosts(sinceISO: string): Promise<number> {
  if (!supabase) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('count_new_feed_posts', { p_since: sinceISO })
  if (error) return 0
  return Number(data ?? 0)
}
