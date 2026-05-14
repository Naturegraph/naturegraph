/**
 * AdminAuditLogs — Module 5 : Audit trail admin
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 5 + BATCH 32
 *
 * Lecture seule de `admin_audit_logs` (immutable cote DB via trigger).
 * Affichage chronologique inverse + filtres simples (date, action).
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState, LoadingState } from '@/components/ui'

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

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "a l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function AdminAuditLogs() {
  const { t } = useTranslation()
  const [filterAction, setFilterAction] = useState<string>('')

  const { data: logs, isLoading } = useQuery<AuditLogRow[]>({
    queryKey: ['admin-audit-logs', filterAction],
    queryFn: async () => {
      if (!supabase) return []
      let q = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (filterAction) q = q.eq('action', filterAction)
      const { data } = await q
      return (data ?? []) as unknown as AuditLogRow[]
    },
    staleTime: 30 * 1000,
  })

  const actions = useMemo(() => {
    const set = new Set<string>()
    for (const l of logs ?? []) set.add(l.action)
    return Array.from(set).sort()
  }, [logs])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
          <FileText className="size-6" aria-hidden="true" />
          {t('admin.audit.title', { defaultValue: 'Audit logs' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('admin.audit.description', {
            defaultValue:
              'Historique immutable de toutes les actions admin. Trigger Postgres empeche UPDATE/DELETE.',
          })}
        </p>
      </div>

      {/* Filtre */}
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="audit-filter-action" className="text-sm text-muted-foreground">
            Action :
          </label>
          <select
            id="audit-filter-action"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Toutes</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <LoadingState variant="skeleton" rows={6} label="Chargement audit logs..." />
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-12" />}
          title="Aucune action admin enregistree"
          description="Des qu'une action admin sera effectuee, elle apparaitra ici."
        />
      ) : (
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground tracking-wide bg-muted/20">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2">Quand</th>
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-4 py-2">Cible</th>
                <th className="text-left px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/10"
                >
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {formatRelative(log.created_at)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-primary">{log.action}</td>
                  <td className="px-4 py-2 text-foreground">
                    {log.target_type ? `${log.target_type}` : '—'}
                    {log.target_id && (
                      <span className="text-muted-foreground"> #{log.target_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-md truncate">
                    {log.metadata && Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
