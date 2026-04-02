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
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

// ─── Types & données mock ─────────────────────────────────────────────────────

type NotifType = 'reaction' | 'follow'

interface MockNotif {
  id: string
  type: NotifType
  username: string
  /** Emoji animal affiché en badge sur l'avatar */
  avatarBadge: string
  avatarUrl?: string
  message: string
  /** Heure affichée (ex. "14:30") */
  time: string
  /** Groupe de date affiché en séparateur (ex. "Hier", "Il y a 3 jours") */
  dateGroup: string
  read: boolean
  /** Pour les follows : lien vers le profil */
  profileHref?: string
}

const MOCK_NOTIFS: MockNotif[] = [
  {
    id: '1',
    type: 'reaction',
    username: 'Marie_Nature',
    avatarBadge: '🦊',
    message: 'a réagi à ta photo de Faucon crécerelle',
    time: '14:30',
    dateGroup: 'Hier',
    read: false,
  },
  {
    id: '2',
    type: 'reaction',
    username: 'Oiseaux_et_Nature',
    avatarBadge: '🦅',
    message: 'a réagi à ta rencontre avec le Chevreuil',
    time: '09:15',
    dateGroup: 'Hier',
    read: false,
  },
  {
    id: '3',
    type: 'follow',
    username: 'Thomas.Wildlife',
    avatarBadge: '🐺',
    message: 'a commencé à te suivre',
    time: '18:42',
    dateGroup: 'Il y a 3 jours',
    read: true,
    profileHref: '/profile/Thomas.Wildlife',
  },
  {
    id: '4',
    type: 'follow',
    username: 'Lucas_Ornitho',
    avatarBadge: '🦉',
    message: 'a commencé à te suivre',
    time: '10:05',
    dateGroup: 'Il y a 3 jours',
    read: true,
    profileHref: '/profile/Lucas_Ornitho',
  },
]

// ─── Chip type notification ───────────────────────────────────────────────────

/** Rendu du chip coloré indiquant le type de notification */
function NotifChip({ type }: { type: NotifType }) {
  if (type === 'reaction') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
        Nouvelle réaction
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-light/30 text-teal-dark">
      Nouveau migrateur
    </span>
  )
}

// ─── Groupement par date ──────────────────────────────────────────────────────

/** Regroupe les notifications par dateGroup en préservant l'ordre d'apparition */
function groupByDate(notifs: MockNotif[]): Array<{ label: string; items: MockNotif[] }> {
  const map = new Map<string, MockNotif[]>()
  for (const n of notifs) {
    if (!map.has(n.dateGroup)) map.set(n.dateGroup, [])
    map.get(n.dateGroup)!.push(n)
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
  const groups = groupByDate(MOCK_NOTIFS)
  const unreadCount = MOCK_NOTIFS.filter((n) => !n.read).length

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

                <div className="flex items-start gap-3 px-5 py-3">
                  {/* Avatar avec badge animal */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="size-10 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
                      {notif.avatarUrl ? (
                        <img src={notif.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary" aria-hidden="true">
                          {notif.username.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Badge animal en bas à droite de l'avatar */}
                    <span
                      className="absolute -bottom-1 -right-1 text-sm leading-none"
                      aria-hidden="true"
                    >
                      {notif.avatarBadge}
                    </span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    {/* Chip type */}
                    <div className="mb-1">
                      <NotifChip type={notif.type} />
                    </div>

                    {/* Message */}
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold">{notif.username}</span> {notif.message}
                    </p>

                    {/* Lien "Voir son profil" pour les follows */}
                    {notif.type === 'follow' && notif.profileHref && (
                      <Link
                        to={notif.profileHref}
                        onClick={onClose}
                        className="text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded mt-1 inline-block"
                      >
                        Voir son profil
                      </Link>
                    )}
                  </div>

                  {/* Heure + point non-lu */}
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-1">
                    <span className="text-xs text-muted-foreground">{notif.time}</span>
                    {!notif.read && (
                      <div className="size-2.5 rounded-full bg-primary" aria-label="Non lu" />
                    )}
                  </div>
                </div>
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
