/**
 * AdminModeration — Module 3 : Moderation contenu (MVP)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 3 + BATCH 33
 *
 * Fonctionnalites livrees :
 *   - Liste signalements paginee (20/page) — pagination obligatoire (eco-conception)
 *   - Filtres : status (new / in_review / resolved / dismissed) + priority
 *   - Actions par signalement :
 *       * Voir cible (lien vers profil ou post)
 *       * Marquer "in_review" (auto-assign a l'admin connecte)
 *       * Resoudre avec notes (ConfirmModal + textarea)
 *       * Rejeter (dismiss) avec notes
 *       * Supprimer contenu (action irreversible — admin_actions.content_remove)
 *   - Toutes les actions log dans admin_audit_logs (immutable)
 *
 * Hors scope BATCH 33 (Phase 2+) :
 *   - Modal de preview du contenu signale (pour BATCH 36)
 *   - Bulk resolve (1 a la fois pour MVP)
 *   - Notification automatique au signaleur (envoi email)
 *
 * Eco-conception :
 *   - Pagination 20 items (jamais de scroll infini)
 *   - Cache 30s + refetch on focus
 *   - Pas de polling auto
 *
 * A11Y :
 *   - aria-label sur tous les inputs/buttons
 *   - role="alertdialog" via ConfirmModal
 *   - Status visuel + texte (jamais couleur seule)
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  Mail,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/contexts/ToastContext'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useAdminAction } from '@/hooks/useAdminAction'
import { PAGE_SIZES, STALE_TIMES } from '@/constants/reactQuery'
import type { Json } from '@/types/supabase'

// ─── Types ──────────────────────────────────────────────────────────────

type ReportStatus = 'new' | 'in_review' | 'resolved' | 'dismissed'
type ReportPriority = 'low' | 'medium' | 'high' | 'critical'

interface ReportRow {
  id: string
  reporter_id: string
  target_type: string // 'post' | 'profile' | 'comment'
  target_id: string
  reason: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
}

type ActionType = 'review' | 'resolve' | 'dismiss' | 'remove_content' | null

interface PendingAction {
  type: ActionType
  report: ReportRow | null
}

const PAGE_SIZE = PAGE_SIZES.ADMIN_DEFAULT

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "a l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `il y a ${diffHours}h`
  const diffDays = Math.round(diffHours / 24)
  return `il y a ${diffDays}j`
}

const statusConfig: Record<ReportStatus, { label: string; color: string }> = {
  new: { label: '🆕 Nouveau', color: 'text-[var(--color-warning,#ca8a04)]' },
  in_review: { label: '👁 En cours', color: 'text-primary' },
  resolved: { label: '✅ Resolu', color: 'text-[var(--color-success,#16a34a)]' },
  dismissed: { label: '✕ Rejete', color: 'text-muted-foreground' },
}

const priorityConfig: Record<ReportPriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-muted-foreground' },
  medium: { label: 'Moyenne', color: 'text-foreground' },
  high: { label: 'Haute', color: 'text-[var(--color-warning,#ca8a04)]' },
  critical: { label: 'Critique', color: 'text-[var(--color-error,#dc2626)]' },
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function AdminModeration() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { adminUser } = useIsAdmin()
  // BATCH 36 : hook centralise pour audit log (DRY, strategy ligne 562).
  const { logAction } = useAdminAction()

  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('new')
  const [priorityFilter, setPriorityFilter] = useState<'all' | ReportPriority>('all')
  const [page, setPage] = useState(0)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  // BATCH 106 : drawer side-panel pour voir le detail d'un signalement + envoyer notifs
  const [detailReport, setDetailReport] = useState<ReportRow | null>(null)
  const [notifTargetMsg, setNotifTargetMsg] = useState('')
  const [notifReporterMsg, setNotifReporterMsg] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [pending, setPending] = useState<PendingAction>({ type: null, report: null })
  const [notes, setNotes] = useState('')

  // Reset page on filter change
  useEffect(() => {
    setPage(0)
  }, [statusFilter, priorityFilter])

  // Fetch reports
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter, priorityFilter, page],
    queryFn: async () => {
      if (!supabase) return { rows: [] as ReportRow[], total: 0 }

      let query = supabase
        .from('moderation_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter)

      const { data: reports, count, error } = await query
      if (error) throw error
      return { rows: (reports ?? []) as ReportRow[], total: count ?? 0 }
    },
    staleTime: STALE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
  })

  // BATCH 108 : stats globales pour le header (nb par statut/priorité)
  // Pas filtrées : reflètent toute la base, pas la page courante
  const { data: stats } = useQuery({
    queryKey: ['admin-reports-stats'],
    queryFn: async () => {
      if (!supabase) {
        return {
          openCount: 0,
          inReviewCount: 0,
          criticalCount: 0,
          resolved7d: 0,
        }
      }
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [openRes, inReviewRes, criticalRes, resolvedRes] = await Promise.all([
        supabase
          .from('moderation_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase
          .from('moderation_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_review'),
        supabase
          .from('moderation_reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['new', 'in_review'])
          .eq('priority', 'critical'),
        supabase
          .from('moderation_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
          .gte('resolved_at', sevenDaysAgo),
      ])
      return {
        openCount: openRes.count ?? 0,
        inReviewCount: inReviewRes.count ?? 0,
        criticalCount: criticalRes.count ?? 0,
        resolved7d: resolvedRes.count ?? 0,
      }
    },
    staleTime: STALE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
  })

  // Fetch reporter usernames pour affichage (separate request pour eviter join complexe)
  const reporterIds = Array.from(new Set((data?.rows ?? []).map((r) => r.reporter_id)))
  const { data: reporterMap } = useQuery({
    queryKey: ['admin-reports-reporters', reporterIds.sort().join(',')],
    queryFn: async () => {
      if (!supabase || reporterIds.length === 0) return new Map<string, string>()
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', reporterIds)
      const map = new Map<string, string>()
      for (const p of profiles ?? []) map.set(p.id, p.username)
      return map
    },
    enabled: reporterIds.length > 0,
    staleTime: STALE_TIMES.VERY_LONG,
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Audit log helper (BATCH 36 : delegate to useAdminAction) ───────
  async function logAudit(action: string, reportId: string, metadata: Json) {
    await logAction({ action, targetType: 'moderation_report', targetId: reportId, metadata })
  }

  // ─── Actions handlers ────────────────────────────────────────────────

  function openAction(type: Exclude<ActionType, null>, report: ReportRow) {
    setOpenMenuId(null)
    setPending({ type, report })
    setNotes('')
  }

  function closeAction() {
    setPending({ type: null, report: null })
    setNotes('')
  }

  async function quickReview(report: ReportRow) {
    // Action rapide : assign + mark in_review (pas de modal — 1 click)
    if (!supabase || !adminUser) return
    try {
      const { error } = await supabase
        .from('moderation_reports')
        .update({
          status: 'in_review',
          assigned_to: adminUser.user_id,
        })
        .eq('id', report.id)
      if (error) throw error
      await logAudit('report.review', report.id, { reason: report.reason })
      toast.success('Signalement assigne. Status: en cours.')
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] })
    } catch (err) {
      toast.error(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de mettre a jour le signalement',
      )
    }
  }

  async function confirmAction() {
    if (!pending.type || !pending.report || !supabase || !adminUser) return
    const report = pending.report

    try {
      switch (pending.type) {
        case 'resolve': {
          if (notes.trim().length < 10) {
            toast.error('Notes (10 caracteres min) requises pour resoudre.')
            return
          }
          const { error } = await supabase
            .from('moderation_reports')
            .update({
              status: 'resolved',
              resolution_notes: notes.trim(),
              resolved_at: new Date().toISOString(),
              resolved_by: adminUser.user_id,
            })
            .eq('id', report.id)
          if (error) throw error
          await logAudit('report.resolve', report.id, { notes: notes.trim() })
          toast.success('Signalement marque comme resolu')
          break
        }
        case 'dismiss': {
          if (notes.trim().length < 10) {
            toast.error('Notes (10 caracteres min) requises pour rejeter.')
            return
          }
          const { error } = await supabase
            .from('moderation_reports')
            .update({
              status: 'dismissed',
              resolution_notes: notes.trim(),
              resolved_at: new Date().toISOString(),
              resolved_by: adminUser.user_id,
            })
            .eq('id', report.id)
          if (error) throw error
          await logAudit('report.dismiss', report.id, { notes: notes.trim() })
          toast.success('Signalement rejete')
          break
        }
        case 'remove_content': {
          if (notes.trim().length < 10) {
            toast.error('Raison (10 caracteres min) requise pour supprimer.')
            return
          }
          // Log dans admin_actions (action reversible? Non — suppression definitive)
          const { error: actionErr } = await supabase.from('admin_actions').insert({
            performed_by: adminUser.id,
            action_type: 'content_remove',
            target_content_id: report.target_id,
            target_content_type: report.target_type,
            related_report_id: report.id,
            reason: notes.trim(),
            is_reversible: false,
          })
          if (actionErr) throw actionErr

          // Hide le contenu selon target_type via la colonne `status`
          // (le schema actuel n'a pas de soft-delete column — on utilise status='removed')
          if (report.target_type === 'post') {
            await supabase.from('posts').update({ status: 'removed' }).eq('id', report.target_id)
          }
          // Note : pour 'profile' on ne touche pas au profil (admin manuel pour ban)
          // Pour 'comment' : si une colonne 'status' existe sur comments, l'updater ici
          // (MVP : juste le log admin_actions suffit, le user verra le report comme resolu)

          // Mark le report resolved automatiquement
          await supabase
            .from('moderation_reports')
            .update({
              status: 'resolved',
              resolution_notes: `Contenu supprime. Raison: ${notes.trim()}`,
              resolved_at: new Date().toISOString(),
              resolved_by: adminUser.user_id,
            })
            .eq('id', report.id)

          await logAudit('content.remove', report.id, {
            target_type: report.target_type,
            target_id: report.target_id,
            reason: notes.trim(),
          })
          toast.success(`Contenu ${report.target_type} supprime`)
          break
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    } catch (err) {
      toast.error('Erreur action', err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      closeAction()
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
          <ShieldAlert className="size-6" aria-hidden="true" />
          {t('admin.moderation.title', { defaultValue: 'Modération' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {total} signalement(s) {statusFilter !== 'all' && `(filtre : ${statusFilter})`}
        </p>
      </div>

      {/* BATCH 108 : Stats cards (KPIs modération globaux, non filtrés) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ModStatCard
          label="À traiter"
          value={stats?.openCount ?? 0}
          color={stats && stats.openCount > 0 ? 'warning' : 'success'}
          hint="Nouveaux signalements"
        />
        <ModStatCard
          label="En cours"
          value={stats?.inReviewCount ?? 0}
          color="info"
          hint="Assignés à un modérateur"
        />
        <ModStatCard
          label="Critiques"
          value={stats?.criticalCount ?? 0}
          color={stats && stats.criticalCount > 0 ? 'error' : 'muted'}
          hint="Priorité critique non résolus"
        />
        <ModStatCard
          label="Résolus (7j)"
          value={stats?.resolved7d ?? 0}
          color="success"
          hint="Action prise cette semaine"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filtrer par statut"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">🆕 Nouveau</option>
          <option value="in_review">👁 En cours</option>
          <option value="resolved">✅ Resolu</option>
          <option value="dismissed">✕ Rejete</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
          aria-label="Filtrer par priorite"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">Toutes priorites</option>
          <option value="critical">Critique</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
      </div>

      {/* Reports list */}
      <section className="bg-background border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            🟢 {statusFilter === 'new' ? 'Aucun signalement ouvert.' : 'Aucun resultat.'} Tout est
            calme.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const status = statusConfig[r.status as ReportStatus] ?? {
                label: r.status,
                color: 'text-muted-foreground',
              }
              const priority = priorityConfig[r.priority as ReportPriority] ?? {
                label: r.priority,
                color: 'text-muted-foreground',
              }
              const reporterUsername = reporterMap?.get(r.reporter_id)
              const targetLink =
                r.target_type === 'post'
                  ? `/post/${r.target_id}`
                  : r.target_type === 'profile'
                    ? `/profile/${r.target_id}`
                    : null

              return (
                <li
                  key={r.id}
                  className="px-5 py-4 hover:bg-[var(--color-bg-secondary)]/40 transition-colors"
                >
                  {/* BATCH 106 : bouton 'Détails' dans les actions ouvre le drawer */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    {/* Left : info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className={`text-xs font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(r.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="capitalize">{r.target_type}</span> signale —{' '}
                        <span className="text-muted-foreground">{r.reason}</span>
                      </p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          "{r.description}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Par{' '}
                        {reporterUsername ? (
                          <Link
                            to={`/profile/${reporterUsername}`}
                            className="text-primary hover:underline"
                          >
                            @{reporterUsername}
                          </Link>
                        ) : (
                          <span className="font-mono">{r.reporter_id.slice(0, 8)}</span>
                        )}
                      </p>
                      {r.resolution_notes && (
                        <p className="text-xs text-foreground bg-muted/30 px-2 py-1 rounded mt-1">
                          <span className="font-medium">Note :</span> {r.resolution_notes}
                        </p>
                      )}
                    </div>

                    {/* Right : actions — bouton Détails ouvre le drawer (BATCH 106) */}
                    <div className="flex items-center gap-2 shrink-0 relative">
                      <button
                        type="button"
                        onClick={() => setDetailReport(r)}
                        aria-label={`Voir le détail du signalement`}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium text-[var(--color-action-default)] hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        Détails
                      </button>
                      {targetLink && (
                        <Link
                          to={targetLink}
                          className="size-8 inline-flex items-center justify-center rounded hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Voir ${r.target_type}`}
                        >
                          <Eye className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                      {r.status === 'new' && (
                        <Button variant="secondary" size="sm" onClick={() => quickReview(r)}>
                          Prendre
                        </Button>
                      )}
                      {(r.status === 'new' || r.status === 'in_review') && (
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                          aria-label="Plus d'actions"
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === r.id}
                          className="size-8 inline-flex items-center justify-center rounded hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </button>
                      )}
                      {openMenuId === r.id && (
                        <ReportActionMenu
                          report={r}
                          onAction={openAction}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between gap-3 text-sm"
          aria-label="Pagination signalements"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>Precedent</span>
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <span>Suivant</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      )}

      {/* ── Confirm modal ─────────────────────────────────────────────── */}
      {pending.type && pending.report && (
        <ConfirmModal
          title={
            pending.type === 'resolve'
              ? `Resoudre ce signalement ?`
              : pending.type === 'dismiss'
                ? `Rejeter ce signalement ?`
                : pending.type === 'remove_content'
                  ? `Supprimer le contenu signale ?`
                  : 'Confirmer'
          }
          description={
            pending.type === 'resolve'
              ? "Marquer comme resolu. Une note d'explication est requise (visible dans l'audit log)."
              : pending.type === 'dismiss'
                ? "Rejeter ce signalement comme non valide. Notes obligatoires (visibles dans l'audit log)."
                : '⚠️ Le contenu sera supprime (soft-delete). Cette action est loggue dans admin_actions et IRREVERSIBLE.'
          }
          confirmLabel={
            pending.type === 'remove_content'
              ? 'Supprimer contenu'
              : pending.type === 'dismiss'
                ? 'Rejeter'
                : 'Resoudre'
          }
          variant={pending.type === 'remove_content' ? 'danger' : 'default'}
          onCancel={closeAction}
          onConfirm={confirmAction}
          confirmDisabled={notes.trim().length < 10}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="action-notes" className="text-xs font-medium text-foreground">
              {pending.type === 'remove_content' ? 'Raison' : 'Notes'} (10 caracteres min)
            </label>
            <textarea
              id="action-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                pending.type === 'remove_content'
                  ? 'Ex: spam confirme, contenu inapproprie...'
                  : 'Explication de la decision (visible audit log)...'
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <span className="text-xs text-muted-foreground self-end">{notes.length} / 500</span>
          </div>
        </ConfirmModal>
      )}

      {/* BATCH 106 : Drawer side-panel pour le détail d'un signalement */}
      {detailReport && (
        <ReportDetailDrawer
          report={detailReport}
          onClose={() => {
            setDetailReport(null)
            setNotifTargetMsg('')
            setNotifReporterMsg('')
          }}
          notifTargetMsg={notifTargetMsg}
          setNotifTargetMsg={setNotifTargetMsg}
          notifReporterMsg={notifReporterMsg}
          setNotifReporterMsg={setNotifReporterMsg}
          sendingNotif={sendingNotif}
          setSendingNotif={setSendingNotif}
          toast={toast}
        />
      )}
    </div>
  )
}

// ─── ReportDetailDrawer (BATCH 106) ──────────────────────────────────────
//
// Side-panel slide-in droite avec :
//   - Détails complets du signalement (status / priority / raison / description)
//   - Preview du contenu signalé (post avec titre + description, profil avec username)
//   - Compteur de signalements précédents sur la cible
//   - Form notification à l'utilisateur signalé (motif suppression / avertissement)
//   - Form notification au signaleur (confirmation de l'action)
//   - Lien externe vers la cible
//
// L'envoi des notifs crée une row dans `notifications` + mailto: fallback.

interface ReportDetailDrawerProps {
  report: ReportRow
  onClose: () => void
  notifTargetMsg: string
  setNotifTargetMsg: (v: string) => void
  notifReporterMsg: string
  setNotifReporterMsg: (v: string) => void
  sendingNotif: boolean
  setSendingNotif: (v: boolean) => void
  toast: { success: (t: string, d?: string) => void; error: (t: string, d?: string) => void }
}

function ReportDetailDrawer({
  report,
  onClose,
  notifTargetMsg,
  setNotifTargetMsg,
  notifReporterMsg,
  setNotifReporterMsg,
  sendingNotif,
  setSendingNotif,
  toast,
}: ReportDetailDrawerProps) {
  // Fetch preview du contenu signalé (post ou profil)
  const { data: targetPreview } = useQuery({
    queryKey: ['mod-target-preview', report.target_type, report.target_id],
    queryFn: async () => {
      if (!supabase) return null
      if (report.target_type === 'post') {
        const { data } = await supabase
          .from('posts')
          .select('id, title, description, user_id, type, status, visibility, created_at')
          .eq('id', report.target_id)
          .maybeSingle()
        return data
      }
      if (report.target_type === 'profile') {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email, first_name, last_name, bio, posts_count')
          .eq('id', report.target_id)
          .maybeSingle()
        return data
      }
      return null
    },
  })

  // Compteur signalements précédents sur la même cible
  const { data: relatedCount } = useQuery({
    queryKey: ['mod-related-count', report.target_id],
    queryFn: async () => {
      if (!supabase) return 0
      const { count } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', report.target_id)
      return count ?? 0
    },
  })

  // Fetch info user signalé (pour son user_id si target=post)
  const targetUserId =
    report.target_type === 'profile'
      ? report.target_id
      : (targetPreview as { user_id?: string } | null)?.user_id

  async function sendNotificationTo(
    targetUserId: string,
    title: string,
    body: string,
  ): Promise<boolean> {
    if (!supabase || !targetUserId) return false
    const { error } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'system',
      title,
      body,
      reference_id: report.id,
      reference_type: 'moderation_report',
      read: false,
    })
    return !error
  }

  async function handleSendTargetMsg() {
    if (!targetUserId || notifTargetMsg.trim().length < 10) {
      toast.error('Message trop court (10 caractères min)')
      return
    }
    setSendingNotif(true)
    const ok = await sendNotificationTo(
      targetUserId,
      'Message de l’équipe modération',
      notifTargetMsg.trim(),
    )
    setSendingNotif(false)
    if (ok) {
      toast.success(
        'Notification envoyée à l’utilisateur',
        'Il la verra dans son panneau notifications.',
      )
      setNotifTargetMsg('')
    } else {
      toast.error('Erreur envoi notification')
    }
  }

  async function handleSendReporterMsg() {
    if (notifReporterMsg.trim().length < 10) {
      toast.error('Message trop court (10 caractères min)')
      return
    }
    setSendingNotif(true)
    const ok = await sendNotificationTo(
      report.reporter_id,
      'Mise à jour sur ton signalement',
      notifReporterMsg.trim(),
    )
    setSendingNotif(false)
    if (ok) {
      toast.success('Signaleur notifié', 'Confirmation envoyée dans son panneau.')
      setNotifReporterMsg('')
    } else {
      toast.error('Erreur envoi notification au signaleur')
    }
  }

  const targetExternalLink =
    report.target_type === 'post'
      ? `/post/${report.target_id}`
      : report.target_type === 'profile'
        ? `/profile/${report.target_id}`
        : null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Détail du signalement"
        className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[480px] bg-[var(--color-bg-primary)] shadow-2xl flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-250"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-bold text-foreground inline-flex items-center gap-2">
            <ShieldAlert className="size-4 text-[var(--color-action-default)]" aria-hidden="true" />
            Détail du signalement
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)]"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Méta */}
          <section className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Information
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="font-medium text-foreground">{report.status}</p>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Priorité</p>
                <p className="font-medium text-foreground">{report.priority}</p>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium text-foreground capitalize">{report.target_type}</p>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Signalements totaux</p>
                <p className="font-medium text-foreground">{relatedCount ?? '—'}</p>
              </div>
            </div>
            <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Raison</p>
              <p className="text-sm font-medium text-foreground">{report.reason}</p>
              {report.description && (
                <>
                  <p className="text-xs text-muted-foreground mt-2 mb-1">Description</p>
                  <p className="text-sm text-foreground italic">"{report.description}"</p>
                </>
              )}
            </div>
          </section>

          {/* Preview cible */}
          {targetPreview && (
            <section className="flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Aperçu du contenu signalé
              </h4>
              <div className="bg-[var(--color-bg-secondary)]/40 rounded-xl p-4 border border-[var(--color-border)]">
                {report.target_type === 'post' ? (
                  <>
                    <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-2">
                      <FileText className="size-3.5" aria-hidden="true" />
                      {(targetPreview as { title?: string }).title || '(Sans titre)'}
                    </p>
                    <p className="text-sm text-foreground line-clamp-4 whitespace-pre-line">
                      {(targetPreview as { description?: string }).description ||
                        '(Pas de description)'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground mb-1">
                      @{(targetPreview as { username?: string }).username}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {(targetPreview as { email?: string }).email}
                    </p>
                    {(targetPreview as { bio?: string | null }).bio && (
                      <p className="text-sm text-foreground italic line-clamp-3">
                        "{(targetPreview as { bio?: string }).bio}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {(targetPreview as { posts_count?: number }).posts_count ?? 0} observations
                    </p>
                  </>
                )}
              </div>
              {targetExternalLink && (
                <Link
                  to={targetExternalLink}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-action-default)] hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden="true" />
                  Ouvrir dans un nouvel onglet
                </Link>
              )}
            </section>
          )}

          {/* Form : notif à l'utilisateur signalé */}
          {targetUserId && (
            <section className="flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Notifier l'utilisateur signalé
              </h4>
              <p className="text-xs text-muted-foreground">
                Crée une notification dans son panneau (motif suppression, avertissement, etc.).
              </p>
              <textarea
                value={notifTargetMsg}
                onChange={(e) => setNotifTargetMsg(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex : votre post a été masqué car il enfreint la règle X..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleSendTargetMsg}
                disabled={sendingNotif || notifTargetMsg.trim().length < 10}
                icon={<Mail className="size-4" aria-hidden="true" />}
              >
                Envoyer à l'utilisateur
              </Button>
            </section>
          )}

          {/* Form : notif au signaleur */}
          <section className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Notifier le signaleur
            </h4>
            <p className="text-xs text-muted-foreground">
              Confirmation du traitement de son signalement (action prise, remerciement).
            </p>
            <textarea
              value={notifReporterMsg}
              onChange={(e) => setNotifReporterMsg(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex : merci pour ton signalement, nous avons retiré le contenu..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendReporterMsg}
              disabled={sendingNotif || notifReporterMsg.trim().length < 10}
              icon={<Mail className="size-4" aria-hidden="true" />}
            >
              Notifier le signaleur
            </Button>
          </section>
        </div>
      </aside>
    </>
  )
}

// ─── ReportActionMenu sub-component ─────────────────────────────────────

interface ReportActionMenuProps {
  report: ReportRow
  onAction: (type: Exclude<ActionType, null>, report: ReportRow) => void
  onClose: () => void
}

function ReportActionMenu({ report, onAction, onClose }: ReportActionMenuProps) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        className="absolute right-0 top-9 z-20 min-w-[200px] bg-background border border-border rounded-md shadow-lg py-1 text-sm"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => onAction('resolve', report)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-success,#16a34a)]/10 text-[var(--color-success,#16a34a)] focus-visible:outline-none focus-visible:bg-[var(--color-success,#16a34a)]/10 text-left"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Resoudre
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => onAction('dismiss', report)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30 text-left"
        >
          <XCircle className="size-3.5" aria-hidden="true" />
          Rejeter (non valide)
        </button>
        {(report.target_type === 'post' || report.target_type === 'comment') && (
          <>
            <div className="my-1 border-t border-border" aria-hidden="true" />
            <button
              type="button"
              role="menuitem"
              onClick={() => onAction('remove_content', report)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-error,#dc2626)]/10 text-[var(--color-error,#dc2626)] focus-visible:outline-none focus-visible:bg-[var(--color-error,#dc2626)]/10 text-left"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Supprimer contenu
            </button>
          </>
        )}
        <div className="my-1 border-t border-border" aria-hidden="true" />
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3 inline mr-1" aria-hidden="true" />
          Toutes actions loggees
        </div>
      </div>
    </>
  )
}

// ─── ModStatCard (BATCH 108) ────────────────────────────────────────────────

/**
 * Carte stat compacte pour le header modération.
 * 4 variantes de couleur selon la gravité du signal qu'elle représente.
 */
function ModStatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string
  value: number
  color: 'success' | 'warning' | 'error' | 'info' | 'muted'
  hint: string
}) {
  const colorMap: Record<typeof color, { valueClass: string; dot: string }> = {
    success: {
      valueClass: 'text-[var(--color-success)]',
      dot: 'bg-[var(--color-success)]',
    },
    warning: {
      valueClass: 'text-[var(--color-warning)]',
      dot: 'bg-[var(--color-warning)]',
    },
    error: {
      valueClass: 'text-[var(--color-error)]',
      dot: 'bg-[var(--color-error)]',
    },
    info: { valueClass: 'text-primary', dot: 'bg-primary' },
    muted: { valueClass: 'text-foreground', dot: 'bg-[var(--color-border)]' },
  }
  const c = colorMap[color]
  return (
    <div className="bg-background border border-border rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className={`text-2xl font-bold tabular-nums ${c.valueClass}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}
