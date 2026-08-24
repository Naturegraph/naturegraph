/**
 * notificationFilters : catégories de filtrage des notifications
 *
 * Source de vérité UNIQUE, partagée par le panneau de la cloche et la page
 * plein écran. Ces constantes vivaient uniquement dans NotificationsPage :
 * les dupliquer pour le panneau aurait reproduit exactement le défaut corrigé
 * par NG-046 (deux copies qui divergent en silence).
 */

import type { NotificationType } from '@/services/notificationService'

export type FilterKey = 'all' | 'echanges' | 'reactions' | 'species' | 'system'

/**
 * Ordre d'affichage des onglets. « Echanges » AVANT « Reactions » : priorite
 * d'attention (un echange peut demander une reponse ; une reaction non). Le
 * ticket "separer echanges/reactions" remplace l'ancien onglet unique "Social".
 */
export const FILTER_KEYS: FilterKey[] = ['all', 'echanges', 'reactions', 'species', 'system']

/**
 * Types inclus dans chaque onglet. `null` = aucun filtre (tout afficher).
 *   - echanges : ce qui cree une CONVERSATION (commentaires, reponses = type
 *     `comment`, et mentions). C'est ce qui peut necessiter une reponse.
 *   - reactions : signaux d'APPRECIATION sans reponse attendue (reactions +
 *     nouveaux abonnes).
 */
export const FILTER_TYPES: Record<FilterKey, NotificationType[] | null> = {
  all: null,
  echanges: ['comment', 'mention'],
  reactions: ['reaction', 'follow'],
  species: ['post', 'species_digest', 'identification'],
  system: ['system'],
}

/**
 * Onglets qui portent un compteur de NON-LUS dans la barre (toujours visible,
 * meme depuis un autre onglet) : c'est le coeur du ticket "ne pas rater un
 * echange". On badge echanges (priorite) et reactions (info), pas le firehose
 * "all" (deja porte par la cloche) ni species/system.
 */
export const BADGED_FILTER_KEYS: FilterKey[] = ['echanges', 'reactions']

/** Clé i18n du libellé de chaque onglet. */
export const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  all: 'home.notifications.page.tabAll',
  echanges: 'home.notifications.page.tabEchanges',
  reactions: 'home.notifications.page.tabReactions',
  species: 'home.notifications.page.tabSpecies',
  system: 'home.notifications.page.tabSystem',
}

/**
 * Texte de liste vide, PAR ONGLET.
 *
 * Un message unique ne peut pas convenir : sur l'onglet Système, conseiller de
 * « suivre des profils » n'a aucun sens, puisque aucun profil suivi ne produira
 * jamais d'annonce officielle (retour Nicolas 2026-07-21). Chaque onglet
 * explique donc ce qui viendra s'y afficher.
 */
export const FILTER_EMPTY_KEYS: Record<FilterKey, { title: string; hint: string }> = {
  all: {
    title: 'home.notifications.empty',
    hint: 'home.notifications.emptyHint',
  },
  echanges: {
    title: 'home.notifications.emptyEchanges',
    hint: 'home.notifications.emptyEchangesHint',
  },
  reactions: {
    title: 'home.notifications.emptyReactions',
    hint: 'home.notifications.emptyReactionsHint',
  },
  species: {
    title: 'home.notifications.emptySpecies',
    hint: 'home.notifications.emptySpeciesHint',
  },
  system: {
    title: 'home.notifications.emptySystem',
    hint: 'home.notifications.emptySystemHint',
  },
}
