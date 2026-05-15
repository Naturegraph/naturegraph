/**
 * NotificationsPanel — Dropdown des notifications (persistantes, cloche header)
 *
 * À ne pas confondre avec le ToastContext (notifications UI éphémères).
 *
 * Types gérés (MVP Phase 1) :
 *   - reaction       : quelqu'un a réagi à un de mes posts
 *   - follow         : quelqu'un commence à me suivre
 *   - post           : un profil suivi a publié un nouveau post
 *   - species_digest : résumé hebdo activité espèces suivies
 *   - comment / mention / identification / system (phase 2)
 *
 * Responsive :
 *   - Desktop : dropdown ancré au bouton cloche (top-[calc(100%+8px)] right-0)
 *   - Mobile  : bottom sheet (fixed inset-x-0 bottom-0)
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label i18n
 *   - Escape pour fermer, clic backdrop (mobile) ferme
 *   - Focus visible sur tous les items cliquables
 *
 * Données :
 *   - Vue SQL notifications_with_actor → actor_id/username/avatar_url joints
 *   - Realtime via Supabase channel (voir useNotifications)
 *   - Deep-link onClick selon reference_type (post | profile | species)
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  Heart,
  UserPlus,
  FileText,
  Leaf,
  MessageCircle,
  AtSign,
  Award,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useNotifications, useMarkManyAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'
import type { NotificationType } from '@/services/notificationService'
import {
  groupNotifications,
  formatGroupedActors,
  type GroupedNotification,
} from '@/utils/groupNotifications'
import { trackNotifEvent } from '@/utils/notificationAnalytics'
import { EmptyState, LoadingState } from '@/components/ui'

// ─── Helpers date ─────────────────────────────────────────────────────────────

/** Format heure courte HH:mm à partir d'un ISO. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Clé de groupe (today / yesterday / N_days_ago / date absolue). */
type GroupKey =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'days_ago'; count: number }
  | { kind: 'absolute'; label: string }

function dateGroupKey(iso: string): GroupKey {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays <= 0) return { kind: 'today' }
  if (diffDays === 1) return { kind: 'yesterday' }
  if (diffDays < 7) return { kind: 'days_ago', count: diffDays }
  return { kind: 'absolute', label: d.toLocaleDateString('fr-FR') }
}

// ─── Icône par type ───────────────────────────────────────────────────────────

/** Icône Lucide associée à chaque type de notification. */
function NotifIcon({ type }: { type: NotificationType }) {
  const map: Record<NotificationType, { Icon: typeof Heart; bg: string; color: string }> = {
    reaction: {
      Icon: Heart,
      bg: 'bg-[var(--color-warning-bg)]',
      color: 'text-[var(--color-warning)]',
    },
    follow: { Icon: UserPlus, bg: 'bg-teal-light/30', color: 'text-teal-dark' },
    post: { Icon: FileText, bg: 'bg-primary-light', color: 'text-primary' },
    species_digest: { Icon: Leaf, bg: 'bg-teal-light/30', color: 'text-teal-dark' },
    comment: { Icon: MessageCircle, bg: 'bg-primary-light', color: 'text-primary' },
    mention: { Icon: AtSign, bg: 'bg-primary-light', color: 'text-primary' },
    identification: { Icon: Award, bg: 'bg-teal-light/30', color: 'text-teal-dark' },
    system: { Icon: Bell, bg: 'bg-muted', color: 'text-muted-foreground' },
  }
  const { Icon, bg, color } = map[type] ?? map.system
  return (
    <span
      aria-hidden="true"
      className={`absolute -bottom-1 -right-1 size-5 rounded-full ${bg} ${color} flex items-center justify-center ring-2 ring-cream-lighter`}
    >
      <Icon className="size-3" />
    </span>
  )
}

// ─── Chip type notification (label texte) ─────────────────────────────────────

