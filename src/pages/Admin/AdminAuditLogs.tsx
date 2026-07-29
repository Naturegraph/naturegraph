/**
 * AdminAuditLogs : Module 5 : Audit trail admin
 *
 * BATCH 108 (Nicolas demande "améliorer aussi") :
 *   - Catégorisation des actions (auth/user/beta/moderation/system) avec badges colorés
 *   - Filtres : catégorie + action + recherche par target_id/admin
 *   - Pagination 25/page (au lieu de limit 100)
 *   - Toggle expandable pour voir le détail JSON complet (before/after/metadata)
 *   - Stats header : nb actions / 24h, /7j, /30j
 *
 * Lecture seule (immutable cote DB via trigger Postgres).
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Shield,
  User,
  Key,
  ShieldAlert,
  Activity,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState, LoadingState } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { STALE_TIMES, PAGE_SIZES } from '@/constants/reactQuery'

interface AuditLogRow {
  id: string
  admin_user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  before_state: unknown
  after_state: unknown
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type Category = 'all' | 'auth' | 'user' | 'beta' | 'moderation' | 'system'

const PAGE_SIZE = PAGE_SIZES.ADMIN_DEFAULT

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Date courte FR + heure. */
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Relatif court (il y a Xmin/h/j). */
function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d}j`
  return formatDateTime(iso)
}

/**
 * Catégorise une action selon son préfixe pour grouper visuellement.
 * Ex : "user.promote" → user, "beta.key_gen" → beta, etc.
 */
function categorize(action: string): Exclude<Category, 'all'> {
  if (action.startsWith('auth.')) return 'auth'
  if (action.startsWith('user.')) return 'user'
  if (action.startsWith('beta.')) return 'beta'
  if (action.startsWith('moderation.') || action.startsWith('report.')) return 'moderation'
  return 'system'
}

/** Style (badge color + icône) par catégorie pour lecture rapide. */
function categoryStyle(cat: Exclude<Category, 'all'>): {
  bg: string
  text: string
  Icon: typeof Shield
  label: string
} {
  switch (cat) {
    case 'auth':
      return {
        bg: 'bg-[var(--color-info-bg)]',
        text: 'text-[var(--color-info)]',
        Icon: Shield,
        label: 'Auth',
      }
    case 'user':
      return {
        bg: 'bg-primary-light',
        text: 'text-[var(--color-link)]',
        Icon: User,
        label: 'Utilisateur',
      }
    case 'beta':
      return {
        bg: 'bg-teal-light/30',
        text: 'text-teal-dark',
        Icon: Key,
        label: 'Beta',
      }
    case 'moderation':
      return {
        bg: 'bg-[var(--color-warning-bg)]',
        text: 'text-[var(--color-warning)]',
        Icon: ShieldAlert,
        label: 'Modération',
      }
    case 'system':
      return {
        bg: 'bg-[var(--color-bg-secondary)]',
        text: 'text-muted-foreground',
        Icon: Activity,
        label: 'Système',
      }
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminAuditLogs() {
  const { t } = useTranslation()
  const [category, setCategory] = useState<Category>('all')
  const [filterAction, setFilterAction] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  // Logs (fetch 500 max pour permettre filtrage client + stats sans paginer côté serveur)
  const { data: allLogs = [], isLoading } = useQuery<AuditLogRow[]>({
    queryKey: ['admin-audit-logs-all'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      return (data ?? []) as unknown as AuditLogRow[]
    },
    staleTime: STALE_TIMES.MEDIUM,
  })

  // Liste des actions uniques pour filtre dropdown
  const availableActions = useMemo(() => {
    const set = new Set<string>()
    for (const l of allLogs) set.add(l.action)
    return Array.from(set).sort()
  }, [allLogs])

  // Filtrage client (catégorie + action + recherche target_id ou metadata)
  const filtered = useMemo(() => {
    return allLogs.filter((log) => {
      if (category !== 'all' && categorize(log.action) !== category) return false
      if (filterAction && log.action !== filterAction) return false
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase()
        const targetMatch = log.target_id?.toLowerCase().includes(s)
        const metaMatch = log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(s)
        const actionMatch = log.action.toLowerCase().includes(s)
        if (!targetMatch && !metaMatch && !actionMatch) return false
      }
      return true
    })
  }, [allLogs, category, filterAction, debouncedSearch])

  // Stats (sur tous les logs, indépendamment des filtres en cours).
  // Référence temporelle = log le plus récent (déterministe → useMemo pur).
  // Si pas de logs, les compteurs sont à 0 (pas besoin de fenêtre temporelle).
  const stats = useMemo(() => {
    if (allLogs.length === 0) {
      return { last24h: 0, last7d: 0, last30d: 0, total: 0 }
    }
    const refTs = new Date(allLogs[0].created_at).getTime()
    const oneDay = 24 * 60 * 60 * 1000
    let last24h = 0
    let last7d = 0
    let last30d = 0
    for (const log of allLogs) {
      const age = refTs - new Date(log.created_at).getTime()
      if (age <= oneDay) last24h++
      if (age <= 7 * oneDay) last7d++
      if (age <= 30 * oneDay) last30d++
    }
    return { last24h, last7d, last30d, total: allLogs.length }
  }, [allLogs])

  // Pagination client
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
          <FileText className="size-6" aria-hidden="true" />
          {t('admin.audit.title', { defaultValue: 'Audit logs' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          Historique immutable de toutes les actions admin (trigger Postgres bloque UPDATE/DELETE).
        </p>
      </div>

      {/* Stats cards : volume d'activité par fenêtre temporelle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Dernières 24h" value={stats.last24h} />
        <StatCard label="7 derniers jours" value={stats.last7d} />
        <StatCard label="30 derniers jours" value={stats.last30d} />
        <StatCard label="Total (500 max)" value={stats.total} />
      </div>

      {/* Tabs catégorie */}
      <div
        role="tablist"
        aria-label="Filtrer par catégorie"
        className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto"
      >
        {(
          [
            { key: 'all' as const, label: 'Toutes', Icon: FileText },
            { key: 'auth' as const, label: 'Auth', Icon: Shield },
            { key: 'user' as const, label: 'Utilisateur', Icon: User },
            { key: 'beta' as const, label: 'Beta', Icon: Key },
            { key: 'moderation' as const, label: 'Modération', Icon: ShieldAlert },
            { key: 'system' as const, label: 'Système', Icon: Activity },
          ] as const
        ).map((tab) => {
          const Icon = tab.Icon
          const isActive = category === tab.key
          const count =
            tab.key === 'all'
              ? allLogs.length
              : allLogs.filter((l) => categorize(l.action) === tab.key).length
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setCategory(tab.key)
                setPage(0)
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-action-default)] whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-action-default)] text-[var(--color-link)]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[var(--color-action-default)]/10 text-[var(--color-link)]'
                    : 'bg-[var(--color-bg-secondary)] text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filtres avancés : action + recherche */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Rechercher par action, target ID, metadata…"
            aria-label="Recherche audit"
            className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value)
            setPage(0)
          }}
          aria-label="Filtrer par action précise"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">Toutes les actions</option>
          {availableActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <LoadingState variant="skeleton" rows={6} label="Chargement audit logs…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-12" />}
          title={
            allLogs.length === 0
              ? 'Aucune action admin enregistrée'
              : 'Aucun résultat pour ces filtres'
          }
          description={
            allLogs.length === 0
              ? "Dès qu'une action admin sera effectuée, elle apparaîtra ici."
              : 'Essaie de modifier les filtres ou la recherche.'
          }
        />
      ) : (
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground tracking-wider bg-[var(--color-bg-secondary)]/50">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-semibold w-8" aria-label="Détails"></th>
                <th className="text-left px-4 py-3 font-semibold">Quand</th>
                <th className="text-left px-4 py-3 font-semibold">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Cible</th>
                <th className="text-left px-4 py-3 font-semibold">Aperçu</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log, idx) => {
                const cat = categorize(log.action)
                const style = categoryStyle(cat)
                const Icon = style.Icon
                const isExpanded = expandedId === log.id
                const hasDetails =
                  (log.metadata && Object.keys(log.metadata).length > 0) ||
                  log.before_state ||
                  log.after_state ||
                  log.ip_address
                return (
                  <>
                    <tr
                      key={log.id}
                      className={`border-t border-border/40 transition-colors hover:bg-[var(--color-bg-secondary)]/60 ${
                        idx % 2 === 1 ? 'bg-[var(--color-bg-secondary)]/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            aria-label={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                            aria-expanded={isExpanded}
                            className="size-6 inline-flex items-center justify-center rounded hover:bg-[var(--color-bg-secondary)] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="size-4" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
                        title={formatDateTime(log.created_at)}
                      >
                        {formatRelative(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                        >
                          <Icon className="size-3" aria-hidden="true" />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{log.action}</td>
                      <td className="px-4 py-3 text-xs">
                        {log.target_type ? (
                          <span className="text-foreground">
                            {log.target_type}
                            {log.target_id && (
                              <span className="text-muted-foreground ml-1">
                                #{log.target_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? Object.entries(log.metadata)
                              .slice(0, 2)
                              .map(
                                ([k, v]) =>
                                  `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`,
                              )
                              .join(' · ')
                          : '-'}
                      </td>
                    </tr>
                    {isExpanded && hasDetails && (
                      <tr className="bg-[var(--color-bg-secondary)]/40">
                        <td colSpan={6} className="px-6 py-3">
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <dt className="font-semibold text-foreground mb-1">Metadata</dt>
                                <dd>
                                  <pre className="bg-background border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </dd>
                              </div>
                            )}
                            {log.ip_address && (
                              <div>
                                <dt className="font-semibold text-foreground mb-1">IP / Agent</dt>
                                <dd className="text-muted-foreground font-mono">
                                  {log.ip_address}
                                  {log.user_agent && (
                                    <div className="truncate" title={log.user_agent}>
                                      {log.user_agent}
                                    </div>
                                  )}
                                </dd>
                              </div>
                            )}
                            {log.target_id && (
                              <div>
                                <dt className="font-semibold text-foreground mb-1">Target ID</dt>
                                <dd className="font-mono text-muted-foreground break-all">
                                  {log.target_id}
                                </dd>
                              </div>
                            )}
                            <div>
                              <dt className="font-semibold text-foreground mb-1">Log ID</dt>
                              <dd className="font-mono text-muted-foreground break-all">
                                {log.id}
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between gap-3 text-sm"
          aria-label="Pagination audit"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Précédent
          </button>
          <span className="text-muted-foreground">
            Page {page + 1} / {totalPages} ({filtered.length} résultats)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Suivant
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}

// ─── StatCard sub-component ────────────────────────────────────────────────

/** Carte stat compacte avec label + valeur (réutilisée 4x dans le header). */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background border border-border rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
    </div>
  )
}
