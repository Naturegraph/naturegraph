/**
 * postService — Couche d'accès aux données publications
 *
 * Abstrait les appels Supabase derrière une interface stable.
 * En mode démo (isSupabaseConfigured = false), retourne des données mockées.
 *
 * TODO backend :
 *  - Remplacer les retours mock par les vraies requêtes Supabase
 *  - Activer les RLS policies sur la table `posts`
 *  - Brancher le storage Supabase pour les médias
 *  - Implémenter la pagination cursor-based (keyset pagination)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Post, PostFeedItem, ReactionType } from '@/types/database'
import { simulateNetworkDelay, calculatePagination } from '@/constants/config'
import { mockPosts } from '@/data/mockPosts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedParams {
  page?: number
  limit?: number
  /** 'recent' | 'popular' | 'for_you' | 'trending' */
  tab?: 'recent' | 'popular' | 'for_you' | 'trending'
}

export interface FeedResult {
  data: PostFeedItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface CreatePostPayload {
  type: Post['type']
  description: string
  visibility?: Post['visibility']
  encounter_date: string
  time_of_day?: Post['time_of_day']
  weather?: Post['weather']
  habitat?: Post['habitat']
  city?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
  location_name?: string
  location_hidden?: boolean
  species_name?: string
  scientific_name?: string
  taxonomic_group?: Post['taxonomic_group']
  taxref_id?: string
  tags?: string[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Récupère le feed principal avec pagination.
 */
export async function getFeed(params: FeedParams = {}): Promise<FeedResult> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { page = 1, limit = 20, tab = 'recent' } = params

  if (isSupabaseConfigured && supabase) {
    // TODO : implémenter la requête Supabase avec join author + media
    // Exemple de requête à venir :
    // const { data, error, count } = await supabase
    //   .from('posts')
    //   .select('*, author:profiles(*), media(*)', { count: 'exact' })
    //   .eq('status', 'published')
    //   .eq('visibility', 'public')
    //   .order('created_at', { ascending: false })
    //   .range((page - 1) * limit, page * limit - 1)
    throw new Error('getFeed Supabase : non implémenté — à compléter lors du branchement backend')
  }

  // Mode démo — retourne les mockPosts avec pagination simulée
  await simulateNetworkDelay('network')

  // Convertir MockPost → PostFeedItem (approximatif — structure légèrement différente)
  const allPosts = mockPosts.map((p) => ({
    id: p.id,
    user_id: p.author.name,
    type: 'nature_encounter' as Post['type'],
    status: 'published' as Post['status'],
    visibility: 'public' as Post['visibility'],
    description: p.content,
    tags: [p.species],
    city: p.location,
    region: null,
    country: null,
    latitude: null,
    longitude: null,
    location_name: p.location,
    location_hidden: false,
    encounter_date: p.date,
    time_of_day: null,
    weather: null,
    habitat: null,
    multiple_observations: false,
    species_identified: true,
    species_name: p.species,
    scientific_name: null,
    taxonomic_group: null,
    identification_status: 'identified' as Post['identification_status'],
    taxref_id: null,
    taxref_rank: null,
    taxref_source: null,
    taxref_license: null,
    taxref_updated_at: null,
    phenomenon: null,
    likes_count: Object.values(p.reactions).reduce((s, v) => s + v, 0),
    comments_count: p.comments,
    shares_count: 0,
    views_count: 0,
    created_at: p.date,
    updated_at: p.date,
    published_at: p.date,
    author: {
      id: p.author.name,
      username: p.author.name,
      first_name: p.author.name,
      last_name: '',
      avatar_url: p.author.avatar,
    },
    media: p.images.map((img, i) => ({
      id: `${p.id}-media-${i}`,
      post_id: p.id,
      user_id: p.author.name,
      type: 'photo' as const,
      format: null,
      orientation: null,
      status: 'ready' as const,
      url: img.url,
      thumbnail_url: null,
      original_url: null,
      display_order: i,
      alt: img.alt,
      width: null,
      height: null,
      file_size: null,
      mime_type: null,
      captured_at: null,
      camera: null,
      lens: null,
      focal_length: null,
      aperture: null,
      iso: null,
      shutter_speed: null,
      gps_latitude: null,
      gps_longitude: null,
      created_at: p.date,
      updated_at: p.date,
    })),
    user_reaction: null as ReactionType | null,
  })) satisfies PostFeedItem[]

  return calculatePagination(allPosts, page, limit) as FeedResult
}

/**
 * Récupère un post par son ID avec toutes ses relations.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPostById(postId: string): Promise<PostFeedItem | null> {
  if (isSupabaseConfigured && supabase) {
    // TODO : implémenter
    throw new Error('getPostById Supabase : non implémenté')
  }

  await simulateNetworkDelay('database')
  return null
}

/**
 * Crée un nouveau post.
 * TODO : gérer l'upload des médias en parallèle.
 */
export async function createPost(userId: string, payload: CreatePostPayload): Promise<Post> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        ...payload,
        status: 'published',
        identification_status: payload.species_name ? 'identified' : 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  // Mode démo — stub
  await simulateNetworkDelay('database')
  throw new Error('createPost : non disponible en mode démo')
}

/**
 * Ajoute ou retire une réaction à un post.
 */
export async function toggleReaction(
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<{ added: boolean }> {
  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
      return { added: false }
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: userId, type })
      return { added: true }
    }
  }

  // Mode démo — stub
  await simulateNetworkDelay('cache')
  return { added: true }
}
