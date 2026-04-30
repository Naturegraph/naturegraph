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

/**
 * Filtres appliqués au feed — schéma aligné avec FeedFilterPanel.
 * Chaque filtre est optionnel et appliqué uniquement s'il a une valeur non par défaut.
 */
export interface FeedFilterParams {
  /** Valeurs de posts.taxonomic_group (ex: ['birds', 'mammals']) */
  categories?: string[]
  /** Ne garder que les posts avec identification_status = 'pending' (demandes d'aide) */
  helpOnly?: boolean
  /** Filtre par type de partage (type = 'nature_encounter' | 'nature_instant') */
  shareTypes?: { encounter: boolean; instant: boolean }
  /** Période relative à maintenant, filtre sur published_at */
  period?: 'all' | 'today' | 'week' | 'month'
  /**
   * Rayon en km (0 = pas de filtre).
   * Le filtrage radius est appliqué côté hook (useFeed) via Haversine client-side,
   * car PostgREST n'expose pas ST_DWithin directement. La valeur est ignorée ici
   * mais conservée pour que la clé de cache React Query change quand elle varie.
   */
  radiusKm?: number
}

export interface FeedParams {
  page?: number
  limit?: number
  /** 'recent' | 'popular' | 'for_you' | 'trending' */
  tab?: 'recent' | 'popular' | 'for_you' | 'trending'
  filters?: FeedFilterParams
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
  /** Titre court optionnel (null-safe côté DB — colonne `posts.title`). */
  title?: string
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
  /** Format d'affichage choisi par l'utilisateur (Figma 6385:47324).
   *  Default DB = '16:9' si non fourni. */
  display_format?: Post['display_format']
}

// Sélecteur de colonnes utilisé dans les requêtes feed — centralisé pour cohérence
const POST_FEED_SELECT = `
  *,
  author:profiles!user_id(id, username, first_name, last_name, avatar_url),
  media(id, post_id, user_id, type, format, orientation, status, url, thumbnail_url,
        original_url, display_order, alt, width, height, file_size, mime_type,
        is_cover, license, created_at, updated_at)
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
  const { page = 1, limit = 20, tab = 'recent', filters } = params
  const offset = (page - 1) * limit

  if (!supabase) throw new Error('Supabase non configuré')

  let query = supabase
    .from('posts')
    .select(POST_FEED_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .eq('visibility', 'public')

  // ─── Filtres utilisateur (FeedFilterPanel) ─────────────────────────────
  if (filters?.categories && filters.categories.length > 0) {
    // Catégories d'espèces → colonne indexée posts.taxonomic_group
    query = query.in('taxonomic_group', filters.categories)
  }

  if (filters?.helpOnly) {
    // Proxy "demandes d'aide" : posts encore en attente d'identification.
    // À remplacer par une colonne dédiée help_request lors d'une future migration.
    query = query.eq('identification_status', 'pending')
  }

  if (filters?.shareTypes) {
    // On construit la liste des types sélectionnés. Si les deux sont décochés →
    // on force un filtre vide (aucun résultat) plutôt que d'ignorer silencieusement.
    const activeTypes: string[] = []
    if (filters.shareTypes.encounter) activeTypes.push('nature_encounter')
    if (filters.shareTypes.instant) activeTypes.push('nature_instant')
    if (activeTypes.length === 0) {
      // Aucun type actif → retourner 0 résultat sans requête inutile.
      return {
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrevious: false },
      }
    }
    // On filtre seulement si subset (évite .in() qui inclut tout si les 2 types sont actifs).
    if (activeTypes.length === 1) {
      query = query.eq('type', activeTypes[0])
    }
  }

  if (filters?.period && filters.period !== 'all') {
    // Mapping période → cutoff ISO sur published_at
    const now = Date.now()
    const msPerDay = 86_400_000
    const cutoffMs: Record<'today' | 'week' | 'month', number> = {
      today: now - msPerDay,
      week: now - 7 * msPerDay,
      month: now - 30 * msPerDay,
    }
    const cutoff = new Date(cutoffMs[filters.period]).toISOString()
    query = query.gte('published_at', cutoff)
  }

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

  // Si un filtre de rayon est actif, on élargit la fenêtre pour compenser le
  // filtrage client-side Haversine (effectué dans useFeed).
  const fetchLimit = filters?.radiusKm && filters.radiusKm > 0 ? limit * 5 : limit
  const { data, error, count } = await query.range(offset, offset + fetchLimit - 1)

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

  const insertPayload = {
    user_id: userId,
    ...payload,
    status: 'published' as const,
    published_at: new Date().toISOString(),
    identification_status: (payload.species_name
      ? 'identified'
      : 'pending') as Post['identification_status'],
  }

  const { data, error } = await supabase.from('posts').insert(insertPayload).select().single()
  if (error) throw new Error(error.message)
  return data as Post
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
