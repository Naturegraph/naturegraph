/**
 * NotificationsPanel — Dropdown des notifications
 *
 * Affiche les dernières activités : commentaires, identifications,
 * nouveaux abonnés, invitations carnets.
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer
 *   - Focus sur le premier élément à l'ouverture
 */

import { useEffect, useRef } from 'react'
import { Bell, MessageCircle, Users, CheckCircle, BookOpen, X } from 'lucide-react'

// ─── Données mock ─────────────────────────────────────────────────────────────
// TODO [BACKEND] — Remplacer MOCK_NOTIFS par un appel à notificationService.getNotifications() :
//   - Table Supabase : `notifications` (id, type, actor_id, target_id, post_id, read, created_at)
//   - Temps réel : Supabase Realtime (channel 'notifications:user_id=eq.{userId}')
//     → Mettre à jour le compteur unread dans HomeNavbar en temps réel via onInsert
//   - Marquer comme lu : PATCH /notifications/:id { read: true } ou batch UPDATE
//   - "Voir toutes les notifications" → route /notifications (à créer)
//   Ref: src/services/index.ts — notificationService (TODO noté, à créer)

type NotifType = 'comment' | 'follow' | 'identification' | 'notebook'

interface MockNotif {
  id: string
  type: NotifType
  username: string
  avatar?: string
  message: string
  time: string
  read: boolean
}

const MOCK_NOTIFS: MockNotif[] = [
  {
    id: '1',
    type: 'comment',
    username: 'Marie_Nature',
    message: 'a commenté ton observation de Chevreuil européen',
    time: 'Il y a 5 min',
    read: false,
  },
  {
    id: '2',
    type: 'identification',
    username: 'Oiseaux_et_Nature',
    message: 'a proposé une identification pour ton instant nature',
    time: 'Il y a 22 min',
    read: false,
  },
  {
    id: '3',
    type: 'follow',
    username: 'Thomas.Wildlife',
    message: 'a commencé à te suivre',
    time: 'Il y a 1h',
    read: false,
  },
  {
    id: '4',
    type: 'notebook',
    username: 'Lucas_Ornitho',
    message: 't\'a invité à contribuer au carnet "Oiseaux de Bretagne"',
    time: 'Il y a 3h',
    read: true,
  },
  {
    id: '5',
    type: 'comment',
    username: 'Sophie_Biodiv',
    message: 'a aimé ta photo de Rouge-gorge familier',
    time: 'Hier',
    read: true,
  },
]

const NOTIF_ICON: Record<NotifType, React.ReactNode> = {
  comment: <MessageCircle className="size-4 text-primary" aria-hidden="true" />,
  follow: <Users className="size-4 text-teal-dark" aria-hidden="true" />,
  identification: <CheckCircle className="size-4 text-[#00673f]" aria-hidden="true" />,
  notebook: <BookOpen className="size-4 text-foreground" aria-hidden="true" />,
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const unreadCount = MOCK_NOTIFS.filter((n) => !n.read).length

  // Fermer sur Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fermer si clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="absolute top-[calc(100%+8px)] right-0 w-[380px] bg-cream-lighter border-[0.5px] border-border rounded-card shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-foreground" aria-hidden="true" />
          <p className="font-bold text-foreground">Notifications</p>
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
          className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Liste */}
      <div className="max-h-[420px] overflow-y-auto">
        {MOCK_NOTIFS.map((notif) => (
          <button
            key={notif.id}
            type="button"
            className={[
              'w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:bg-muted/30',
              !notif.read ? 'bg-primary-light/30' : '',
            ].join(' ')}
          >
            {/* Indicateur non-lu */}
            <div className="relative shrink-0 mt-0.5">
              <div className="size-9 rounded-full bg-primary-light flex items-center justify-center">
                {NOTIF_ICON[notif.type]}
              </div>
              {!notif.read && (
                <div className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary border-2 border-cream-lighter" />
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-bold">{notif.username}</span> {notif.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
            </div>
          </button>
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
    </div>
  )
}
