/**
 * NotificationsPanel — Dropdown des notifications
 *
 * Affiche les notifications groupées par date :
 *   - "Nouvelle réaction" (chip orange) → quelqu'un a réagi à une observation
 *   - "Nouveau migrateur" (chip vert)   → quelqu'un a commencé à te suivre
 *
 * Responsive :
 *   - Desktop : dropdown absolue ancré au bouton cloche (top-[calc(100%+8px)] right-0)
 *   - Mobile  : bottom sheet (fixed inset-x-0 bottom-0)
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop (mobile) ferme
 *   - Points bleus non-lus décrits via aria-label sur le bouton parent
 *
 * TODO [BACKEND] — Remplacer MOCK_NOTIFS par :
 *   - notificationService.getNotifications() → SELECT FROM notifications ORDER BY created_at DESC
 *   - Temps réel : Supabase Realtime channel 'notifications:user_id=eq.{userId}'
 *   - Marquer comme lu : PATCH /notifications/:id { read: true }
 *   - Compteur non-lu remonté vers HomeNavbar via un context ou prop callback
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications'
import type { Notification, NotificationType } from '@/services/notificationService'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = NotificationType

/** Format heure courte HH:mm à partir d'un ISO. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Libellé de groupe (Aujourd'hui / Hier / date). */
function dateGroupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays <= 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  return d.toLocaleDateString('fr-FR')
}

// ─── Chip type notification ───────────────────────────────────────────────────

/** Rendu du chip coloré indiquant le type de notification */
function NotifChip({ type }: { type: NotifType }) {
  const labels: Record<NotifType, string> = {
    reaction: 'Nouvelle réaction',
    follow: 'Nouveau migrateur',
    comment: 'Nouveau commentaire',
    mention: 'Mention',
    identification: 'Identification',
    system: 'Système',
  }
  const cls =
    type === 'reaction'
      ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'bg-teal-light/30 text-teal-dark'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {labels[type] ?? type}
    </span>
  )
}

// ─── Groupement par date ──────────────────────────────────────────────────────

/** Regroupe les notifications par jour calendaire. */
function groupByDate(notifs: Notification[]): Array<{ label: string; items: Notification[] }> {
  const map = new Map<string, Notification[]>()
  for (const n of notifs) {
    const label = dateGroupLabel(n.created_at)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(n)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { data: notifs = [], isLoading } = useNotifications(user?.id)
  const markAsRead = useMarkAsRead(user?.id)
  const groups = groupByDate(notifs)
  const unreadCount = notifs.filter((n) => !n.read).length

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fermer si clic en dehors du panel
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <p className="font-title font-bold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les notifications"
          className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Liste groupée par date */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>}
        {!isLoading && notifs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune notification</p>
        )}
        {groups.map((group, gi) => (
          <div key={group.label}>
            {/* Séparateur de groupe */}
            {gi > 0 && <div className="h-px bg-border mx-5" aria-hidden="true" />}

            {/* Label de groupe */}
            <p className="px-5 pt-4 pb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </p>

            {/* Items du groupe */}
            {group.items.map((notif, i) => (
              <div key={notif.id}>
                {i > 0 && <div className="h-px bg-border mx-5" aria-hidden="true" />}

                <button
                  type="button"
                  onClick={() => {
                    if (!notif.read) markAsRead.mutate(notif.id)
                  }}
                  className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {/* Avatar placeholder */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="size-10 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
                      <span className="text-sm font-bold text-primary" aria-hidden="true">
                        {(notif.title ?? '?').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <NotifChip type={notif.type} />
                    </div>
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold">{notif.title}</span>
                      {notif.body ? ` ${notif.body}` : ''}
                    </p>
                  </div>

                  {/* Heure + point non-lu */}
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(notif.created_at)}
                    </span>
                    {!notif.read && (
                      <div className="size-2.5 rounded-full bg-primary" aria-label="Non lu" />
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <button
          type="button"
          className="w-full text-sm text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Voir toutes les notifications
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Backdrop mobile uniquement */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Desktop : dropdown absolue (positionnée par le parent relative) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[400px] bg-cream-lighter border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      >
        {panelContent}
      </div>

      {/* Mobile : bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-cream-lighter border-t border-border rounded-t-2xl shadow-xl overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {panelContent}
      </div>
    </>
  )
}
