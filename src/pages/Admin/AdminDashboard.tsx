/**
 * AdminDashboard — Module 1 : vue d'ensemble systeme
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 1 + BATCH 31
 *
 * Affiche 4 KPI boxes + signalements ouverts + etat beta.
 * Toutes les queries via React Query (cache 1 min, refetch on focus).
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, AlertTriangle, Activity, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalUsers: number
  postsLast7d: number
  openReports: number
  betaUsers: number
  betaMaxUsers: number
  betaAcceptingSignups: boolean
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  if (!supabase) {
    return {
      totalUsers: 0,
      postsLast7d: 0,
      openReports: 0,
      betaUsers: 0,
      betaMaxUsers: 50,
      betaAcceptingSignups: false,
    }
  }

  const [usersResult, postsResult, reportsResult, quotaResult] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('moderation_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase.from('beta_quota_config').select('*').eq('id', 1).maybeSingle(),
  ])

  return {
    totalUsers: usersResult.count ?? 0,
    postsLast7d: postsResult.count ?? 0,
    openReports: reportsResult.count ?? 0,
    betaUsers: quotaResult.data?.current_user_count ?? 0,
    betaMaxUsers: quotaResult.data?.max_users_total ?? 50,
    betaAcceptingSignups: quotaResult.data?.accepting_new_signups ?? false,
  }
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const reportsColor = data.openReports === 0 ? 'green' : data.openReports < 5 ? 'yellow' : 'red'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          {t('admin.dashboard.title', { defaultValue: 'Dashboard' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          🟢 {t('admin.dashboard.statusOk', { defaultValue: 'Systeme operationnel' })} • Phase{' '}
          {data.betaAcceptingSignups ? '1 beta ouverte' : 'beta fermee'} • {data.betaUsers} /{' '}
          {data.betaMaxUsers} users
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIBox
          label={t('admin.dashboard.kpi.users', { defaultValue: 'Utilisateurs' })}
          value={data.totalUsers}
          icon={Users}
          color="blue"
          linkTo="/admin/users"
        />
        <KPIBox
          label={t('admin.dashboard.kpi.posts', { defaultValue: 'Posts (7j)' })}
          value={data.postsLast7d}
          icon={FileText}
          color="green"
          linkTo="/admin/moderation"
        />
        <KPIBox
          label={t('admin.dashboard.kpi.reports', { defaultValue: 'Signalements' })}
          value={data.openReports}
          icon={AlertTriangle}
          color={reportsColor}
          linkTo="/admin/moderation"
        />
        <KPIBox
          label={t('admin.dashboard.kpi.betaQuota', { defaultValue: 'Beta quota' })}
          value={`${data.betaUsers} / ${data.betaMaxUsers}`}
          icon={Activity}
          color="blue"
          linkTo="/admin/beta"
        />
      </div>

      {/* Sections quick view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-background border border-border rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.openReportsTitle', { defaultValue: 'Signalements ouverts' })}
            </h2>
            <Link
              to="/admin/moderation"
              className="text-sm text-primary inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t('admin.dashboard.viewAll', { defaultValue: 'Tout voir' })}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          {data.openReports === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.dashboard.noReports', {
                defaultValue: '🟢 Aucun signalement ouvert. Tout est calme.',
              })}
            </p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-bold text-[var(--color-error,#dc2626)]">
                {data.openReports}
              </span>{' '}
              {t('admin.dashboard.reportsWaiting', {
                defaultValue: 'signalement(s) en attente de traitement',
              })}
            </p>
          )}
        </div>

        <div className="bg-background border border-border rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.dashboard.betaTitle', { defaultValue: 'Beta status' })}
            </h2>
            <Link
              to="/admin/beta"
              className="text-sm text-primary inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t('admin.dashboard.manage', { defaultValue: 'Gerer' })}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>
              <span className="font-bold">{data.betaUsers}</span> / {data.betaMaxUsers} users (
              {Math.round((data.betaUsers / data.betaMaxUsers) * 100)}%)
            </p>
            <p className="text-muted-foreground">
              {data.betaAcceptingSignups
                ? '🟢 Accepting new signups'
                : '🔴 Signups fermes (quota plein ou pause)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KPIBox sub-component ─────────────────────────────────────────────────

interface KPIBoxProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  color: 'blue' | 'green' | 'yellow' | 'red'
  linkTo: string
}

function KPIBox({ label, value, icon: Icon, color, linkTo }: KPIBoxProps) {
  const colorClasses: Record<KPIBoxProps['color'], string> = {
    blue: 'text-primary bg-primary-light',
    green: 'text-[var(--color-success,#16a34a)] bg-[var(--color-success,#16a34a)]/10',
    yellow: 'text-[var(--color-warning,#ca8a04)] bg-[var(--color-warning,#ca8a04)]/10',
    red: 'text-[var(--color-error,#dc2626)] bg-[var(--color-error,#dc2626)]/10',
  }

  return (
    <Link
      to={linkTo}
      className="bg-background border border-border rounded-lg p-4 flex flex-col gap-2 hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div
          className={`size-8 rounded-full flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="size-4" aria-hidden={true} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </Link>
  )
}
