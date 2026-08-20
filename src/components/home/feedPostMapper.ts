/**
 * feedPostMapper : adaptateur PostFeedItem (type DB) -> MockPost (type UI FeedPost).
 *
 * Extrait de FeedSection.tsx (Lot 4, factorisation) : logique de mapping PURE,
 * réutilisée par FeedSection, Profile et PostDetail. Isolée ici pour être testable
 * (aucune dépendance au rendu ni aux providers) et pour alléger FeedSection.
 *
 * Bridge temporaire : à supprimer quand FeedPost acceptera PostFeedItem directement
 * (cf. TODO refactor dans FeedPost).
 */

import type { PostFeedItem } from '@/types/database'
import type { MockPost } from './FeedPost'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import { formatObservationDate } from '@/utils/observationDate'

/** Fallback emoji pour la catégorie 'other' (absente de CATEGORY_EMOJIS). */
const OTHER_EMOJI = '✨'

/** Lookup tolérant : accepte tout TaxonomicGroup, retourne l'emoji officiel. */
export function getTaxonomicEmoji(group: string | null | undefined): string {
  if (!group) return OTHER_EMOJI
  if (group in CATEGORY_EMOJIS) {
    return CATEGORY_EMOJIS[group as keyof typeof CATEGORY_EMOJIS]
  }
  return OTHER_EMOJI
}

/**
 * Dérive le format d'affichage du post depuis le ratio width/height de la cover.
 * Seuils larges pour absorber les écarts EXIF :
 *   · ratio < 0.85 → portrait (3:4 letterboxé, fond clair)
 *   · ratio > 1.15 → 16:9 (cadre plein, object-cover)
 *   · sinon         → 1:1 (carré)
 * Sans dimensions connues → fallback 16:9 (l'historique du feed est en paysage).
 */
export function derivePostFormat(width?: number, height?: number): MockPost['format'] {
  if (!width || !height) return '16:9'
  const ratio = width / height
  if (ratio < 0.85) return 'portrait'
  if (ratio > 1.15) return '16:9'
  return '1:1'
}

/**
 * Badge "préférence #1" affiché en bas-droite de l'avatar auteur : mappe le premier
 * centre d'intérêt sur l'emoji de CATEGORY_EMOJIS. Retourne undefined si la liste
 * est vide ou indéfinie (rare : l'onboarding force au moins un choix).
 */
export function getAuthorPreferenceEmoji(
  interests: string[] | undefined | null,
): string | undefined {
  if (!interests || interests.length === 0) return undefined
  const first = interests[0]
  return first in CATEGORY_EMOJIS
    ? CATEGORY_EMOJIS[first as keyof typeof CATEGORY_EMOJIS]
    : undefined
}

/** Formate une date ISO en format lisible (ex: "10/04/2026"). */
export function formatPostDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

/**
 * Adaptateur PostFeedItem → MockPost (UI).
 *
 * Exporté pour être réutilisé dans `Profile.tsx` (onglet Journal nature),
 * `PostDetail.tsx` et partout où on rend des posts via `<FeedPost>`. Évite de
 * dupliquer la logique de mapping (titre, location, format, reactions, etc.).
 */
