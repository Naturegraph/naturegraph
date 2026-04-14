/**
 * profileService — Couche d'accès aux données profil (Supabase)
 *
 * TODO backend :
 *  - Activer les RLS policies sur la table `profiles`
 *  - Brancher le storage Supabase pour avatar/banner uploads
 */

import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Profil résumé pour les suggestions "Migrateurs à suivre" */
export interface SuggestedUser {
  id: string
  username: string
  avatar_url: string | null
  interests: string[]
  posts_count: number
  region: string | null
}

/** Paramètres pour la requête de suggestions */
export interface SuggestedUsersParams {
  /** ID de l'utilisateur connecté (exclu des résultats + exclusion déjà suivis) */
  currentUserId: string
  /** Intérêts de l'utilisateur pour le scoring par affinité */
  userInterests?: string[]
  /** Région de l'utilisateur pour prioriser la proximité */
  region?: string | null
  /** Nombre max de suggestions (défaut: 3) */
  limit?: number
}

export interface UpdateProfilePayload {
  username?: string
  first_name?: string
  last_name?: string
  bio?: string
  interests?: string[]
  city?: string
  region?: string
  country?: string
  instagram?: string
  twitter?: string
  website?: string
  is_public?: boolean
  avatar_url?: string
  banner_url?: string
}

/**
 * Payload pour la création initiale d'un profil (onboarding).
 * Tous les champs NOT NULL de la table `profiles` doivent être fournis.
 */
export interface CreateProfilePayload {
  username: string
  email: string
  first_name: string
  last_name: string
  interests?: string[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Récupère un profil par son ID utilisateur.
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as unknown as Profile
}

/**
 * Récupère un profil par son username.
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as unknown as Profile
}

/**
 * Crée ou met à jour le profil d'un utilisateur (UPSERT).
 *
 * Utilisé lors de l'onboarding initial : le profil n'existe pas encore
 * puisqu'il n'y a pas de trigger DB auto-créateur. Fournit tous les champs
 * NOT NULL requis par la table `profiles`.
 */
export async function upsertProfile(
  userId: string,
  payload: CreateProfilePayload,
): Promise<Profile> {
  if (!supabase) throw new Error('Supabase non configuré')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...payload,
        interests: payload.interests ?? [],
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Profile
}

/**
 * Met à jour le profil d'un utilisateur existant.
 * Accessible uniquement à l'utilisateur propriétaire (RLS).
 */
export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Profile
}

/**
 * Récupère des profils suggérés pour la section "Migrateurs à suivre".
 *
 * Logique de sélection (côté client — tri post-fetch) :
 *  - Exclut l'utilisateur connecté et les profils déjà suivis
 *  - Sans localisation : profils les plus actifs de la plateforme (posts_count desc)
 *  - Avec localisation : priorise la même région, puis affinité d'intérêts
 *
 * Retourne un tableau vide si < 3 suggestions disponibles (PRD : afficher seulement à partir de 3).
 */
export async function getSuggestedUsers({
  currentUserId,
  userInterests = [],
  region = null,
  limit = 3,
}: SuggestedUsersParams): Promise<SuggestedUser[]> {
  if (!supabase) throw new Error('Supabase non configuré')

  // 1. Récupérer les IDs déjà suivis pour les exclure
  const { data: followedRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)

  const excludeIds = [currentUserId, ...(followedRows ?? []).map((r) => r.following_id)]

  // 2. Récupérer les profils candidats (actifs, publics, pas dans la liste d'exclusion)
  //    On charge un pool plus large pour pouvoir scorer/trier côté client
  const poolSize = limit * 5
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, interests, posts_count, region')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .eq('is_public', true)
    .gt('posts_count', 0)
    .order('posts_count', { ascending: false })
    .limit(poolSize)

  if (error) throw new Error(error.message)
  if (!candidates || candidates.length < 3) return []

  // 3. Scorer chaque candidat (affinité intérêts + proximité région)
  const scored = candidates.map((c) => {
    let score = c.posts_count // base : activité
    // Bonus intérêts partagés (chaque intérêt commun = +10)
    if (userInterests.length > 0 && c.interests) {
      const shared = (c.interests as string[]).filter((i) => userInterests.includes(i)).length
      score += shared * 10
    }
    // Bonus proximité régionale (+20 si même région)
    if (region && c.region === region) {
      score += 20
    }
    return { ...c, score }
  })

  // 4. Trier par score décroissant et limiter
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(({ score: _score, ...user }) => user as SuggestedUser)
}

/**
 * Suit / ne suit plus un utilisateur.
 * TODO : implémenter avec table `follows` et trigger de compteur.
 */
export async function toggleFollow(
  followerId: string,
  targetId: string,
): Promise<{ following: boolean }> {
  if (!supabase) throw new Error('Supabase non configuré')

  // Vérifie si déjà suivi
  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', targetId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
    return { following: false }
  } else {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId })
    return { following: true }
  }
}
