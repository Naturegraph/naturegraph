/**
 * notificationFilters : catégories de filtrage des notifications
 *
 * Source de vérité UNIQUE, partagée par le panneau de la cloche et la page
 * plein écran. Ces constantes vivaient uniquement dans NotificationsPage :
 * les dupliquer pour le panneau aurait reproduit exactement le défaut corrigé
 * par NG-046 (deux copies qui divergent en silence).
 */

import type { NotificationType } from '@/services/notificationService'

export type FilterKey = 'all' | 'social' | 'species' | 'system'

/** Ordre d'affichage des onglets. */
export const FILTER_KEYS: FilterKey[] = ['all', 'social', 'species', 'system']

/** Types inclus dans chaque onglet. `null` = aucun filtre (tout afficher). */
export const FILTER_TYPES: Record<FilterKey, NotificationType[] | null> = {
  all: null,
  social: ['reaction', 'follow', 'comment', 'mention'],
  species: ['post', 'species_digest', 'identification'],
  system: ['system'],
}

/** Clé i18n du libellé de chaque onglet. */
export const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  all: 'home.notifications.page.tabAll',
  social: 'home.notifications.page.tabSocial',
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
  social: {
    title: 'home.notifications.emptySocial',
    hint: 'home.notifications.emptySocialHint',
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