function NotifChip({ type }: { type: NotificationType }) {
  const { t } = useTranslation()
  const labelKey: Record<NotificationType, string> = {
    reaction: 'home.notifications.typeReaction',
    follow: 'home.notifications.typeFollow',
    post: 'home.notifications.typePost',
    species_digest: 'home.notifications.typeSpeciesDigest',
    comment: 'home.notifications.typeComment',
    mention: 'home.notifications.typeMention',
    identification: 'home.notifications.typeIdentification',
    system: 'home.notifications.typeSystem',
  }
  const chipCls: Record<NotificationType, string> = {
    reaction: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    follow: 'bg-teal-light/30 text-teal-dark',
    post: 'bg-primary-light text-primary',
    species_digest: 'bg-teal-light/30 text-teal-dark',
    comment: 'bg-primary-light text-primary',
    mention: 'bg-primary-light text-primary',
    identification: 'bg-teal-light/30 text-teal-dark',
    system: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${chipCls[type] ?? chipCls.system}`}
    >
      {t(labelKey[type] ?? labelKey.system)}
    </span>
  )
}

// ─── Message par type ─────────────────────────────────────────────────────────

/** Phrase secondaire affichée sous le username + chip. */
function getMessage(type: NotificationType, t: (k: string) => string): string {
  switch (type) {
    case 'reaction':
      return t('home.notifications.messageReaction')
    case 'follow':
      return t('home.notifications.messageFollow')
    case 'post':
      return t('home.notifications.messagePost')
    case 'species_digest':
      return t('home.notifications.messageSpeciesDigest')
    default:
      return ''
  }
}

// ─── Deep-link ────────────────────────────────────────────────────────────────

/** Retourne la route vers laquelle naviguer selon reference_type/id. */
function resolveDeepLink(n: GroupedNotification): string | null {
  if (!n.reference_id || !n.reference_type) return null
  switch (n.reference_type) {
    case 'post':
      return `/post/${n.reference_id}`
    case 'profile':
      return n.actor_username ? `/profile/${n.actor_username}` : `/profile/${n.reference_id}`
    case 'species':
      return `/species/${n.reference_id}`
    default:
      return null
  }
}

// ─── Groupement par date ──────────────────────────────────────────────────────

interface Group {
  key: string
  labelKey: GroupKey
  items: GroupedNotification[]
}

function groupByDate(notifs: GroupedNotification[]): Group[] {
  const map = new Map<string, Group>()
  for (const n of notifs) {
    const k = dateGroupKey(n.created_at)
    const serialized =
      k.kind === 'days_ago'
        ? `days_ago:${k.count}`
        : k.kind === 'absolute'
          ? `abs:${k.label}`
          : k.kind
    if (!map.has(serialized)) {
      map.set(serialized, { key: serialized, labelKey: k, items: [] })
    }
    map.get(serialized)!.items.push(n)
  }
  return Array.from(map.values())
}

function formatGroupLabel(
  k: GroupKey,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  if (k.kind === 'today') return t('home.notifications.groupToday')
  if (k.kind === 'yesterday') return t('home.notifications.groupYesterday')
  if (k.kind === 'days_ago') return t('home.notifications.groupDaysAgo', { count: k.count })
  return k.label
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/** Avatar de l'acteur avec fallback sur initiales. */
function Avatar({ url, fallback }: { url: string | null; fallback: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={40}
        height={40}
        className="size-10 rounded-full object-cover bg-primary-light"
      />
    )
  }
  return (
    <div className="size-10 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
      <span className="text-sm font-bold text-primary" aria-hidden="true">
        {fallback.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface NotificationsPanelProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { data: rawNotifs = [], isLoading } = useNotifications(user?.id)
  const markManyAsRead = useMarkManyAsRead(user?.id)
  const markAllAsRead = useMarkAllAsRead(user?.id)
  // Regroupe les notifs identiques < 24h (ex : "Alice & Bob ont réagi à ton post")
  const notifs = groupNotifications(rawNotifs)
  const groups = groupByDate(notifs)
  const unreadCount = notifs.filter((n) => !n.read).length

  // Analytics : ouverture/fermeture du panel (mount/unmount)
  useEffect(() => {
    trackNotifEvent('panel_opened')
    return () => trackNotifEvent('panel_closed')
  }, [])

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

  /**
   * Clic sur une notif (BATCH 107) :
   *  - Mark-as-read groupé (toutes les notifs du groupe si regroupé)
   *  - Deep-link si disponible → ferme panel + navigate
   *  - Sinon ferme le panel pour donner un feedback visuel à l'utilisateur
   *    (sans ça, cliquer sur une notif system donne l'impression que rien ne se passe)
   */
  const handleClick = (n: GroupedNotification) => {
    trackNotifEvent('notif_clicked', { notif_type: n.type })
    if (!n.read && n.group_ids.length > 0) {
      markManyAsRead.mutate(n.group_ids)
    }
    const url = resolveDeepLink(n)
    if (url) {
      onClose()
      navigate(url)
    }
  }

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <p className="font-title font-bold text-base text-foreground">
            {t('home.notifications.title')}
          </p>
          {unreadCount > 0 && (
            <span
              className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"
              aria-label={t('home.notifications.unreadBadge', { count: unreadCount })}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('home.notifications.close')}
          className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Liste groupée par date */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && (
          <LoadingState variant="skeleton" rows={4} label={t('home.notifications.loading')} />
        )}
        {!isLoading && notifs.length === 0 && (
          <EmptyState
            title={t('home.notifications.empty')}
            description={t('home.notifications.emptyHint')}
          />
        )}
        {groups.map((group, gi) => (
          <div key={group.key}>
            {gi > 0 && <div className="h-px bg-border mx-5" aria-hidden="true" />}

            <p className="px-5 pt-4 pb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {formatGroupLabel(group.labelKey, t)}
            </p>

            {group.items.map((notif, i) => (
              <div key={notif.id}>
                {i > 0 && <div className="h-px bg-border mx-5" aria-hidden="true" />}

                <button
                  type="button"
                  onClick={() => handleClick(notif)}
                  className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {/* Avatar + icône type en surcouche */}
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar
                      url={notif.actor_avatar_url}
                      fallback={notif.actor_username ?? notif.title ?? '?'}
                    />
                    <NotifIcon type={notif.type} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <NotifChip type={notif.type} />
                    </div>
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold">
                        {formatGroupedActors(notif, (n) =>
                          n === 1
                            ? t('home.notifications.othersOne')
                            : t('home.notifications.othersMany', { count: n }),
                        ) ??
                          notif.actor_username ??
                          notif.title ??
                          ''}
                      </span>{' '}
                      <span className="text-muted-foreground">{getMessage(notif.type, t)}</span>
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

      {/* Footer : tout marquer comme lu (la page /notifications n'existe pas, BATCH 107) */}
      {unreadCount > 0 && (
        <div className="px-5 py-3 border-t border-border">
          <button
            type="button"
            onClick={() => {
              markAllAsRead.mutate(undefined, {
                onSuccess: () => {
                  toast.success(t('home.notifications.markAllReadSuccess'))
                },
              })
            }}
            disabled={markAllAsRead.isPending}
            className="w-full text-sm text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('home.notifications.markAllRead')}
          </button>
        </div>
      )}
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
        aria-label={t('home.notifications.title')}
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[400px] bg-cream-lighter border border-border rounded-lg shadow-xl z-50 overflow-hidden"
      >
        {panelContent}
      </div>

      {/* Mobile : bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('home.notifications.title')}
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-cream-lighter border-t border-border rounded-t-xl shadow-xl overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {panelContent}
      </div>
    </>
  )
}
