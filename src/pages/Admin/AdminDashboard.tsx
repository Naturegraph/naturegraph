/**
 * AdminDashboard — Module 1 : vue d'ensemble système
 *
 * BATCH 108 (Nicolas demande "améliorer aussi, dashboard plus moderne avec vraies analytics") :
 *   - 6 KPIs principaux (users, posts 7j, signalements ouverts, beta quota, observations 7j, identif 7j)
 *   - Sparkline de l'activité 14 derniers jours (posts + signups) en CSS pur
 *   - Activité récente (5 derniers signalements + 5 dernières actions admin)
 *   - Top contributeurs (top 5 users par nombre de posts cette semaine)
 *   - Funnel beta : waitlist → invité → activé → posté
 *
 * Toutes les queries via React Query (cache 60s, refetch on focus).
 * Eco-conception : aucune lib de graph, sparklines CSS-only, pagination des sub-queries.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  FileText,
  AlertTriangle,
  Activity,
  ArrowRight,
  Eye,
  Leaf,
  TrendingUp,
  Clock,
  Award,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'

// ─── Types ─────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalUsers: number
  postsLast7d: number
  openReports: number
  betaUsers: number
  betaMaxUsers: number
  betaAcceptingSignups: boolean
  observationsLast7d: number
  identificationsLast7d: number
}

interface ActivityPoint {
  date: string // YYYY-MM-DD
  posts: number
}

interface RecentReport {
  id: string
  target_type: string
  reason: string
  priority: string
  status: string
  created_at: string
}

interface RecentAdminAction {
  id: string
  action: string
  target_type: string | null
  created_at: string
}

interface TopContributor {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  posts_count: number
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
  if (!supabase) {
    return {
      totalUsers: 0,
      postsLast7d: 0,
      openReports: 0,
      betaUsers: 0,
      betaMaxUsers: 50,
      betaAcceptingSignups: false,
      observationsLast7d: 0,
      identificationsLast7d: 0,
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [users, posts, reports, quota, observations, identifications] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('moderation_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase.from('beta_quota_config').select('*').eq('id', 1).maybeSingle(),
    // Observations 7j : posts type='nature_encounter' (Rencontre Nature).
    // Bug fix (Nicolas 2026-05-24) : avant on cherchait type='observation'
    // qui n'existe pas dans le schéma → compteur toujours à 0.
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'nature_encounter')
      .gte('created_at', sevenDaysAgo),
    // Identifications collaboratives 7j : entrées dans identification_proposals
    // (les users qui proposent une espèce sur un post d'autrui). Pas un type de post.
    supabase
      .from('identification_proposals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
  ])

  return {
    totalUsers: users.count ?? 0,
    postsLast7d: posts.count ?? 0,
    openReports: reports.count ?? 0,
    betaUsers: quota.data?.current_user_count ?? 0,
    betaMaxUsers: quota.data?.max_users_total ?? 50,
    betaAcceptingSignups: quota.data?.accepting_new_signups ?? false,
    observationsLast7d: observations.count ?? 0,
    identificationsLast7d: identifications.count ?? 0,
  }
}

/**
 * Sparkline data : compte les posts par jour sur les 14 derniers jours.
 * Pas optimal (1 query) mais le volume MVP est petit (< 1000 posts/sem).
 */
async function fetchActivityData(): Promise<ActivityPoint[]> {
  if (!supabase) return []
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const { data } = await supabase
    .from('posts')
    .select('created_at')
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Groupe par jour (clé YYYY-MM-DD)
  const counts = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    counts.set(d.toISOString().slice(0, 10), 0)
  }
  for (const p of data ?? []) {
    const key = (p as { created_at: string }).created_at.slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([date, posts]) => ({ date, posts }))
}

