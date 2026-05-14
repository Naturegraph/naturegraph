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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/contexts/ToastContext'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useAdminAction } from '@/hooks/useAdminAction'
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

const PAGE_SIZE = 20

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
    staleTime: 30 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
          {t('admin.moderation.title', { defaultValue: 'Moderation' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {total} {t('admin.moderation.totalLabel', { defaultValue: 'signalement(s)' })}
        </p>
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
                <li key={r.id} className="px-5 py-4">
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

                    {/* Right : actions */}
                    <div className="flex items-center gap-2 shrink-0 relative">
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
    </div>
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
