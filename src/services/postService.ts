/**
 * postService — Couche d'accès aux données publications (Supabase)
 *
 * Architecture :
 *  - getFeed        : SELECT posts + join profiles + join media, paginé
 *  - getPostById    : SELECT single post avec toutes ses relations
 *  - createPost     : INSERT post (sans médias — mediaService gère l'upload séparé)
 *  - toggleReaction : INSERT / DELETE sur reactions, trigger met à jour likes_count
 */

import { supabase } from '@/lib/supabase'
import type { Post, PostFeedItem, ReactionType } from '@/types/database'

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

  if (!supabase) throw new Error('Supabase non configuré')

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
    query = query.gte('published_at', cutoff).order('likes_count', { ascending: false })
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

/**
 * Récupère un post par son ID avec toutes ses relations.
 * Utilisé pour la page de détail d'un post et les partages.
 */
export async function getPostById(postId: string): Promise<PostFeedItem | null> {
  if (!supabase) throw new Error('Supabase non configuré')

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

/**
 * Crée un nouveau post (texte uniquement).
 * Les médias sont uploadés séparément via mediaService, puis rattachés
 * via INSERT dans la table media avec le post_id retourné.
 */
export async function createPost(userId: string, payload: CreatePostPayload): Promise<Post> {
  if (!supabase) throw new Error('Supabase non configuré')

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      ...payload,
      status: 'published' as const,
      published_at: new Date().toISOString(),
      identification_status: (payload.species_name
        ? 'identified'
        : 'pending') as Post['identification_status'],
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Post
}

/**
 * Récupère les réactions de l'utilisateur connecté pour une liste de posts.
 * Retourne un Map<postId, ReactionType> pour lookup O(1) dans le feed.
 */
export async function getUserReactions(
  userId: string,
  postIds: string[],
): Promise<Record<string, ReactionType>> {
  if (!supabase || postIds.length === 0) return {}

  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, type')
    .eq('user_id', userId)
    .in('post_id', postIds)

  if (error) return {}

  const map: Record<string, ReactionType> = {}
  for (const row of data ?? []) {
    map[row.post_id] = row.type as ReactionType
  }
  return map
}

/**
 * Ajoute, change ou retire une réaction à un post.
 *
 * Logique :
 *  - Aucune réaction existante → INSERT (added: true)
 *  - Même type déjà actif → DELETE (toggle off, added: false)
 *  - Type différent → DELETE + INSERT (changement, added: true)
 *
 * Le trigger trg_reactions_counters met à jour posts.likes_count automatiquement.
 * Le trigger trg_notify_on_reaction crée une notification pour l'auteur du post.
 *
 * Retourne le type actif après l'opération (null si supprimé).
 */
export async function toggleReaction(
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<{ added: boolean; activeType: ReactionType | null }> {
  if (!supabase) throw new Error('Supabase non configuré')

  // Vérifie si une réaction existe (PK composite: post_id + user_id)
  const { data: existing } = await supabase
    .from('reactions')
    .select('type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const existingType = (existing as { type: string }).type

    if (existingType === type) {
      // Même type → toggle off (supprimer)
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId)
      return { added: false, activeType: null }
    } else {
      // Type différent → remplacer (delete + insert pour déclencher les triggers)
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('reactions').insert({ post_id: postId, user_id: userId, type })
      return { added: true, activeType: type }
    }
  } else {
    // Pas de réaction → créer
    await supabase.from('reactions').insert({ post_id: postId, user_id: userId, type })
    return { added: true, activeType: type }
  }
}
