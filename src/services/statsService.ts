/**
 * statsService — Statistiques plateforme + utilisateur
 *
 * Sources :
 *  - profiles (posts_count, followers_count, following_count) — compteurs dénormalisés
 *  - posts (DISTINCT taxref_id) — espèces uniques observées
 *  - count(*) global pour la plateforme
 *
 * Fonctions :
 *  - getPlatformStats()        → totaux bruts (posts, users, species)
 *  - getImpactStats(period)    → observations + migrateurs avec trend % vs période précédente
 *  - getTrendingSpecies(period, region?) → top 3 espèces les plus observées
 *  - getUserStats(userId)      → stats individuelles
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

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

export type StatsPeriod = 'week' | 'month' | 'quarter'

export interface ImpactStats {
  /** Nombre total d'observations publiées sur la période */
  observations: number
  /** Trend % vs période précédente (ex: +12 → 12, -5 → -5) */
  observationsTrend: number
  /** Nombre de comptes créés sur la période */
  migrateurs: number
  /** Trend % vs période précédente */
  migrateursTrend: number
}

export interface TrendingSpecies {
  /** Nom commun de l'espèce */
  name: string
  /** Nombre d'observations sur la période */
  observations: number
  /** URL de la première photo associée (null si aucune) */
  imageUrl: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré — statsService indisponible')
  }
  return supabase
}

/** Calcule les bornes ISO de la période courante et précédente */
function getPeriodBounds(period: StatsPeriod): {
  current: string
  previous: string
  oldest: string
} {
  const now = new Date()
  const msPerDay = 86_400_000

  const daysMap: Record<StatsPeriod, number> = {
    week: 7,
    month: 30,
    quarter: 90,
  }

  const days = daysMap[period]
  const current = new Date(now.getTime() - days * msPerDay).toISOString()
  const previous = new Date(now.getTime() - 2 * days * msPerDay).toISOString()

  return { current, previous, oldest: previous }
}

/** Calcule le pourcentage de variation entre deux valeurs */
function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// ─── Stats globales ─────────────────────────────────────────────────────────

/** Stats globales plateforme (totaux bruts). */
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

// ─── Impact stats (homepage sidebar) ────────────────────────────────────────

/**
 * Stats "Impact" pour la sidebar homepage.
 * Observations = posts publiés sur la période.
 * Migrateurs = comptes créés sur la période.
 * Chaque valeur inclut un trend % vs la période précédente identique.
 */
export async function getImpactStats(period: StatsPeriod = 'month'): Promise<ImpactStats> {
  const c = ensureClient()
  const { current, oldest } = getPeriodBounds(period)

  // Requêtes en parallèle : observations courante + précédente, migrateurs courant + précédent
  const [obsCurrent, obsPrevious, migCurrent, migPrevious] = await Promise.all([
    // Observations (posts publiés) — période courante
    c
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', current),

    // Observations — période précédente
    c
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', oldest)
      .lt('created_at', current),

    // Migrateurs (comptes créés) — période courante
    c.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', current),

    // Migrateurs — période précédente
    c
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oldest)
      .lt('created_at', current),
  ])

  const obsCount = obsCurrent.count ?? 0
  const obsPrev = obsPrevious.count ?? 0
  const migCount = migCurrent.count ?? 0
  const migPrev = migPrevious.count ?? 0

  return {
    observations: obsCount,
    observationsTrend: trendPercent(obsCount, obsPrev),
    migrateurs: migCount,
    migrateursTrend: trendPercent(migCount, migPrev),
  }
}

// ─── Tendances (homepage sidebar) ───────────────────────────────────────────

/**
 * Top 3 espèces les plus observées sur la période.
 * Si `region` est fourni → filtre par région (utilisateur géolocalisé).
 * Sinon → global sur toute la plateforme.
 *
 * Récupère aussi la première photo associée à chaque espèce (via media).
 */
export async function getTrendingSpecies(
  period: StatsPeriod = 'week',
  region?: string | null,
): Promise<TrendingSpecies[]> {
  const c = ensureClient()
  const { current } = getPeriodBounds(period)

  // Récupère les posts publiés avec une espèce identifiée sur la période
  let query = c
    .from('posts')
    .select('species_name, id')
    .eq('status', 'published')
    .not('species_name', 'is', null)
    .gte('created_at', current)

  // Filtre par région si géolocalisé
  if (region) {
    query = query.eq('region', region)
  }

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return []

  // Comptage côté client (Supabase JS ne supporte pas GROUP BY nativement)
  const countMap = new Map<string, { count: number; postId: string }>()
  for (const row of rows) {
    const name = row.species_name as string
    const existing = countMap.get(name)
    if (existing) {
      existing.count++
    } else {
      countMap.set(name, { count: 1, postId: row.id as string })
    }
  }

  // Tri par count décroissant, top 3
  const sorted = [...countMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3)

  // Récupère une image pour chaque espèce (premier media du premier post)
  const postIds = sorted.map(([, v]) => v.postId)
  const { data: mediaRows } = await c
    .from('media')
    .select('post_id, url')
    .in('post_id', postIds)
    .eq('status', 'ready')
    .order('position', { ascending: true })

  // Map postId → première image
  const imageMap = new Map<string, string>()
  for (const m of mediaRows ?? []) {
    if (!imageMap.has(m.post_id)) {
      imageMap.set(m.post_id, m.url)
    }
  }

  return sorted.map(([name, { count, postId }]) => ({
    name,
    observations: count,
    imageUrl: imageMap.get(postId) ?? null,
  }))
}

// ─── Stats utilisateur ──────────────────────────────────────────────────────

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

// ─── Streak + progression hebdomadaire ──────────────────────────────────────

export interface WeekProgress {
  /** Nombre de posts publiés cette semaine (lundi → dimanche) */
  current: number
  /** Objectif hebdomadaire (fixé à 5 par défaut, à personnaliser Sprint 4) */
  goal: number
}

/**
 * Calcule le streak de jours consécutifs avec au moins un post publié.
 * Compte à rebours depuis aujourd'hui — s'arrête dès qu'un jour sans post est trouvé.
 */
export async function getUserStreak(userId: string): Promise<number> {
  const c = ensureClient()

  // Récupère les dates de publication des 90 derniers jours (max streak raisonnable)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: rows, error } = await c
    .from('posts')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return 0

  // Extraire les dates uniques (YYYY-MM-DD) en set
  const postDates = new Set(rows.map((r) => (r.created_at as string).slice(0, 10)))

  // Parcourir jour par jour depuis aujourd'hui
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const dateStr = d.toISOString().slice(0, 10)
    if (postDates.has(dateStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Progression hebdomadaire : nombre de posts cette semaine (lundi → maintenant).
 * L'objectif est lu depuis user_settings.weekly_goal (défaut 5).
 */
export async function getWeekProgress(userId: string): Promise<WeekProgress> {
  const c = ensureClient()

  // Calcule le lundi de cette semaine (ISO week)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dim, 1=lun, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now.getTime() - mondayOffset * 86_400_000)
  monday.setHours(0, 0, 0, 0)

  // Requêtes en parallèle : posts cette semaine + objectif personnalisé
  const [postsResult, settingsResult] = await Promise.all([
    c
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'published')
      .gte('created_at', monday.toISOString()),
    c.from('user_settings').select('weekly_goal').eq('user_id', userId).maybeSingle(),
  ])

  if (postsResult.error) throw new Error(postsResult.error.message)

  return {
    current: postsResult.count ?? 0,
    goal: (settingsResult.data as { weekly_goal?: number } | null)?.weekly_goal ?? 5,
  }
}
