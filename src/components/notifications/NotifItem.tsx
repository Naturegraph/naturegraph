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
import { REACTION_CONFIG } from '@/components/home/FeedPost'
import hermineIcon from '@/assets/images/hermine-icon.png'

// ─── Icône par type ───────────────────────────────────────────────────────────

export function NotifIcon({ type }: { type: NotificationType }) {
  const map: Record<NotificationType, { Icon: typeof Heart; bg: string; color: string }> = {
    reaction: {
      Icon: Heart,
      bg: 'bg-[var(--color-warning-bg)]',
      color: 'text-[var(--color-warning)]',
    },
    follow: {
      Icon: UserPlus,
      bg: 'bg-[var(--color-success-bg)]',
      color: 'text-[var(--color-success)]',
    },
    post: { Icon: FileText, bg: 'bg-primary-light', color: 'text-[var(--color-link)]' },
    species_digest: { Icon: Leaf, bg: 'bg-teal-light/30', color: 'text-teal-dark' },
    // Echange = interaction SOCIALE : meme famille de couleur que les reactions
    // (amber) plutot que le violet d'action, pour ne pas melanger la couleur de
    // marque avec les notifs sociales (decision Nicolas 2026-07-28). L'icone
    // (bulle) le distingue d'un coeur.
    comment: {
      Icon: MessageCircle,
      bg: 'bg-[var(--color-warning-bg)]',
      color: 'text-[var(--color-warning)]',
    },
    mention: { Icon: AtSign, bg: 'bg-primary-light', color: 'text-[var(--color-link)]' },
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
    follow: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    post: 'bg-primary-light text-[var(--color-link)]',
    species_digest: 'bg-teal-light/30 text-teal-dark',
    // Echange = social : meme amber que les reactions (cf. NotifIcon).
    comment: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    mention: 'bg-primary-light text-[var(--color-link)]',
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

/**
 * Avatar de l'acteur. Sans photo, on affiche l'hermine officielle plutôt que
 * des initiales (décision Nicolas 2026-05-19, pour rester cohérent avec
 * MobileBottomNav, ProfileHeader, EditPhotoTab, GuestSidebar).
 *
 * Cette règle n'était appliquée que dans le panneau, qui gardait sa propre
 * copie du composant : la page plein écran, elle, affichait encore des
 * initiales. `fallback` reste accepté pour ne casser aucun appel existant,
 * mais n'est plus utilisé.
 */
export function Avatar({ url }: { url: string | null; fallback?: string }) {
  return (
    <img
      src={url ?? hermineIcon}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={40}
      height={40}
      className="size-10 rounded-full object-cover bg-primary-light"
    />
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Phrase secondaire affichée sous le username + chip.
 *
 * `groupCount` = nombre d'événements fusionnés par groupNotifications. À 1, on
 * garde la formulation unitaire. Au-delà, on annonce le total : sans ça, trois
 * publications regroupées s'annoncent au singulier, ce qui contredit la ligne
 * juste au-dessus (NG-046 #3).
 */
export function getMessage(
  type: NotificationType,
  t: (k: string, opts?: Record<string, unknown>) => string,
  groupCount = 1,
): string {
  switch (type) {
    case 'reaction':
      return t('home.notifications.messageReaction')
    case 'follow':
      return t('home.notifications.messageFollow')
    case 'post':
      // Pas de defaultValue : la cle existe dans fr.json et en.json. En mettre
      // un masquerait une cle manquante, ce qui est exactement ce qui laissait
      // l'interface anglaise afficher du francais sans que personne le voie.
      return groupCount > 1
        ? t('home.notifications.messagePostGrouped', { count: groupCount })
        : t('home.notifications.messagePost')
    case 'species_digest':
      return t('home.notifications.messageSpeciesDigest')
    // NG-049 : ces deux types etaient EMIS par la base mais absents d'ici, donc
    // affiches sans aucune phrase. Une notification qui ne dit pas ce qui s'est
    // passe ne sert a rien : on la lit, on ne comprend pas, on l'ignore.
    case 'comment':
      return groupCount > 1
        ? t('home.notifications.messagePostGrouped', { count: groupCount })
        : t('home.notifications.messageComment')
    case 'identification':
      return t('home.notifications.messageIdentification')
    default:
      return ''
  }
}

/** Emoji des réactions legacy retirées de REACTION_CONFIG (cf. FeedPost.tsx). */
const LEGACY_REACTION_EMOJI: Record<string, string> = {
  disappointed: '😕',
}

/**
 * Libellé FR (emoji + texte) d'une notification de réaction.
 *
 * `raw` = notif.body, stocké tel quel côté DB par le trigger SQL
 * (ex: "love", cf. supabase/migrations/20260413_reactions_notifications.sql).
 * Réutilise REACTION_CONFIG (source de vérité unique, cf. FeedPost.tsx) pour
 * éviter d'afficher la clé anglaise brute (NG-046 #2).
 *
 * Retourne null si le type de réaction est inconnu (aucun body à afficher).
 */
export function getReactionLabel(raw: string | null, t: (k: string) => string): string | null {
  if (!raw) return null
  const config = REACTION_CONFIG.find((r) => r.key === raw)
  if (config) return `${config.emoji} ${t(config.labelKey)}`
  const emoji = LEGACY_REACTION_EMOJI[raw]
  return emoji ?? null
}

/** Retourne la route vers laquelle naviguer selon reference_type/id. */
export function resolveDeepLink(n: Notification): string | null {
  if (!n.reference_id || !n.reference_type) return null
  switch (n.reference_type) {
    case 'post':
      // NG-049 : une notification d'echange doit ouvrir LE FIL, pas seulement
      // la publication. Depuis que le fil est replie par defaut, atterrir sur
      // la photo sans voir le message dont on vient d'etre prevenu donne
      // l'impression d'une notification cassee.
      return n.type === 'comment' || n.type === 'identification'
        ? `/post/${n.reference_id}?echanges=1`
        : `/post/${n.reference_id}`
    case 'profile':
      return n.actor_username ? `/profile/${n.actor_username}` : `/profile/${n.reference_id}`
    case 'species':
      return `/species/${n.reference_id}`
    default:
      return null
  }
}
