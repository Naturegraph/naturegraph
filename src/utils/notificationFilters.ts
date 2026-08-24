/**
 * notificationFilters : catégories de filtrage des notifications
 *
 * Source de vérité UNIQUE, partagée par le panneau de la cloche et la page
 * plein écran (NG-046 : jamais deux copies qui divergent).
 *
 * Refonte "Échanges > Réactions" (2026-08-24). Onglets :
 *   - Tous     : tout, chronologique.
 *   - Échanges : l'ÉCRIT qui peut demander une réponse (commentaires/réponses,
 *                mentions, propositions d'espèce).
 *   - Social   : réactions + nouveaux migrateurs (appréciation, sans réponse).
 *   - Moments  : nouvelles publications des profils suivis + activité espèces.
 *   - Système  : annonces officielles.
 * Ce partage évite que "Social" contienne tout et doublonne "Tous". Chaque onglet
 * est une liste chronologique ; la couleur de l'item distingue échanges (teal) et
 * réactions (amber) dans "Tous" (cf. NotifItem).
 */

import type { NotificationType } from '@/services/notificationService'

export type FilterKey = 'all' | 'echanges' | 'social' | 'moments' | 'system'

/** Ordre d'affichage des onglets. « Échanges » avant « Social » (priorité d'attention). */
export const FILTER_KEYS: FilterKey[] = ['all', 'echanges', 'social', 'moments', 'system']

/** Types inclus dans chaque onglet. `null` = aucun filtre (tout afficher). */
export const FILTER_TYPES: Record<FilterKey, NotificationType[] | null> = {
  all: null,
  echanges: ['comment', 'mention', 'identification'],
  social: ['reaction', 'follow'],
  moments: ['post', 'species_digest'],
  system: ['system'],
}

/**
 * Onglets qui portent un compteur de NON-LUS dans la barre (toujours visible,
 * même depuis un autre onglet) : les interactions « à propos de toi ». Le
 * firehose "all", les moments (contenu) et le système n'en portent pas.
 */
export const BADGED_FILTER_KEYS: FilterKey[] = ['echanges', 'social']

/** Clé i18n du libellé de chaque onglet. */
export const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  all: 'home.notifications.page.tabAll',
  echanges: 'home.notifications.page.tabEchanges',
  social: 'home.notifications.page.tabSocial',
  moments: 'home.notifications.page.tabMoments',
  system: 'home.notifications.page.tabSystem',
}

/**
 * Texte de liste vide, PAR ONGLET. Un message unique ne peut pas convenir :
 * chaque onglet explique ce qui viendra s'y afficher (retour Nicolas 2026-07-21).
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
  social: {
    title: 'home.notifications.emptySocial',
    hint: 'home.notifications.emptySocialHint',
  },
  moments: {
    title: 'home.notifications.emptyMoments',
    hint: 'home.notifications.emptyMomentsHint',
  },
  system: {
    title: 'home.notifications.emptySystem',
    hint: 'home.notifications.emptySystemHint',
  },
}
