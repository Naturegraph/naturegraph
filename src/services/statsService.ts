/**
 * statsService — Statistiques plateforme + utilisateur
 *
 * Sources :
 *  - profiles (posts_count, followers_count, following_count) — compteurs dénormalisés
 *  - posts (DISTINCT taxref_id) — espèces uniques observées
 *  - count(*) global pour la plateforme
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface PlatformStats {
  totalUsers: number
  totalPosts: number
  totalSpecies: number
}

export interface UserStats {
  postsCount: number
  uniqueSpeciesCount: number
  followersCount: number
  followingCount: number
}

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré — statsService indisponible')
  }
  return supabase
}

/** Stats globales plateforme (Impact card homepage). */
export async function getPlatformStats(): Promise<PlatformStats> {
  const c = ensureClient()
  const [users, posts, species] = await Promise.all([
    c.from('profiles').select('id', { count: 'exact', head: true }),
    c.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    c.from('taxref_cache').select('taxref_id', { count: 'exact', head: true }),
  ])
  return {
    totalUsers: users.count ?? 0,
    totalPosts: posts.count ?? 0,
    totalSpecies: species.count ?? 0,
  }
}

/** Stats d'un utilisateur (profil sidebar). */
export async function getUserStats(userId: string): Promise<UserStats> {
  const c = ensureClient()

  // 1. Compteurs dénormalisés depuis profiles
  const { data: profile, error: pErr } = await c
    .from('profiles')
    .select('posts_count, followers_count, following_count')
    .eq('id', userId)
    .maybeSingle()
  if (pErr) throw new Error(pErr.message)

  // 2. Espèces uniques (taxref_id distincts dans ses posts publiés)
  const { data: speciesRows, error: sErr } = await c
    .from('posts')
    .select('taxref_id')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('taxref_id', 'is', null)
  if (sErr) throw new Error(sErr.message)

  const uniqueSpecies = new Set((speciesRows ?? []).map((r) => r.taxref_id as string))

  return {
    postsCount: profile?.posts_count ?? 0,
    uniqueSpeciesCount: uniqueSpecies.size,
    followersCount: profile?.followers_count ?? 0,
    followingCount: profile?.following_count ?? 0,
  }
}
