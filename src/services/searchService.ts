/**
 * searchService — Recherche globale (profiles + posts + taxref_cache)
 *
 * MVP : ILIKE simple. Sprint suivant : full-text search via tsvector.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface ProfileHit {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface SpeciesHit {
  taxref_id: string
  scientific_name: string
  common_name: string | null
  group_label: string | null
}

/** Recherche profils par username, prenom, nom. */
export async function searchProfiles(query: string, limit = 10): Promise<ProfileHit[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const q = query.trim()
  if (q.length < 2) return []

  const pattern = `%${q}%`
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url')
    .or(`username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ProfileHit[]
}

/** Recherche especes via le cache taxref local. */
export async function searchSpecies(query: string, limit = 10): Promise<SpeciesHit[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const q = query.trim()
  if (q.length < 2) return []

  const pattern = `%${q}%`
  const { data, error } = await supabase
    .from('taxref_cache')
    .select('*')
    .or(`scientific_name.ilike.${pattern},common_name.ilike.${pattern}`)
    .limit(limit)

  if (error) {
    // Cas ou la table n'existe pas / colonnes differentes : on echoue silencieusement
    console.warn('[searchService] taxref_cache search failed', error.message)
    return []
  }
  return (data ?? []) as unknown as SpeciesHit[]
}
