/**
 * postService — Couche d'accès aux données publications
 *
 * Abstrait les appels Supabase derrière une interface stable.
 * En mode démo (isSupabaseConfigured = false), retourne des données mockées.
 *
 * Architecture :
 *  - getFeed        : SELECT posts + join profiles + join media, paginé
 *  - getPostById    : SELECT single post avec toutes ses relations
 *  - createPost     : INSERT post (sans médias — mediaService gère l'upload séparé)
 *  - toggleReaction : INSERT / DELETE sur reactions, trigger met à jour likes_count
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Post, PostFeedItem, ReactionType } from '@/types/database'
import { simulateNetworkDelay, calculatePagination } from '@/constants/config'
import { mockPosts } from '@/data/mock/mockPosts'

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

// Sélecteur de colonnes utilisé dans les requêtes feed — centralisé pour cohérence
const POST_FEED_SELECT = `
  *,
  author:profiles!user_id(id, username, first_name, last_name, avatar_url),
  media(id, post_id, user_id, type, format, orientation, status, url, thumbnail_url,
        original_url, display_order, alt, width, height, file_size, mime_type,
        captured_at, camera, lens, focal_length, aperture, iso, shutter_speed,
        gps_latitude, gps_longitude, created_at, updated_at)
` as const

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Récupère le feed principal avec pagination.
 *
 * Onglets :
 *  - recent   : tri par date de création DESC (défaut)
 *  - popular  : tri par likes_count DESC
 *  - for_you  : posts des utilisateurs suivis (nécessite auth)
 *  - trending : popular des 48 dernières heures
 */
export async function getFeed(params: FeedParams = {}): Promise<FeedResult> {
  const { page = 1, limit = 20, tab = 'recent' } = params
  const offset = (page - 1) * limit

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('posts')
      .select(POST_FEED_SELECT, { count: 'exact' })
      .eq('status', 'published')
      .eq('visibility', 'public')

    // Tri selon l'onglet actif
    if (tab === 'popular') {
      query = query.order('likes_count', { ascending: false })
    } else if (tab === 'trending') {
      // Posts populaires des 48 dernières heures
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      query = query
        .gte('published_at', cutoff)
        .order('likes_count', { ascending: false })
    } else {
      // 'recent' et 'for_you' (for_you = recent sans personnalisation pour le MVP)
      query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    const total = count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: (data ?? []) as unknown as PostFeedItem[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    }
  }

  // ── Mode démo : retourne les mockPosts convertis ──────────────────────────
  await simulateNetworkDelay('network')

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
 * Utilisé pour la page de détail d'un post et les partages.
 */
export async function getPostById(postId: string): Promise<PostFeedItem | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_FEED_SELECT)
      .eq('id', postId)
      .single()

    if (error) {
      // code PGRST116 = 0 rows — post non trouvé ou non accessible (RLS)
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    return data as unknown as PostFeedItem
  }

  // Mode démo — cherche dans les mocks
  await simulateNetworkDelay('database')
  return null
}

/**
 * Crée un nouveau post (texte uniquement).
 * Les médias sont uploadés séparément via mediaService, puis rattachés
 * via INSERT dans la table media avec le post_id retourné.
 */
export async function createPost(userId: string, payload: CreatePostPayload): Promise<Post> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        ...payload,
        status: 'published' as const,
        published_at: new Date().toISOString(),
        identification_status: (payload.species_name ? 'identified' : 'pending') as Post['identification_status'],
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as unknown as Post
  }

  // Mode démo — non disponible (impossible de persister sans backend)
  await simulateNetworkDelay('database')
  throw new Error('createPost : non disponible en mode démo')
}

/**
 * Ajoute ou retire une réaction à un post.
 * Le trigger update_likes_count met à jour posts.likes_count automatiquement.
 *
 * Types valides : 'love' | 'admire' | 'fire' | 'wow' | 'curious' | 'disappointed'
 */
export async function toggleReaction(
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<{ added: boolean }> {
  if (isSupabaseConfigured && supabase) {
    // Vérifie si une réaction existe déjà pour cet user + post (UNIQUE constraint)
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', (existing as { id: string }).id)
      return { added: false }
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: userId, type })
      return { added: true }
    }
  }

  // Mode démo — stub non persisté
  await simulateNetworkDelay('cache')
  return { added: true }
}
