/**
 * followService — Suivi d'utilisateurs
 *
 * Table `follows` — RLS : on ne peut suivre que pour soi-même.
 * Utilisé par les boutons Follow / Unfollow et par "Ne plus suivre" du
 * PostOptionsMenu (second-agent/12).
 */

import { supabase } from '@/lib/supabase'

/**
 * Suit un utilisateur. Idempotent : si déjà suivi, ne fait rien (PK unique).
 */
export async function follow(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })
  // 23505 = duplicate PK = on ignore (déjà suivi)
  if (error && error.code !== '23505') throw new Error(error.message)
}

/**
 * Arrête de suivre un utilisateur. Idempotent : aucun effet si pas suivi.
 */
export async function unfollow(targetUserId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
  if (error) throw new Error(error.message)
}

// ─── Listings (page Profil > onglet Communauté) ───────────────────────────────

/**
 * Profil minimal renvoyé par getFollowers / getFollowing.
 * Aligné avec `CommunityUser` (UI) — l'adaptateur dans le hook se charge
 * de mapper les noms de champs si besoin.
 */
export interface CommunityProfile {
  id: string
  username: string
  avatar_url: string | null
  banner_url: string | null
  followers_count: number
  /** Vrai si l'utilisateur connecté suit déjà cette personne. */
  is_followed_by_me: boolean
}

/**
 * Liste les profils qui suivent `userId` (= migrateurs / followers).
 *
 * Implémentation : 2 requêtes (limite RLS PostgREST sans embed sur jointure
 * via clé non-PK). On lit d'abord les `follower_id`, puis on charge les
 * profils correspondants. Pour < 50 followers c'est négligeable.
 *
 * @param userId  ID du profil dont on veut les followers
 * @param limit   Nombre max retourné (défaut 50)
 */
export async function getFollowers(userId: string, limit = 50): Promise<CommunityProfile[]> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data: rows, error } = await supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return []

  return hydrateCommunityProfiles(rows.map((r) => r.follower_id))
}

/**
 * Liste les profils suivis par `userId` (= migrations / following).
 */
export async function getFollowing(userId: string, limit = 50): Promise<CommunityProfile[]> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data: rows, error } = await supabase
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return []

  return hydrateCommunityProfiles(rows.map((r) => r.following_id))
}

/**
 * Charge les profils correspondants aux IDs + flag `is_followed_by_me` de
 * l'utilisateur connecté. Helper interne pour getFollowers / getFollowing.
 */
async function hydrateCommunityProfiles(ids: string[]): Promise<CommunityProfile[]> {
  if (!supabase || ids.length === 0) return []

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, banner_url, followers_count')
    .in('id', ids)
  if (error) throw new Error(error.message)
  if (!profiles) return []

  // Lookup des follows existants pour l'utilisateur connecté (1 requête).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let followedSet = new Set<string>()
  if (user) {
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', ids)
    followedSet = new Set((myFollows ?? []).map((r) => r.following_id))
  }

  // Préserve l'ordre `ids` (= ordre chronologique de la table follows).
  const byId = new Map(profiles.map((p) => [p.id, p] as const))
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      banner_url: p.banner_url,
      // Coerce null → 0 (compteur denormalisé peut être null sur des profils
      // anciens créés avant le trigger de maintenance — cas marginal).
      followers_count: p.followers_count ?? 0,
      is_followed_by_me: followedSet.has(p.id),
    }))
}

/**
 * Indique si l'user connecté suit déjà la cible.
 * Retourne false si l'user n'est pas authentifié.
 */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  if (!supabase) return false
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()
  if (error) return false
  return !!data
}
