/**
 * NotifItem : Sous-composants partagés entre NotificationsPanel et NotificationsPage
 *
 * Extraits pour éviter la duplication :
 *   - NotifIcon : petit badge Lucide en surcouche de l'avatar
 *   - NotifChip : pastille texte du type (i18n)
 *   - Avatar    : image ou fallback initiales
 *   - getMessage / resolveDeepLink : helpers pour construire la ligne
 *
 * Le rendu final de la ligne reste inline dans chaque surface pour garder
 * la flexibilité (tailles, hover, heures, etc.).
 */

import { Heart, UserPlus, FileText, Leaf, MessageCircle, AtSign, Award, Bell } from 'lucide-react'
import type { Notification, NotificationType } from '@/services/notificationService'

// ─── Icône par type ───────────────────────────────────────────────────────────

export function NotifIcon({ type }: { type: NotificationType }) {
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

// ─── Chip texte ───────────────────────────────────────────────────────────────

export function NotifChip({ type, t }: { type: NotificationType; t: (k: string) => string }) {
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ url, fallback }: { url: string | null; fallback: string }) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Phrase secondaire affichée sous le username + chip. */
export function getMessage(type: NotificationType, t: (k: string) => string): string {
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

/** Retourne la route vers laquelle naviguer selon reference_type/id. */
export function resolveDeepLink(n: Notification): string | null {
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
