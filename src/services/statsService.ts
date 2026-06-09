/**
 * statsService, Statistiques plateforme + utilisateur
 *
 * Sources :
 *  - profiles (posts_count, followers_count, following_count), compteurs dénormalisés
 *  - posts (DISTINCT taxref_id), espèces uniques observées
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
  /** Obs = CUMUL d'observations d'especes (carnets inclus). Nicolas 2026-06-09. */
  obsCount: number
  uniqueSpeciesCount: number
  followersCount: number
  followingCount: number
}

/** Stats d'observation d'un user (carnets inclus), via RPC get_user_observation_stats. */
export interface UserObservationStats {
  /** Cumul d'observations d'especes (chaque espece de chaque post compte). */
  obsTotal: number
  /** Especes distinctes (ne grossit pas si meme espece re-observee). */
  speciesTotal: number
  /** Cumul d'especes observees depuis le debut de semaine (si fourni). */
  obsWeek: number
  /** Repartition par groupe app (birds/mammals/...) pour l'ADN observateur. */
  classes: Record<string, number>
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
  /** URL de la dernière photo associée (null si aucune) */
  imageUrl: string | null
  /** Groupe taxonomique */
  category: string | null
  /** V1.1.5 NG-032 : taxref_id + scientific_name pour activer le MEME filtre
   *  espece que le chip d'un post (Species Context Layer) au clic. */
  taxrefId: string | null
  scientificName: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré, statsService indisponible')
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

/**
 * Recupere les ids des comptes marques is_internal (Nicolas admin, comptes
 * de test interne). Sert a exclure ces comptes des stats publiques pour ne
 * pas polluer les compteurs reels affiches aux users (Nicolas 2026-05-25).
 *
 * Cache de fait : la liste change rarement (1 entree actuellement), donc
 * acceptable de la requeter a chaque appel stats.
 */
async function getInternalUserIds(): Promise<string[]> {
  const c = ensureClient()
  const { data } = await c.from('profiles').select('id').eq('is_internal', true)
  return (data ?? []).map((r) => r.id)
}

/**
 * Construit la clause not-in pour PostgREST. Renvoie une chaine vide si
 * pas d ids a exclure (le caller doit alors NE PAS appliquer le filtre).
 */
function notInClause(ids: string[]): string {
  if (ids.length === 0) return ''
  return `(${ids.map((id) => `"${id}"`).join(',')})`
}

// ─── Stats globales ─────────────────────────────────────────────────────────

/**
 * Stats globales plateforme (totaux bruts).
 * Exclut les comptes is_internal=true (admin Nicolas + tests internes)
 * pour ne pas polluer les compteurs publics.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const c = ensureClient()
  const internalIds = await getInternalUserIds()
  const internalClause = notInClause(internalIds)

  const usersQuery = c
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_internal', false)
  let postsQuery = c
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
  if (internalClause) {
    postsQuery = postsQuery.not('user_id', 'in', internalClause)
  }

  const [users, posts, species] = await Promise.all([
    usersQuery,
    postsQuery,
    // V1.0.3 fix : taxref_cache n existait pas, basculer sur species_master (source de verite)
    c.from('species_master').select('id', { count: 'exact', head: true }),
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

  // Observations = CUMUL D'ESPECES (RPC get_observations_count), pas le nombre
  // de posts (Nicolas 2026-06-08 : vrai nombre d'observations reel). Un post
  // carnet a 3 especes compte pour 3, un partage mono-espece pour 1, un Instant
  // nature (sans espece) pour 0. La RPC exclut deja les comptes internes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = (c as any).rpc.bind(c) as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: number | string | null }>

  // Requêtes en parallèle : observations courante + précédente, migrateurs courant + précédent
  const [obsCurrent, obsPrevious, migCurrent, migPrevious] = await Promise.all([
    // Observations (cumul d'especes), période courante
    rpc('get_observations_count', { p_start: current }),

    // Observations, période précédente
    rpc('get_observations_count', { p_start: oldest, p_end: current }),

    // Migrateurs (comptes créés), période courante, exclut les is_internal.
    // Nicolas 2026-06-06 : on ne compte QUE les comptes réellement finalisés.
    // Un pseudo auto "user_xxxxxxxx" = onboarding non terminé (compte créé via
    // invitation mais étape pseudo non validée) -> exclu, pour un chiffre réel.
    // Finir l'onboarding implique d'avoir choisi un pseudo ET d'être connecté.
    c
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_internal', false)
      .not('username', 'like', 'user\\_%')
      .gte('created_at', current),

    // Migrateurs, période précédente (même filtre pour cohérence du trend)
    c
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_internal', false)
      .not('username', 'like', 'user\\_%')
      .gte('created_at', oldest)
      .lt('created_at', current),
  ])

  const obsCount = Number(obsCurrent.data ?? 0)
  const obsPrev = Number(obsPrevious.data ?? 0)
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
 *
 * Stratégie de fallback (PRD, Tendances) :
 *   1. Si `region` est fourni et qu'on y trouve ≥ 3 espèces → retour local.
 *   2. Sinon → fallback global plateforme.
 *
 * Récupère aussi la dernière photo associée à chaque espèce (via media).
 */
export async function getTrendingSpecies(
  period: StatsPeriod = 'week',
  region?: string | null,
): Promise<TrendingSpecies[]> {
  const c = ensureClient()
  const { current } = getPeriodBounds(period)

  /**
   * Requête + agrégation pour une zone donnée (ou globale si region = null).
   * V1.1.5 NG-032 : `withDateFilter` permet un fallback all-time quand la
   * periode courante ne donne pas assez de tendances (beta faible volume),
   * pour que la section ne paraisse jamais morte.
   */
  async function queryZone(
    zoneRegion: string | null,
    withDateFilter = true,
  ): Promise<TrendingSpecies[]> {
    let q = c
      .from('posts')
      .select('species_name, scientific_name, taxref_id, id, created_at, taxonomic_group')
      .eq('status', 'published')
      .not('species_name', 'is', null)
      .order('created_at', { ascending: false })

    if (withDateFilter) q = q.gte('created_at', current)
    if (zoneRegion) q = q.eq('region', zoneRegion)

    const { data: rows, error } = await q
    if (error) throw new Error(error.message)
    if (!rows || rows.length === 0) return []

    // Agrégat espèce → count + TOUS les postIds (par récence) + identite
    // taxonomique. On garde tous les postIds pour pouvoir trouver une photo
    // meme si le post le plus recent n'en a pas (cf regle NG-032 ci-dessous).
    type Agg = {
      count: number
      postIds: string[]
      category: string | null
      scientificName: string | null
      taxrefId: string | null
    }
    const countMap = new Map<string, Agg>()
    for (const row of rows) {
      const name = row.species_name as string
      const existing = countMap.get(name)
      if (existing) {
        existing.count++
        existing.postIds.push(row.id as string)
      } else {
        countMap.set(name, {
          count: 1,
          postIds: [row.id as string],
          category: (row.taxonomic_group as string | null) ?? null,
          scientificName: (row.scientific_name as string | null) ?? null,
          taxrefId: (row.taxref_id as string | null) ?? null,
        })
      }
    }

    // Tri par count décroissant (toutes especes — le filtre photo se fait
    // ensuite, donc on ne slice pas encore a 3 ici).
    const sorted = [...countMap.entries()].sort((a, b) => b[1].count - a[1].count)

    // Recupere les photos de TOUS les posts candidats (image reelle prete).
    const allPostIds = sorted.flatMap(([, v]) => v.postIds)
    const imageMap = new Map<string, string>()
    if (allPostIds.length > 0) {
      const { data: mediaRows } = await c
        .from('media')
        .select('post_id, url, display_order')
        .in('post_id', allPostIds)
        .eq('status', 'ready')
        .order('display_order', { ascending: true })
      for (const m of mediaRows ?? []) {
        if (!imageMap.has(m.post_id)) imageMap.set(m.post_id, m.url)
      }
    }

    // Regle NG-032 (Nicolas 2026-06-03) : une espece n'apparait dans les
    // tendances QUE si au moins une de ses observations possede une photo.
    // On cherche la 1ere photo dispo parmi les posts de l'espece (du plus
    // recent au plus ancien). Aucune photo -> espece exclue. On s'arrete a 3.
    const result: TrendingSpecies[] = []
    for (const [name, agg] of sorted) {
      if (result.length >= 3) break
      const photoUrl = agg.postIds.map((id) => imageMap.get(id)).find((u): u is string => !!u)
      if (!photoUrl) continue // pas de photo -> on ne comptabilise pas (regle stricte)
      result.push({
        name,
        observations: agg.count,
        imageUrl: photoUrl,
        category: agg.category,
        taxrefId: agg.taxrefId,
        scientificName: agg.scientificName,
      })
    }
    return result
  }

  // 1. Tentative locale si région fournie (sur la période)
  if (region) {
    const local = await queryZone(region)
    if (local.length >= 3) return local
    // Fallback : la zone n'a pas assez de données, on bascule en global
  }

  // 2. Global plateforme (sur la période)
  const global = await queryZone(null)
  if (global.length > 0) return global

  // 3. V1.1.5 NG-032 : fallback all-time (sans filtre de date). En beta, une
  // periode courte peut etre vide ; on remonte alors les dernieres especes
  // identifiees toutes periodes confondues pour garder la section vivante.
  return queryZone(null, false)
}

// ─── Stats utilisateur ──────────────────────────────────────────────────────

/** Stats d'un utilisateur (profil sidebar). */
/**
 * Stats d'observation cumulatives d'un user, CARNETS INCLUS (Nicolas
 * 2026-06-09). Une espece de carnet compte comme une observation a part
 * entiere. Obs = cumul ; Especes = distinctes. Via la RPC
 * get_user_observation_stats (SECURITY INVOKER, observations publiques des
 * carnets publies lisibles -> coherent quel que soit le viewer).
 *
 * @param weekStart si fourni (ISO), obsWeek = cumul d'especes depuis cette date.
 */
export async function getUserObservationStats(
  userId: string,
  weekStart?: string,
): Promise<UserObservationStats> {
  const c = ensureClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (c as any).rpc('get_user_observation_stats', {
    p_user_id: userId,
    p_week_start: weekStart ?? null,
  })
  if (error) throw new Error(error.message)
  const j = (data ?? {}) as {
    obs_total?: number
    species_total?: number
    obs_week?: number
    classes?: Record<string, number>
  }
  return {
    obsTotal: Number(j.obs_total ?? 0),
    speciesTotal: Number(j.species_total ?? 0),
    obsWeek: Number(j.obs_week ?? 0),
    classes: j.classes ?? {},
  }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const c = ensureClient()

  // Compteurs dénormalisés (followers/following/posts) + stats d'observation
  // CARNETS INCLUS (cumul especes + especes distinctes) en parallele.
  const [{ data: profile, error: pErr }, obs] = await Promise.all([
    c
      .from('profiles')
      .select('posts_count, followers_count, following_count')
      .eq('id', userId)
      .maybeSingle(),
    getUserObservationStats(userId),
  ])
  if (pErr) throw new Error(pErr.message)

  return {
    postsCount: profile?.posts_count ?? 0,
    obsCount: obs.obsTotal,
    uniqueSpeciesCount: obs.speciesTotal,
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
 * Calcule le streak hebdomadaire (NG-008, Nicolas 2026-05-31).
 *
 * Une serie reste active si l user publie au moins 2 observations dans une
 * periode glissante de 7 jours (lundi -> dimanche). Compte le nombre de
 * semaines consecutives, en partant de la semaine courante et en remontant
 * dans le temps. Stop des qu une semaine a moins de 2 posts.
 *
 * Le passage du streak quotidien -> hebdomadaire reflete la realite des
 * naturalistes : sorties terrain rares (meteo, dispos), mais regulieres
 * sur l echelle de la semaine. Evite la frustration "j ai loupe une journee
 * j ai perdu mon streak".
 *
 * Valeur retournee = nombre de semaines consecutives. La semaine en cours
 * compte uniquement si le seuil de 2 posts est deja atteint (sinon on
 * compte a partir de la semaine precedente, pour ne pas demarrer a 0 en
 * milieu de semaine apres une seule publication).
 */
export async function getUserStreak(userId: string): Promise<number> {
  const c = ensureClient()

  // Fenetre d analyse : 52 semaines = 1 an. Largement suffisant pour
  // afficher un streak realiste en beta + capper le cout de la requete.
  const oneYearAgo = new Date(Date.now() - 52 * 7 * 86_400_000).toISOString()
  const { data: rows, error } = await c
    .from('posts')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('created_at', oneYearAgo)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return 0

  // Pour chaque post, on calcule la cle de sa semaine ISO (debut = lundi).
  // Cle au format YYYY-MM-DD du lundi de cette semaine. Permet de grouper
  // sans dependance lourde (pas de date-fns).
  function getMondayOfWeek(d: Date): string {
    const day = d.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    const offset = day === 0 ? -6 : 1 - day // dimanche -> -6, lundi -> 0
    const monday = new Date(d.getTime() + offset * 86_400_000)
    return monday.toISOString().slice(0, 10)
  }

  // Compte les posts par semaine ISO
  const postsByWeek = new Map<string, number>()
  for (const r of rows) {
    const weekKey = getMondayOfWeek(new Date(r.created_at as string))
    postsByWeek.set(weekKey, (postsByWeek.get(weekKey) ?? 0) + 1)
  }

  // Parcourt les semaines en remontant depuis maintenant. Seuil = 2 posts/semaine.
  const THRESHOLD = 2
  const today = new Date()
  const currentWeekKey = getMondayOfWeek(today)
  let streak = 0
  // Si la semaine en cours n a pas encore atteint le seuil, on demarre le
  // comptage a la semaine precedente pour ne pas afficher 0 a un user actif.
  const startOffset = (postsByWeek.get(currentWeekKey) ?? 0) >= THRESHOLD ? 0 : 1
  for (let i = startOffset; i < 52; i++) {
    const weekDate = new Date(today.getTime() - i * 7 * 86_400_000)
    const weekKey = getMondayOfWeek(weekDate)
    if ((postsByWeek.get(weekKey) ?? 0) >= THRESHOLD) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Progression hebdomadaire : nombre de posts cette semaine (lundi → maintenant).
 *
 * L'objectif est lu depuis `profiles.week_goal` (source de vérité, c'est ce
 * que l'user édite dans son profil). Nicolas 2026-05-24 : avant on lisait
 * `user_settings.weekly_goal` qui n'est jamais alimenté → fallback 5 alors
 * que l'user avait défini 12 dans son profil. Désormais une seule source.
 */
export async function getWeekProgress(userId: string): Promise<WeekProgress> {
  const c = ensureClient()

  // Calcule le lundi de cette semaine (ISO week)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dim, 1=lun, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now.getTime() - mondayOffset * 86_400_000)
  monday.setHours(0, 0, 0, 0)

  // Cumul d'ESPECES observees cette semaine (carnets inclus : 4 especes dans un
  // post = 4 obs cette semaine), Nicolas 2026-06-09. + objectif depuis profiles.
  const [obs, profileResult] = await Promise.all([
    getUserObservationStats(userId, monday.toISOString()),
    c.from('profiles').select('week_goal').eq('id', userId).maybeSingle(),
  ])

  return {
    current: obs.obsWeek,
    goal: (profileResult.data as { week_goal?: number | null } | null)?.week_goal ?? 5,
  }
}
