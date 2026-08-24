/**
 * feedTimeline : construit la structure "fil oriente decouverte" a partir des
 * posts deja charges (ordre `created_at desc`).
 * =============================================================================
 *
 * Deux reperes, purement cote client (aucun recalcul serveur, aucune donnee
 * modifiee) :
 *   1. Separateurs temporels : "Aujourd'hui" / "Hier" / date absolue, inseres
 *      UNIQUEMENT quand on change de jour civil (pas entre chaque post).
 *   2. Frontiere "deja vu" : un unique separateur entre les observations
 *      publiees DEPUIS la derniere visite (nouvelles) et celles d'avant (deja
 *      vues). "Vue" = `created_at <= derniere_visite` (pas de tracking par post,
 *      cf. ticket : rester simple et performant).
 *
 * La logique de jour civil est reutilisee depuis `grouperParJour` (echanges)
 * pour rester unique : deux implementations de "quel jour sommes-nous" finissent
 * toujours par diverger. Seul le LIBELLE differe ici (date absolue apres "Hier",
 * pas "il y a N jours"), conformement aux maquettes du fil.
 */

import { joursCivilsEcoules } from '@/components/echanges/grouperParJour'

/**
 * Element minimal attendu : date de publication + auteur (optionnel).
 * `authorId` sert a NE PAS compter mes propres publications comme des "nouveaux
 * moments" (on ne "manque" pas son propre contenu).
 */
export interface TimelineItem {
  created_at: string
  authorId?: string
}

/** Une ligne du fil : separateur de jour, frontiere "deja vu", ou un post. */
export type FeedRow<T> =
  | { kind: 'day'; label: string; key: string }
  | { kind: 'seen-divider'; key: string }
  | { kind: 'post'; post: T; key: string }

/**
 * Libelle du separateur temporel pour une date donnee :
 *   - "Aujourd'hui" le jour meme,
 *   - "Hier" la veille,
 *   - sinon la date absolue ("19 aout", + annee si differente de l'annee en cours).
 *
 * `t` (i18n) est optionnel : fourni, on l'utilise pour "Aujourd'hui"/"Hier" ;
 * absent (tests), on retombe sur le francais par defaut.
 */
export function feedDayLabel(
  iso: string,
  now: Date = new Date(),
  t?: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const jours = joursCivilsEcoules(iso, now)
  if (jours <= 0)
    return t ? t('home.feed.timeline.today', { defaultValue: "Aujourd'hui" }) : "Aujourd'hui"
  if (jours === 1) return t ? t('home.feed.timeline.yesterday', { defaultValue: 'Hier' }) : 'Hier'

  const d = new Date(iso)
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * Transforme la liste des posts (ordre `created_at desc`) en lignes a rendre :
 * separateurs de jour + frontiere "deja vu" intercales aux bons endroits.
 *
 * @param posts         Posts deja charges, du plus recent au plus ancien.
 * @param lastVisitISO  Derniere visite du fil (ISO), ou null (invite / 1ere visite).
 * @param now           Instant de reference (injectable pour les tests).
 * @param t             Fonction i18n optionnelle pour les libelles.
 * @param currentUserId Id de l'utilisateur courant (null si invite). Mes propres
 *                      publications ne declenchent JAMAIS le bandeau ni la
 *                      frontiere : on ne "manque" pas son propre contenu.
 */
export function buildFeedTimeline<T extends TimelineItem>(
  posts: T[],
  lastVisitISO: string | null,
  now: Date = new Date(),
  t?: (key: string, opts?: Record<string, unknown>) => string,
  currentUserId: string | null = null,
): FeedRow<T>[] {
  const rows: FeedRow<T>[] = []

  // Y a-t-il au moins un nouveau moment VENANT DES AUTRES ? Un post plus recent
  // que la derniere visite mais ecrit par moi ne compte pas (je ne l'ai pas
  // "manque"). Sans cette exclusion, publier faisait apparaitre le bandeau et la
  // frontiere pour son propre contenu. La frontiere reste posee au 1er post
  // chronologiquement "deja vu" (placement inchange), mais on ne l'affiche que
  // s'il y a vraiment du nouveau des autres.
  const hasNew =
    lastVisitISO != null &&
    posts.some((p) => p.created_at > lastVisitISO && p.authorId !== currentUserId)

  let lastDayLabel: string | null = null
  let seenDividerDone = false

  posts.forEach((post, index) => {
    const isSeen = lastVisitISO != null && post.created_at <= lastVisitISO

    // Frontiere "deja vu" : au 1er post deja vu, s'il y avait des nouveautes avant.
    if (!seenDividerDone && isSeen && hasNew) {
      rows.push({ kind: 'seen-divider', key: `seen-${index}` })
      seenDividerDone = true
      lastDayLabel = null // la section "deja vu" repart avec son propre entete de jour
    }

    const label = feedDayLabel(post.created_at, now, t)
    if (label !== lastDayLabel) {
      rows.push({ kind: 'day', label, key: `day-${index}-${label}` })
      lastDayLabel = label
    }

    rows.push({ kind: 'post', post, key: `post-${index}` })
  })

  return rows
}
