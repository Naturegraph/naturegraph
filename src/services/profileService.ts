/**
 * profileService — Couche d'accès aux données profil
 *
 * Abstrait les appels Supabase derrière une interface stable.
 * En mode démo (isSupabaseConfigured = false), retourne des données mockées.
 *
 * TODO backend :
 *  - Remplacer les retours mock par les vraies requêtes Supabase
 *  - Activer les RLS policies sur la table `profiles`
 *  - Brancher le storage Supabase pour avatar/banner uploads
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { simulateNetworkDelay } from '@/constants/config'
import { mockUsers } from '@/data/mock/users'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw new Error(error.message)
    return data
  }

  // Mode démo — cherche dans les mocks ou retourne null
  await simulateNetworkDelay('database')
  const mock = mockUsers.find((u) => u.id === userId)
  if (!mock) return null
  return _mockUserToProfile(mock)
}

/**
 * Récupère un profil par son username.
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  await simulateNetworkDelay('database')
  const mock = mockUsers.find((u) => u.username === username)
  if (!mock) return null
  return _mockUserToProfile(mock)
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
  if (isSupabaseConfigured && supabase) {
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
    return data
  }

  // Mode démo — retourne un profil fictif cohérent
  await simulateNetworkDelay('database')
  const now = new Date().toISOString()
  return {
    id: userId,
    ...payload,
    gender: null,
    birth_date: null,
    bio: null,
    interests: payload.interests ?? [],
    city: null,
    region: null,
    country: null,
    instagram: null,
    twitter: null,
    website: null,
    is_public: true,
    email_verified: false,
    avatar_url: null,
    banner_url: null,
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  }
}

/**
 * Met à jour le profil d'un utilisateur existant.
 * Accessible uniquement à l'utilisateur propriétaire (RLS).
 */
export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  // Mode démo — simule une mise à jour sans persistance
  await simulateNetworkDelay('database')
  const existing = await getProfileById(userId)
  if (!existing) throw new Error('Profil introuvable')
  return { ...existing, ...payload, updated_at: new Date().toISOString() }
}

/**
 * Suit / ne suit plus un utilisateur.
 * TODO : implémenter avec table `follows` et trigger de compteur.
 */
export async function toggleFollow(
  followerId: string,
  targetId: string,
): Promise<{ following: boolean }> {
  if (isSupabaseConfigured && supabase) {
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

  // Mode démo — stub
  await simulateNetworkDelay('network')
  return { following: true }
}

// ─── Utilitaire interne ───────────────────────────────────────────────────────

/** Convertit un UserProfile mock vers le type Profile de la DB */
function _mockUserToProfile(mock: (typeof mockUsers)[number]): Profile {
  const now = new Date().toISOString()
  return {
    id: mock.id,
    username: mock.username,
    email: '',
    first_name: mock.firstName,
    last_name: mock.lastName,
    gender: mock.gender,
    birth_date: mock.birthDate,
    bio: mock.bio,
    interests: mock.interests,
    city: mock.location.city,
    region: mock.location.region,
    country: mock.location.country,
    instagram: mock.socialMedia?.instagram ?? null,
    twitter: mock.socialMedia?.twitter ?? null,
    website: mock.socialMedia?.website ?? null,
    is_public: true,
    email_verified: true,
    avatar_url: mock.avatarUrl ?? null,
    banner_url: null,
    posts_count: mock.postsCount,
    followers_count: mock.followersCount,
    following_count: mock.followingCount,
    created_at: mock.createdAt,
    updated_at: now,
    last_login_at: null,
  }
}
