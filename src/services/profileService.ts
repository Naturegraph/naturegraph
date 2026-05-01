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
 * Règles (cf. PRD — Migrateurs à suivre) :
 *  1. Exclusion : utilisateur connecté + profils déjà suivis
 *  2. Contrainte géographique : si `region` est fournie, la recherche est restreinte
 *     à cette région. S'il y a moins de 3 profils disponibles dans la région →
 *     état vide (retour []).
 *  3. Cascade par centres d'intérêt de l'utilisateur :
 *       - priorité 1 : centre d'intérêt #1
 *       - priorité 2 : centre d'intérêt #2 (si pas assez de résultats)
 *       - priorité 3 : centre d'intérêt #3 (si toujours insuffisant)
 *       - fallback  : autres profils actifs (sans match d'intérêt)
 *  4. Retourne exactement `limit` (3) profils, ou [] si < 3 candidats.
 */
export async function getSuggestedUsers({
  currentUserId,
  userInterests = [],
  region = null,
  limit = 3,
}: SuggestedUsersParams): Promise<SuggestedUser[]> {
  if (!supabase) throw new Error('Supabase non configuré')

  // 1. IDs à exclure : soi-même + profils déjà suivis
  const { data: followedRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)

  const excludeIds = [currentUserId, ...(followedRows ?? []).map((r) => r.following_id)]

  // 2. Pool de candidats — restreint à la région si fournie
  //    Pool élargi (x10) pour avoir de la marge lors du tri par cascade
  let query = supabase
    .from('profiles')
    .select('id, username, avatar_url, interests, posts_count, region')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .eq('is_public', true)
    .gt('posts_count', 0)
    .order('posts_count', { ascending: false })
    .limit(limit * 10)

  if (region) query = query.eq('region', region)

  const { data: candidates, error } = await query
  if (error) throw new Error(error.message)

  // Seuil minimum : si on n'a pas 3 candidats (dans la région si fournie) → vide
  if (!candidates || candidates.length < 3) return []

  // 3. Cascade par intérêts — priorité #1 → #2 → #3 → fallback
  const picked: (typeof candidates)[number][] = []
  const usedIds = new Set<string>()
  const priorityInterests = userInterests.slice(0, 3)

  for (const interest of priorityInterests) {
    if (picked.length >= limit) break
    // Candidats ayant ce centre d'intérêt, non encore sélectionnés
    const matches = candidates.filter(
      (c) => !usedIds.has(c.id) && Array.isArray(c.interests) && c.interests.includes(interest),
    )
    for (const m of matches) {
      if (picked.length >= limit) break
      picked.push(m)
      usedIds.add(m.id)
    }
  }

  // 4. Fallback : compléter avec les profils restants (tri posts_count hérité)
  if (picked.length < limit) {
    for (const c of candidates) {
      if (picked.length >= limit) break
      if (!usedIds.has(c.id)) {
        picked.push(c)
        usedIds.add(c.id)
      }
    }
  }

  // Garantie finale : si malgré le fallback on n'atteint pas 3 → vide
  if (picked.length < limit) return []

  return picked.slice(0, limit) as SuggestedUser[]
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
