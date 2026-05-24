/**
 * AdminAnalytics — Module 6 : Analytics produit approfondie
 *
 * Page dédiée aux indicateurs métier et engagement, complémentaire du
 * Dashboard (qui reste un aperçu opérationnel). Cible : décisions produit
 * avant et pendant le lancement beta.
 *
 * Widgets implémentés (Nicolas 2026-05-24) :
 *   1. KPIs phase courante vs objectifs (Phase 1 ou Phase 2 selon date)
 *   2. Top centres d'intérêt (% users avec interest X dans `interests[]`)
 *   3. Heatmap horaire des publications (heures de pointe partage)
 *   4. Heatmap horaire des connexions (last_login_at — heures de pointe app)
 *   5. Distribution observations / user (histogramme 0 / 1-2 / 3-5 / 6-10 / 10+)
 *   6. Répartition géographique des posts (FR / CA / autre)
 *
 * Éco-conception :
 *   - Aucune lib graphique externe (barres/heatmap CSS pur).
 *   - Cache React Query 5 min (les analytics tournent rarement).
 *   - Toutes les queries SELECT non-paginées sont sur des volumes
 *     < 10k rows en MVP — acceptable. À réviser quand on dépasse.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Target,
  Heart,
  Globe2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { INTEREST_CONFIG } from '@/constants/interests'

// ─── Types ──────────────────────────────────────────────────────────────────

interface InterestStat {
  id: string
  label: string
  emoji: string
  count: number
  pct: number
}

interface HourlyPoint {
  hour: number // 0..23
  count: number
}

interface DistributionBucket {
  label: string
  count: number
  pct: number
}

interface CountryStat {
  country: string
  count: number
  pct: number
}

interface AnalyticsData {
  totalUsers: number
  totalPosts: number
  postsLast7d: number
  postsLast30d: number
  uniquePostersLast7d: number
  avgPostsPerActiveUser: number
  totalReactions: number
  totalComments: number
  avgReactionsPerPost: number
  /** Nombre moyen de photos par observation (incluant les posts texte = 0). */
  avgPhotosPerPost: number
  interests: InterestStat[]
  postsByHour: HourlyPoint[]
  loginsByHour: HourlyPoint[]
  postsDistribution: DistributionBucket[]
  /** Distribution du nombre de photos par observation (0 / 1 / 2 / 3 / 4+). */
  photosDistribution: DistributionBucket[]
  countries: CountryStat[]
}

// ─── Objectifs produit (table Nicolas — Phase 1 et 2) ───────────────────────

interface PhaseTarget {
  label: string
  phase1: string
  phase2: string
  /** Optionnel — fonction qui rend la valeur courante en string lisible. */
  current?: (a: AnalyticsData) => string
  /** Optionnel — true si la valeur courante atteint l'objectif Phase 1. */
  reachedP1?: (a: AnalyticsData) => boolean
}

const PHASE_TARGETS: PhaseTarget[] = [
  {
    label: 'Utilisateurs',
    phase1: '100 pré-inscrits',
    phase2: '50–100 actifs / mois',
    current: (a) => `${a.totalUsers}`,
    reachedP1: (a) => a.totalUsers >= 100,
  },
  {
    label: 'Nombre total d’observations',
    phase1: '800 (sur 6–8 sem.)',
    phase2: '3 000 (sept.–déc.)',
    current: (a) => `${a.totalPosts}`,
    reachedP1: (a) => a.totalPosts >= 800,
  },
  {
    label: 'Observations / user / semaine',
    phase1: '2 à 5',
    phase2: '3 à 6',
    current: (a) => a.avgPostsPerActiveUser.toFixed(1),
    reachedP1: (a) => a.avgPostsPerActiveUser >= 2,
  },
  {
    label: 'Taux de conversion pré-inscrit',
    phase1: '50–60 %',
    phase2: '—',
    current: () => '—',
  },
  {
    label: 'Rétention 7 jours',
    phase1: '> 30 %',
    phase2: '> 35 %',
    current: () => '—', // calcul DAU/WAU à venir (Phase 2)
  },
  {
    label: 'Sessions / user / semaine',
    phase1: '2 à 4',
    phase2: '3 à 6',
    current: () => '—', // pas de tracking session pour l'instant
  },
  {
    label: 'Durée moyenne / session',
    phase1: '3–5 min',
    phase2: '5–7 min',
    current: () => '—',
  },
  {
    label: 'Taux d’abandon',
    phase1: '< 10 %',
    phase2: '< 5 %',
    current: () => '—',
  },
]

