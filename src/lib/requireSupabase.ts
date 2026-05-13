/**
 * requireSupabase — Helper centralisé pour validation client Supabase
 * ====================================================================
 *
 * AVANT (26 occurrences dispersées) :
 *
 *   if (!isSupabaseConfigured || !supabase) {
 *     throw new Error('Supabase non configuré')
 *   }
 *
 * APRÈS :
 *
 *   const client = requireSupabase()
 *   // → client est typé SupabaseClient (non-null), prêt à l'usage
 *
 * Bénéfices :
 *   - DRY : 1 implémentation centrale
 *   - Type narrowing : le retour est non-null après vérification
 *   - Message d'erreur cohérent partout
 *   - Facile à mocker dans les tests (jest.mock + spyOn)
 *
 * Cf. MASTER_TODO.md T-004 + QUICK_WINS.md QW-I10
 */

import { supabase, isSupabaseConfigured } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Garantit que Supabase est configuré et retourne un client non-null.
 *
 * @throws Error si Supabase n'est pas configuré ou indisponible
 * @returns SupabaseClient configuré (non-null garanti par le type)
 *
 * @example
 * ```ts
 * export async function getProfile(userId: string) {
 *   const client = requireSupabase()
 *   const { data } = await client.from('profiles').select('*').eq('id', userId).single()
 *   return data
 * }
 * ```
 */
export function requireSupabase(): SupabaseClient {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase non configuré. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local',
    )
  }
  return supabase
}

/**
 * Variante non-throwante pour les contextes où l'erreur doit remonter
 * différemment (ex: mode démo silent).
 *
 * @returns SupabaseClient ou null
 *
 * @example
 * ```ts
 * const client = getSupabaseOrNull()
 * if (!client) return null  // mode démo
 * ```
 */
export function getSupabaseOrNull(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabase) return null
  return supabase
}
