/**
 * groupNotifications : Regroupement des notifications identiques sur 24h
 *
 * Exemple : 3 personnes réagissent à mon post → une seule ligne
 *   "Alice, Bob + 1 autre ont réagi à ton post"
 *
 * Règles :
 *   - Même `type` + même `reference_type` + même `reference_id` + fenêtre < 24h
 *   - La notif représentante = la plus récente
 *   - On stocke les actors dans `grouped_actors` pour le rendu
 *   - `read` = TRUE uniquement si toutes les notifs du groupe sont lues
 */

import type { Notification } from '@/services/notificationService'

export interface GroupedNotification extends Notification {
  /** Nombre total de notifs représentées par cette ligne (>= 1) */
  group_count: number
  /** IDs de toutes les notifs représentées (pour mark-as-read groupé, BATCH 107) */
  group_ids: string[]
  /** Liste des acteurs (pour affichage multi-avatars) : toujours inclut le principal */
  grouped_actors: Array<{
    id: string | null
    username: string | null
    avatar_url: string | null
  }>
}

const WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Regroupe une liste de notifications déjà triée (DESC par created_at).
 * Préserve l'ordre chronologique basé sur la notif la plus récente du groupe.
 */
export function groupNotifications(notifs: Notification[]): GroupedNotification[] {
  const result: GroupedNotification[] = []
  const usedIds = new Set<string>()

  for (const n of notifs) {
    if (usedIds.has(n.id)) continue

    const group: GroupedNotification = {
      ...n,
      group_count: 1,
      group_ids: [n.id],
      grouped_actors: [
        { id: n.actor_id, username: n.actor_username, avatar_url: n.actor_avatar_url },
      ],
    }
    usedIds.add(n.id)

    // Regroupement par AUTEUR des notifs "nouveau post" (anti-pollution).
    // Chaque post a un reference_id different, donc le regroupement par
    // reference ne collapse rien : l'utilisateur voyait N lignes "X a publie
    // un nouveau post" (aggrave par les anciens posts dupliques du bug NG-012
    // #1). On groupe ici par auteur (meme actor) sur 24h -> "X a publie N
    // publications". Le representant = le plus recent (deep-link vers sa derniere
    // publi). group_count sert au libelle dans le NotificationsPanel.
    if (n.type === 'post') {
      const authorKey = n.actor_id ?? n.title
      const nDate = new Date(n.created_at).getTime()
      let allReadPost = n.read
      for (const other of notifs) {
        if (usedIds.has(other.id)) continue
        if (other.type !== 'post') continue
        if ((other.actor_id ?? other.title) !== authorKey) continue
        if (Math.abs(nDate - new Date(other.created_at).getTime()) > WINDOW_MS) continue
        usedIds.add(other.id)
        group.group_count += 1
        group.group_ids.push(other.id)
        allReadPost = allReadPost && other.read
      }
      group.read = allReadPost
      result.push(group)
      continue
    }

    // Pas de regroupement pour les types sans "cible" commune
    const groupable =
      !!n.reference_id &&
      !!n.reference_type &&
      (n.type === 'reaction' || n.type === 'comment' || n.type === 'follow')

    if (!groupable) {
      result.push(group)
      continue
    }

    const nDate = new Date(n.created_at).getTime()
    let allRead = n.read

    for (const other of notifs) {
      if (usedIds.has(other.id)) continue
      if (other.type !== n.type) continue
      if (other.reference_type !== n.reference_type) continue
      if (other.reference_id !== n.reference_id) continue

      // Fenêtre symétrique : on regroupe si les deux notifs sont à moins de 24h
      // l'une de l'autre, indépendamment de l'ordre dans le tableau.
      // (Le tri DESC est respecté en pratique mais ne doit pas être une
      // précondition stricte : sinon le regroupement devient flaky quand deux
      // notifs ont le même timestamp à la milliseconde près, cf. tests CI.)
      const diff = Math.abs(nDate - new Date(other.created_at).getTime())
      if (diff > WINDOW_MS) continue

      usedIds.add(other.id)
      group.group_count += 1
      group.group_ids.push(other.id)
      allRead = allRead && other.read
      // Déduplique par actor_id (un même user peut avoir plusieurs notifs, on compte une fois)
      if (!group.grouped_actors.some((a) => a.id && a.id === other.actor_id)) {
        group.grouped_actors.push({
          id: other.actor_id,
          username: other.actor_username,
          avatar_url: other.actor_avatar_url,
        })
      }
    }

    group.read = allRead
    result.push(group)
  }

  return result
}

/**
 * Construit le libellé de regroupement (ex: "Alice, Bob + 2 autres").
 * Retourne null si le groupe ne contient qu'une personne.
 */
export function formatGroupedActors(
  g: GroupedNotification,
  othersLabel: (n: number) => string,
): string | null {
  const actors = g.grouped_actors.filter((a) => !!a.username).map((a) => a.username as string)
  if (actors.length <= 1) return null
  if (actors.length === 2) return `${actors[0]} & ${actors[1]}`
  const firstTwo = actors.slice(0, 2).join(', ')
  return `${firstTwo} ${othersLabel(actors.length - 2)}`
}