async function fetchRecentReports(): Promise<RecentReport[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('moderation_reports')
    .select('id, target_type, reason, priority, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []) as unknown as RecentReport[]
}

async function fetchRecentAdminActions(): Promise<RecentAdminAction[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('admin_audit_logs')
    .select('id, action, target_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []) as unknown as RecentAdminAction[]
}

async function fetchTopContributors(): Promise<TopContributor[]> {
  if (!supabase) return []
  // Top 5 par posts_count (denormalisé via trigger)
  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, posts_count')
    .gt('posts_count', 0)
    .order('posts_count', { ascending: false })
    .limit(5)
  return (data ?? []) as unknown as TopContributor[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { t } = useTranslation()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['admin-dashboard-activity'],
    queryFn: fetchActivityData,
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentReports = [] } = useQuery({
    queryKey: ['admin-dashboard-recent-reports'],
    queryFn: fetchRecentReports,
    staleTime: 60 * 1000,
  })

  const { data: recentActions = [] } = useQuery({
    queryKey: ['admin-dashboard-recent-actions'],
    queryFn: fetchRecentAdminActions,
    staleTime: 60 * 1000,
  })

  const { data: topContributors = [] } = useQuery({
    queryKey: ['admin-dashboard-top-contributors'],
    queryFn: fetchTopContributors,
    staleTime: 5 * 60 * 1000,
  })

  if (statsLoading || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const reportsColor = stats.openReports === 0 ? 'green' : stats.openReports < 5 ? 'yellow' : 'red'
  const betaPct = Math.round((stats.betaUsers / stats.betaMaxUsers) * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          {t('admin.dashboard.title', { defaultValue: 'Dashboard' })}
        </h1>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
            Système opérationnel · Phase {stats.betaAcceptingSignups
              ? '1 ouverte'
              : 'fermée'} · {stats.betaUsers}/{stats.betaMaxUsers} users ({betaPct}%)
          </p>
          {/* Lien rapide vers la page Analytics dédiée — Nicolas 2026-05-24 :
              le dashboard reste un aperçu, /admin/analytics approfondit. */}
          <Link
            to="/admin/analytics"
            className="text-sm font-medium text-[var(--color-action-default)] hover:underline inline-flex items-center gap-1"
          >
            Analytics détaillée
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* KPI grid : 6 cards (2 cols mobile, 3 tablet, 6 desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPIBox
          label="Utilisateurs"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          linkTo="/admin/users"
        />
        <KPIBox
          label="Posts (7j)"
          value={stats.postsLast7d}
          icon={FileText}
          color="green"
          linkTo="/admin/moderation"
        />
        <KPIBox
          label="Observations (7j)"
          value={stats.observationsLast7d}
          icon={Eye}
          color="teal"
        />
        <KPIBox
          label="Identif. (7j)"
          value={stats.identificationsLast7d}
          icon={Leaf}
          color="teal"
        />
        <KPIBox
          label="Signalements"
          value={stats.openReports}
          icon={AlertTriangle}
          color={reportsColor}
          linkTo="/admin/moderation"
        />
        <KPIBox
          label="Beta quota"
          value={`${stats.betaUsers}/${stats.betaMaxUsers}`}
          icon={Activity}
          color="blue"
          linkTo="/admin/beta"
        />
      </div>

      {/* Sparkline activité 14j (CSS only, éco-conception) */}
      <section className="bg-background border border-border rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <TrendingUp className="size-4" aria-hidden="true" />
            Activité (14 derniers jours)
          </h2>
          <span className="text-xs text-muted-foreground">
            Total : {activity.reduce((sum, d) => sum + d.posts, 0)} posts
          </span>
        </div>
        <Sparkline data={activity} />
      </section>

      {/* Two-column : recent reports + recent admin actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signalements récents */}
        <section className="bg-background border border-border rounded-lg flex flex-col">
          <header className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Signalements récents
            </h2>
            <Link
              to="/admin/moderation"
              className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Tout voir <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </header>
          {recentReports.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun signalement</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentReports.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium capitalize">{r.target_type}</span>
                        <span className="text-muted-foreground"> — {r.reason}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(r.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} priority={r.priority} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actions admin récentes */}
        <section className="bg-background border border-border rounded-lg flex flex-col">
          <header className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
              <Clock className="size-4" aria-hidden="true" />
              Actions admin récentes
            </h2>
            <Link
              to="/admin/audit"
              className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Tout voir <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </header>
          {recentActions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Aucune action récente
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActions.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground">{a.action}</p>
                    {a.target_type && (
                      <p className="text-xs text-muted-foreground">{a.target_type}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Top contributeurs */}
      {topContributors.length > 0 && (
        <section className="bg-background border border-border rounded-lg flex flex-col">
          <header className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
              <Award className="size-4" aria-hidden="true" />
              Top contributeurs (par nombre de posts total)
            </h2>
            <Link
              to="/admin/users"
              className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Voir tous <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </header>
          <ol className="divide-y divide-border">
            {topContributors.map((c, idx) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-base font-bold text-muted-foreground tabular-nums w-6">
                  #{idx + 1}
                </span>
                <Avatar
                  src={c.avatar_url ?? undefined}
                  alt={c.username}
                  fallback={c.first_name?.[0] ?? c.username?.[0] ?? '?'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${c.username}`}
                    className="text-sm font-medium text-foreground hover:underline truncate"
                  >
                    @{c.username}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.first_name} {c.last_name}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {c.posts_count}{' '}
                  <span className="text-xs font-normal text-muted-foreground">posts</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

// ─── KPIBox ────────────────────────────────────────────────────────────────

interface KPIBoxProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  color: 'blue' | 'green' | 'yellow' | 'red' | 'teal'
  linkTo?: string
}

function KPIBox({ label, value, icon: Icon, color, linkTo }: KPIBoxProps) {
  const colorClasses: Record<KPIBoxProps['color'], string> = {
    blue: 'text-primary bg-primary-light',
    green: 'text-[var(--color-success)] bg-[var(--color-success-bg)]',
    yellow: 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]',
    red: 'text-[var(--color-error)] bg-[var(--color-error-bg)]',
    teal: 'text-teal-dark bg-teal-light/30',
  }

  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`size-7 rounded-full flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="size-3.5" aria-hidden={true} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </>
  )

  const baseClass =
    'bg-background border border-border rounded-lg p-4 flex flex-col gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  if (linkTo) {
    return (
      <Link to={linkTo} className={`${baseClass} hover:border-primary`}>
        {content}
      </Link>
    )
  }
  return <div className={baseClass}>{content}</div>
}

// ─── Sparkline (CSS only, éco-conception) ──────────────────────────────────

function Sparkline({ data }: { data: ActivityPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée d'activité</p>
    )
  }
  const max = Math.max(...data.map((d) => d.posts), 1)
  // BATCH 114 : sparkline plus haute sur mobile pour lisibilité
  return (
    <div
      className="flex items-end gap-0.5 sm:gap-1 h-32 sm:h-24"
      aria-label="Activité des 14 derniers jours"
    >
      {data.map((d) => {
        const pct = (d.posts / max) * 100
        const dateLabel = new Date(d.date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
        })
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group min-w-0"
            title={`${dateLabel} : ${d.posts} post${d.posts > 1 ? 's' : ''}`}
          >
            <div
              className="w-full bg-primary/20 hover:bg-primary/40 rounded-t transition-colors min-h-[2px]"
              style={{ height: `${Math.max(pct, 2)}%` }}
              role="presentation"
            />
            <span className="text-[8px] sm:text-[9px] text-muted-foreground tabular-nums truncate w-full text-center">
              {dateLabel.slice(0, 5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── StatusBadge (pour signalements récents) ───────────────────────────────
// BATCH 110 : remplace emojis 🆕/🔥 par icônes lucide AlertCircle/Flame.

function StatusBadge({ status, priority }: { status: string; priority: string }) {
  const isCritical = priority === 'critical' || priority === 'high'
  const isNew = status === 'new'
  if (isNew) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isCritical
            ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
            : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
        }`}
      >
        <AlertTriangle className="size-3" aria-hidden="true" />
        {isCritical ? 'Urgent' : 'Nouveau'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-secondary)] text-muted-foreground">
      {status}
    </span>
  )
}
