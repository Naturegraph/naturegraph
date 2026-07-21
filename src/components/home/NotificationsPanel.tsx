/**
 * NotificationsPanel : Dropdown des notifications (persistantes, cloche header)
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
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import {
  useNotifications,
  useMarkManyAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications'
import { SwipeableNotifItem } from './SwipeableNotifItem'
import {
  NotifIcon,
  NotifChip,
  Avatar,
  getMessage,
  getReactionLabel,
  resolveDeepLink,
} from '@/components/notifications/NotifItem'
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

// ─── Sous-composants et helpers ───────────────────────────────────────────────

// NotifIcon, NotifChip, Avatar, getMessage et resolveDeepLink vivaient ici en
// double, recopies a l'identique dans components/notifications/NotifItem.tsx.
// Les deux copies avaient deja diverge (le regroupement des publications ne
// s'appliquait qu'ici, les libelles de reaction aussi), ce qui donnait deux
// centres de notifications differents selon la surface. Source unique desormais :
// tout est importe de NotifItem, cf. l'import en haut de fichier.

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
  const deleteNotif = useDeleteNotification(user?.id)
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

  // Fermer si clic en dehors du panel.
  // 2026-05-19 (Nicolas) : "Tout marquer comme lu" ne fonctionnait pas en
  // mobile : même cause que ProfileMenu : `mousedown` document handler
  // tirait AVANT le click React du bouton interne, et panelRef pointe
  // uniquement sur le dropdown desktop (caché en mobile). Du coup
  // `panelRef.current.contains(target)` retournait false même pour un
  // clic dans le sheet mobile → onClose() avant que la mutation ne fire.
  // Fix : `click` post-React + `closest('[role="dialog"]')` pour matcher
  // les 2 dialogues (desktop + mobile).
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[role="dialog"][aria-label="' + t('home.notifications.title') + '"]'))
        return
      // V1.1.4 (Nicolas 2026-06-01) : cumul panels navbar.
      // Click sur un autre bouton toggle ou un autre dialog -> ne ferme pas.
      if (target.closest('button[aria-haspopup="dialog"]')) return
      if (target.closest('[role="dialog"]')) return
      onClose()
    }
    const timer = setTimeout(() => document.addEventListener('click', fn), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', fn)
    }
  }, [onClose, t])

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
      {/* Header : pas de badge unreadCount ici : doublon avec la cloche header
          qui porte déjà le compteur (Nicolas 2026-05-19). */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        {/* Titre cliquable : mene a la page complete /notifications (filtres +
            pagination). Retour Nicolas 2026-07-06 : donner acces au systeme
            complet depuis la cloche. On ferme le panneau avant de naviguer. */}
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/notifications')
          }}
          className="font-title font-bold text-base text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
        >
          {t('home.notifications.title')}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('home.notifications.close')}
          className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Liste groupée par date (BATCH 114 : max-h responsive : 60vh sur mobile pour gérer le clavier virtuel) */}
      <div className="max-h-[60vh] md:max-h-[420px] overflow-y-auto">
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

                <SwipeableNotifItem
                  onDelete={() => {
                    // Supprime tous les IDs du groupe (notif peut être groupée :
                    // ex « ClaireD & Papidou ont réagi à ton post » → 2 IDs).
                    const ids = notif.group_ids ?? [notif.id]
                    ids.forEach((id) => deleteNotif.mutate(id))
                  }}
                  deleteLabel={t('home.notifications.delete', {
                    defaultValue: 'Supprimer cette notification',
                  })}
                >
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
                        <NotifChip type={notif.type} t={t} />
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
                        <span className="text-muted-foreground">
                          {getMessage(notif.type, t, notif.group_count)}
                        </span>
                      </p>
                      {/*
                        Corps de la notification. Utilise principalement par les notifs
                        type=system ou l administrateur ecrit un message libre, ainsi que
                        les captions de posts. Pour type=reaction, le body brut stocke en
                        base est la cle anglaise du trigger SQL (ex: "love") : on le
                        traduit via getReactionLabel (emoji + libelle FR, NG-046 #2).
                        line-clamp-2 : evite les pavés de texte denses dans le panneau
                        mobile (NG-046 #1). whitespace-pre-line preserve les retours a la
                        ligne du texte stocke en base pour les notifs system.
                      */}
                      {notif.body &&
                        !(notif.type === 'post' && notif.group_count > 1) &&
                        (notif.type !== 'reaction' || getReactionLabel(notif.body, t)) && (
                          <p className="mt-1 text-sm text-muted-foreground leading-snug whitespace-pre-line line-clamp-2">
                            {notif.type === 'reaction'
                              ? getReactionLabel(notif.body, t)
                              : notif.body}
                          </p>
                        )}
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
                </SwipeableNotifItem>
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

  // Mobile bottom sheet via React Portal : sans portal, le sticky parent
  // (HomeNavbar z-40) créait un stacking context qui contenait notre z-60.
  // Résultat : la bottom nav (z-50 dans body) restait visible au-dessus.
  // Le portal place le sheet DIRECTEMENT dans body → notre z-[60] gagne.
  const mobileSheet =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[60]"
              aria-hidden="true"
              onClick={onClose}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('home.notifications.title')}
              className="md:hidden fixed inset-x-0 bottom-0 z-[61] bg-cream-lighter border-t border-border rounded-t-xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
              {panelContent}
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <>
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

      {mobileSheet}
    </>
  )
}