// ─── Fetch ──────────────────────────────────────────────────────────────────

async function fetchAnalytics(): Promise<AnalyticsData> {
  const empty: AnalyticsData = {
    totalUsers: 0,
    totalPosts: 0,
    postsLast7d: 0,
    postsLast30d: 0,
    uniquePostersLast7d: 0,
    avgPostsPerActiveUser: 0,
    totalReactions: 0,
    totalComments: 0,
    avgReactionsPerPost: 0,
    avgPhotosPerPost: 0,
    interests: [],
    postsByHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })),
    loginsByHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })),
    postsDistribution: [],
    photosDistribution: [],
    countries: [],
  }
  if (!supabase) return empty

  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    profilesRes,
    postsRes,
    posts7dRes,
    posts30dRes,
    reactionsRes,
    commentsRes,
    last7dPostersRes,
    postsByHourRes,
    loginsByHourRes,
    countriesRes,
    mediaRes,
  ] = await Promise.all([
    // Profils + intérêts (ARRAY) + posts_count (denormalisé)
    supabase.from('profiles').select('id, interests, posts_count, last_login_at'),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    supabase.from('reactions').select('id', { count: 'exact', head: true }),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    // Auteurs distincts ayant publié sur les 7 derniers jours
    supabase.from('posts').select('user_id').gte('created_at', sevenDaysAgo),
    // Heures de publication (30j) — on agrège côté client (< 1k rows attendus)
    supabase.from('posts').select('created_at').gte('created_at', thirtyDaysAgo),
    // last_login_at récents (30j)
    supabase.from('profiles').select('last_login_at').gte('last_login_at', thirtyDaysAgo),
    // Posts par pays
    supabase.from('posts').select('country'),
    // Médias (post_id) — pour calculer le nombre de photos par observation.
    // Plus simple et précis qu'un agrégat SQL : on group by côté client.
    supabase.from('media').select('post_id'),
  ])

  // Surfaçage explicite des erreurs RLS/réseau — sans ça, un échec d'une
  // des 10 queries produit une page vide silencieuse.
  const queryErrors = [
    ['profiles', profilesRes],
    ['postsCount', postsRes],
    ['posts7d', posts7dRes],
    ['posts30d', posts30dRes],
    ['reactions', reactionsRes],
    ['comments', commentsRes],
    ['posters7d', last7dPostersRes],
    ['postsByHour', postsByHourRes],
    ['loginsByHour', loginsByHourRes],
    ['countries', countriesRes],
    ['media', mediaRes],
  ]
    .filter(([, r]) => (r as { error?: { message?: string } }).error)
    .map(
      ([name, r]) =>
        `${name as string}: ${(r as { error?: { message?: string } }).error?.message ?? 'unknown error'}`,
    )
  if (queryErrors.length > 0) {
    console.error('[AdminAnalytics] query errors:', queryErrors)
  }

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string
    interests: string[] | null
    posts_count: number
    last_login_at: string | null
  }>
  const totalUsers = profiles.length

  // ── Intérêts (% users ayant choisi cet intérêt) ────────────────────────
  const interestCounts = new Map<string, number>()
  for (const p of profiles) {
    for (const i of p.interests ?? []) {
      interestCounts.set(i, (interestCounts.get(i) ?? 0) + 1)
    }
  }
  const interests: InterestStat[] = Array.from(interestCounts.entries())
    .map(([id, count]) => ({
      id,
      label: INTEREST_CONFIG[id]?.label ?? id,
      emoji: INTEREST_CONFIG[id]?.emoji ?? '·',
      count,
      pct: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Distribution posts par user ────────────────────────────────────────
  const buckets = [
    { label: '0', min: 0, max: 0 },
    { label: '1–2', min: 1, max: 2 },
    { label: '3–5', min: 3, max: 5 },
    { label: '6–10', min: 6, max: 10 },
    { label: '10+', min: 11, max: Infinity },
  ]
  const postsDistribution: DistributionBucket[] = buckets.map((b) => {
    const count = profiles.filter((p) => p.posts_count >= b.min && p.posts_count <= b.max).length
    return {
      label: b.label,
      count,
      pct: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
    }
  })

  // ── Heatmap horaire des publications ───────────────────────────────────
  const postsByHour: HourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const row of (postsByHourRes.data ?? []) as Array<{ created_at: string }>) {
    const h = new Date(row.created_at).getHours()
    postsByHour[h].count += 1
  }

  // ── Heatmap horaire des connexions ─────────────────────────────────────
  const loginsByHour: HourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const row of (loginsByHourRes.data ?? []) as Array<{ last_login_at: string | null }>) {
    if (!row.last_login_at) continue
    const h = new Date(row.last_login_at).getHours()
    loginsByHour[h].count += 1
  }

  // ── Répartition par pays ───────────────────────────────────────────────
  const countryCounts = new Map<string, number>()
  let totalCountries = 0
  for (const row of (countriesRes.data ?? []) as Array<{ country: string | null }>) {
    const c = row.country ?? 'Inconnu'
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1)
    totalCountries += 1
  }
  const countries: CountryStat[] = Array.from(countryCounts.entries())
    .map(([country, count]) => ({
      country,
      count,
      pct: totalCountries > 0 ? Math.round((count / totalCountries) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Engagement ─────────────────────────────────────────────────────────
  const totalPosts = postsRes.count ?? 0
  const postsLast7d = posts7dRes.count ?? 0
  const postsLast30d = posts30dRes.count ?? 0
  const totalReactions = reactionsRes.count ?? 0
  const totalComments = commentsRes.count ?? 0

  const uniquePosters7d = new Set(
    (last7dPostersRes.data ?? []).map((r) => (r as { user_id: string }).user_id),
  ).size

  const avgPostsPerActiveUser = uniquePosters7d > 0 ? postsLast7d / uniquePosters7d : 0
  const avgReactionsPerPost = totalPosts > 0 ? totalReactions / totalPosts : 0

  // ── Distribution photos par observation ────────────────────────────────
  // Group by post_id, puis bucket le compte. Pour les posts SANS aucune
  // photo (texte seul), ils ne sont pas dans `media` → bucket "0 photo".
  const photosPerPost = new Map<string, number>()
  for (const row of (mediaRes.data ?? []) as Array<{ post_id: string }>) {
    photosPerPost.set(row.post_id, (photosPerPost.get(row.post_id) ?? 0) + 1)
  }
  const postsWithPhotos = photosPerPost.size
  const postsWithoutPhotos = Math.max(0, totalPosts - postsWithPhotos)
  const photoBuckets = [
    { label: 'Sans photo', count: postsWithoutPhotos },
    { label: '1 photo', count: 0 },
    { label: '2 photos', count: 0 },
    { label: '3 photos', count: 0 },
    { label: '4+ photos', count: 0 },
  ]
  for (const n of photosPerPost.values()) {
    if (n === 1) photoBuckets[1].count += 1
    else if (n === 2) photoBuckets[2].count += 1
    else if (n === 3) photoBuckets[3].count += 1
    else if (n >= 4) photoBuckets[4].count += 1
  }
  const photosDistribution: DistributionBucket[] = photoBuckets.map((b) => ({
    label: b.label,
    count: b.count,
    pct: totalPosts > 0 ? Math.round((b.count / totalPosts) * 100) : 0,
  }))
  // Moyenne pondérée (photos totales / posts totaux, posts texte = 0 photo).
  const totalPhotos = Array.from(photosPerPost.values()).reduce((s, n) => s + n, 0)
  const avgPhotosPerPost = totalPosts > 0 ? totalPhotos / totalPosts : 0

  return {
    totalUsers,
    totalPosts,
    postsLast7d,
    postsLast30d,
    uniquePostersLast7d: uniquePosters7d,
    avgPostsPerActiveUser,
    totalReactions,
    totalComments,
    avgReactionsPerPost,
    avgPhotosPerPost,
    interests,
    postsByHour,
    loginsByHour,
    postsDistribution,
    photosDistribution,
    countries,
  }
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          {label}
        </span>
        <Icon className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      {hint && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{hint}</p>}
    </div>
  )
}

function HourlyHeatmap({ data, label }: { data: HourlyPoint[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</h3>
        </div>
        <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
          {total} total
        </span>
      </div>
      {/* Système de chaleur : violet pâle (peu) → violet foncé (beaucoup).
          Cellules carrées arrondies type heatmap GitHub. Nicolas 2026-05-24 :
          contraste renforcé (0.06 → 1.0) pour vraiment voir les pics. */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
        {data.map((d) => {
          const intensity = d.count / max
          const bg =
            d.count === 0
              ? 'rgba(99, 102, 241, 0.06)'
              : `rgba(99, 102, 241, ${0.25 + intensity * 0.75})`
          return (
            <div
              key={d.hour}
              title={`${d.hour}h — ${d.count}`}
              className="aspect-square rounded-md ring-1 ring-inset ring-[var(--color-border)]/30"
              style={{ background: bg }}
              aria-label={`${d.hour}h ${d.count}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-secondary)] font-mono">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
      {/* Légende de chaleur (peu → beaucoup) */}
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-[var(--color-text-secondary)]">
        <span>Peu</span>
        {[0.25, 0.5, 0.75, 1].map((a) => (
          <span
            key={a}
            className="size-3 rounded-sm"
            style={{ background: `rgba(99,102,241,${a})` }}
            aria-hidden="true"
          />
        ))}
        <span>Beaucoup</span>
      </div>
    </div>
  )
}

function HorizontalBar({
  label,
  value,
  max,
  emoji,
  suffix,
}: {
  label: string
  value: number
  max: number
  emoji?: string
  suffix?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-[var(--color-text-primary)] w-32 shrink-0 truncate flex items-center gap-1.5">
        {emoji && <span aria-hidden="true">{emoji}</span>}
        {label}
      </span>
      <div className="flex-1 h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-action-default)] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--color-text-secondary)] font-mono tabular-nums w-16 text-right">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchAnalytics,
    staleTime: 5 * 60 * 1000,
    // Une seule retry — au-delà c'est un vrai problème qu'on veut surfacer.
    retry: 1,
  })

  const peakPostHour = useMemo(() => {
    if (!data) return null
    return data.postsByHour.reduce((p, c) => (c.count > p.count ? c : p), data.postsByHour[0])
  }, [data])

  const peakLoginHour = useMemo(() => {
    if (!data) return null
    return data.loginsByHour.reduce((p, c) => (c.count > p.count ? c : p), data.loginsByHour[0])
  }, [data])

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-text-primary)]"
        >
          <p className="font-semibold mb-1">Impossible de charger les analytics.</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {(error as Error).message ?? 'Erreur inconnue. Vérifie la console navigateur.'}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
            Cause probable : politique RLS sur une des tables (profiles / posts / reactions /
            comments). Ouvre la console (F12) pour le détail.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const maxInterest = data.interests[0]?.count ?? 0
  const maxDist = Math.max(1, ...data.postsDistribution.map((d) => d.count))
  const maxPhotos = Math.max(1, ...data.photosDistribution.map((d) => d.count))
  const maxCountry = data.countries[0]?.count ?? 1

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Suivi engagement produit + KPIs vs objectifs Phase 1/2.
        </p>
      </div>

      {/* ── KPIs engagement clés ────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          icon={Users}
          label="Utilisateurs"
          value={data.totalUsers}
          hint={`${data.uniquePostersLast7d} actifs (7j)`}
        />
        <StatTile
          icon={TrendingUp}
          label="Publications totales"
          value={data.totalPosts}
          hint={`+${data.postsLast7d} cette semaine`}
        />
        <StatTile
          icon={Sparkles}
          label="Obs. moy / actif (7j)"
          value={data.avgPostsPerActiveUser.toFixed(1)}
          hint="objectif P1 : 2–5"
        />
        <StatTile
          icon={Heart}
          label="Réactions / post"
          value={data.avgReactionsPerPost.toFixed(1)}
          hint={`${data.totalReactions} réactions / ${data.totalComments} comm.`}
        />
      </section>

      {/* ── Heures de pointe ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HourlyHeatmap data={data.postsByHour} label="Publications par heure (30j)" />
        <HourlyHeatmap data={data.loginsByHour} label="Dernières connexions par heure (30j)" />
      </section>

      {peakPostHour && peakLoginHour && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-3 text-sm text-[var(--color-text-primary)]">
            ⏰ Heure de pointe publication :{' '}
            <strong>
              {peakPostHour.hour}h ({peakPostHour.count})
            </strong>
          </div>
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-3 text-sm text-[var(--color-text-primary)]">
            🔌 Heure de pointe connexion :{' '}
            <strong>
              {peakLoginHour.hour}h ({peakLoginHour.count})
            </strong>
          </div>
        </div>
      )}

      {/* ── 4 widgets de distribution en grille 2x2 (Nicolas 2026-05-24 :
            les longues lignes pleine largeur étaient peu lisibles, on passe
            en cards plus compactes). En mobile : 1 colonne. */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top intérêts */}
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Centres d'intérêt
            </h2>
          </div>
          {data.interests.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Aucun centre d'intérêt enregistré.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.interests.map((i) => (
                <HorizontalBar
                  key={i.id}
                  emoji={i.emoji}
                  label={i.label}
                  value={i.count}
                  max={maxInterest}
                  suffix={`(${i.pct}%)`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Distribution posts par user */}
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Observations / utilisateur
              </h2>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            {data.postsDistribution.map((b) => (
              <HorizontalBar
                key={b.label}
                label={`${b.label} obs.`}
                value={b.count}
                max={maxDist}
                suffix={`(${b.pct}%)`}
              />
            ))}
          </div>
        </div>

        {/* Distribution photos par post — nouveau widget (Nicolas 2026-05-24 :
            savoir combien de photos les users joignent en moyenne). */}
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Photos / observation
              </h2>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
              moy. <strong>{data.avgPhotosPerPost.toFixed(1)}</strong>
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {data.photosDistribution.map((b) => (
              <HorizontalBar
                key={b.label}
                label={b.label}
                value={b.count}
                max={maxPhotos}
                suffix={`(${b.pct}%)`}
              />
            ))}
          </div>
        </div>

        {/* Géographie */}
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Répartition géographique
            </h2>
          </div>
          {data.countries.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Aucune donnée pays.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.countries.map((c) => (
                <HorizontalBar
                  key={c.country}
                  label={c.country}
                  value={c.count}
                  max={maxCountry}
                  suffix={`(${c.pct}%)`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Objectifs vs réel ───────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            KPIs vs objectifs (Phase 1 → Phase 2)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                <th className="py-2 pr-4 font-semibold">Indicateur</th>
                <th className="py-2 pr-4 font-semibold">Phase 1</th>
                <th className="py-2 pr-4 font-semibold">Phase 2</th>
                <th className="py-2 pr-4 font-semibold">Actuel</th>
              </tr>
            </thead>
            <tbody>
              {PHASE_TARGETS.map((t) => {
                const current = t.current?.(data) ?? '—'
                const reached = t.reachedP1?.(data) ?? null
                return (
                  <tr key={t.label} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{t.label}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{t.phase1}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{t.phase2}</td>
                    <td className="py-2 pr-4 font-semibold">
                      <span
                        className={
                          reached === true
                            ? 'text-[var(--color-success,#16a34a)]'
                            : reached === false
                              ? 'text-[var(--color-warning,#f59e0b)]'
                              : 'text-[var(--color-text-primary)]'
                        }
                      >
                        {current}
                        {reached === true && ' ✓'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Les métriques marquées « — » seront calculées Phase 2 (rétention, sessions, durée moyenne
          — nécessitent un tracking analytics côté client).
        </p>
      </section>
    </div>
  )
}