export function postFeedItemToMockPost(item: PostFeedItem, _index = 0): MockPost {
  // Le pseudo (username) est la source de vérité pour l'affichage du nom
  // d'auteur : il suit instantanément les changements de pseudo via la
  // jointure DB profiles!user_id. On a abandonné la concat
  // « first_name + last_name » qui restait figée à l'ancienne valeur quand
  // le pseudo changeait (Nicolas 2026-05-24 : « pas logique »).
  // Si pour une raison rare le username est vide, fallback first/last.
  const authorName =
    item.author?.username?.trim() ||
    `${item.author?.first_name ?? ''} ${item.author?.last_name ?? ''}`.trim() ||
    'Utilisateur'

  // Titre : on PRIORISE le titre DB s'il existe (saisie utilisateur explicite).
  // Fallback : si pas de titre, premiere phrase de la description (max 80 chars).
  // Bug fix 2026-05-04 : avant on derivait toujours le titre de la description,
  // ce qui ignorait totalement le vrai titre saisi par l'utilisateur dans le
  // formulaire Encounter et donnait l'impression que les posts "se melangeaient".
  const explicitTitle = item.title?.trim() ?? ''
  let title: string
  if (explicitTitle.length > 0) {
    title = explicitTitle.slice(0, 80)
  } else {
    const firstSentence = item.description.split(/[.!?]/)[0].trim()
    title = firstSentence.length > 0 ? firstSentence.slice(0, 80) : item.description.slice(0, 80)
  }

  return {
    id: item.id,
    // Auteur du post : comparé à user.id côté parent pour `isOwnPost`
    // (menu adapté selon le contexte).
    authorId: item.user_id,
    // Règle globale : conditionne l'icône + couleur d'en-tête dans FeedPost.
    // Default = nature_encounter pour les rares posts legacy de type inconnu.
    postType: item.type === 'nature_instant' ? 'nature_instant' : 'nature_encounter',
    author: {
      name: authorName,
      // `username` est la SOURCE DE VÉRITÉ pour les liens /profile/:username.
      // Récupéré via la jointure profiles!user_id donc toujours à jour : un
      // user qui change son pseudo voit instantanément ses anciens posts
      // pointer vers le bon nouveau profil (Nicolas 2026-05-24 bug fix).
      username: item.author?.username ?? '',
      avatar: item.author?.avatar_url ?? '',
      // Badge "préférence #1" : emoji du premier centre d'intérêt de l'auteur.
      // Affiché en bas-droite de l'avatar dans FeedPost.
      badge: getAuthorPreferenceEmoji(
        (item.author as { interests?: string[] } | undefined)?.interests,
      ),
    },
    date: formatPostDate(item.created_at),
    // NG-009 : date reelle d observation, calculee uniquement si elle differe
    // vraiment du jour de publication (sinon FeedPost masque le bloc pour ne pas
    // dupliquer l info). encounter_date est stocke en YYYY-MM-DD, created_at est un
    // timestamp complet : on compare uniquement la partie date.
    // V1.1.4 NG-027 : formatObservationDate lit la partie calendaire sans conversion
    // timezone (evite le decalage -1 jour sur la date pure d'observation).
    encounterDate: item.encounter_date
      ? item.encounter_date.slice(0, 10) !== item.created_at.slice(0, 10)
        ? formatObservationDate(item.encounter_date)
        : undefined
      : undefined,
    // Règle de confidentialité (Nicolas 2026-05-24 : v3 mobile-friendly) :
    //  - location_hidden = true → uniquement le **pays** (repère biogéographique
    //    sans compromettre la vie privée).
    //  - location_hidden = false → « Ville, Région » (sans pays) pour tenir sur
    //    une ligne en mobile. Si la région manque : ville seule, puis pays.
    //  - Aucune donnée → chaîne vide → le bullet « date • lieu » disparaît.
    location: item.location_hidden
      ? (item.country ?? '')
      : Array.from(new Set([item.city, item.region].filter(Boolean))).join(', ') ||
        (item.country ?? ''),
    title,
    content: item.description,
    weather: item.weather ?? undefined,
    timeOfDay: item.time_of_day ?? undefined,
    habitat: item.habitat ?? undefined,
    // NG-055 : phénomène des posts Instant Nature, lu depuis posts.phenomenon
    // (fallback tags[0] pour les anciens posts). Affiché dans la rangée méta
    // uniquement pour les nature_instant.
    phenomenon:
      item.type === 'nature_instant'
        ? ((item as { phenomenon?: string | null }).phenomenon ??
          (item.tags as string[] | null)?.[0] ??
          undefined)
        : undefined,
    category: {
      icon: getTaxonomicEmoji(item.taxonomic_group),
      label: item.taxonomic_group ?? 'Autre',
    },
    // Pas de fallback hardcodé : si null, FeedPost gère via i18n (règle
    // catégorie + espèce unifiée).
    species: item.species_name ?? null,
    // Nicolas 2026-05-22 : `posts.individuals_count` en DB → mappé directement.
    // FeedPost affiche un suffixe « (N) » sur le chip espèce quand > 1.
    individualsCount: (item as { individuals_count?: number }).individuals_count ?? undefined,
    // V1.2.0 (NG-005/006) : si le post est issu d un carnet, FeedPost rendra la
    // carte enrichie au lieu des chips espece/categorie standard.
    notebookId: (item as { notebook_id?: string | null }).notebook_id ?? null,
    // Compteur d'especes du carnet lie (pre-charge via posts_public).
    notebookSpeciesCount:
      (item as { notebook_species_count?: number | null }).notebook_species_count ?? null,
    scientific_name: item.scientific_name ?? null,
    taxref_id: item.taxref_id ?? null,
    taxonomic_group: item.taxonomic_group ?? null,
    // Format Figma : préférence utilisateur saisie à l'étape 1 du formulaire de
    // contribution. Fallback ratio-based si la colonne est absente (legacy posts).
    format:
      ((item as { display_format?: MockPost['format'] }).display_format as
        | MockPost['format']
        | undefined) ??
      derivePostFormat(item.media?.[0]?.width ?? undefined, item.media?.[0]?.height ?? undefined),
    images: (item.media ?? []).map((m) => ({
      url: m.url,
      alt: m.alt ?? '',
      width: m.width ?? undefined,
      height: m.height ?? undefined,
    })),
    // Répartition réelle par type : agrégée serveur (Nicolas 2026-05-22).
    // Compteurs réels depuis la table `reactions`, calculés dans
    // `getReactionsBreakdown()` puis injectés par `useFeed`.
    reactions: (() => {
      const bd = item.reactions_breakdown
      return {
        love: bd?.love ?? 0,
        admire: bd?.admire ?? 0,
        fire: bd?.fire ?? 0,
        wow: bd?.wow ?? 0,
        curious: bd?.curious ?? 0,
      }
    })(),
    userReaction: item.user_reaction ?? null,
    totalReactions: item.likes_count,
    comments: item.comments_count,
  }
}
