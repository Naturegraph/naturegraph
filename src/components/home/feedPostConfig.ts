/**
 * feedPostConfig : constantes de configuration de la carte de publication (FeedPost).
 *
 * Extrait de FeedPost.tsx (Lot 4 chantier qualité, factorisation) pour alléger le
 * composant et séparer les données pures (emojis, réactions, classes de chips) de
 * la logique de rendu. Aucun changement de comportement : mêmes valeurs qu'avant.
 */

import { Bird, MountainSnow } from 'lucide-react'
import type { MockPost } from './FeedPost'

/**
 * Source unique des emojis et labels de réactions (SEUL point de verite : le
 * moment ET les notifications lisent ceci, cf. getReactionLabel).
 * Doit rester alignée avec ReactionType dans @/types/database.
 *
 * Ordre Figma 6385:103293 : love → fire → admire → wow → curious.
 *
 * Refonte 2026-08-24 (decision Nicolas) : le SOCLE (love/fire/admire/wow) est
 * INCHANGE, et le LABEL "Intéressant !" (curious) est conserve. On change UNIQUEMENT
 * son EMOJI 🤨 -> 🔍 : le sourcil leve donnait un ton sceptique/distant, la loupe
 * traduit "ca m'intrigue, j'ai envie d'y regarder de plus pres" (esprit observation
 * nature, positif). Identifiant DB inchange, reactions historiques intactes, aucune
 * migration.
 *
 * Note : 'disappointed' (😕) reste dans le fallback de getReactionLabel pour les
 * rares reactions historiques, mais n'est ni selectionnable ni dans ce config.
 */
export const REACTION_CONFIG = [
  { key: 'love' as const, emoji: '❤️', labelKey: 'home.post.reactions.love' },
  { key: 'fire' as const, emoji: '🔥', labelKey: 'home.post.reactions.fire' },
  { key: 'admire' as const, emoji: '😍', labelKey: 'home.post.reactions.admire' },
  { key: 'wow' as const, emoji: '😱', labelKey: 'home.post.reactions.wow' },
  { key: 'curious' as const, emoji: '🔍', labelKey: 'home.post.reactions.curious' },
]

/**
 * Emojis météo : conformes Figma 6385:55806.
 * Source unique : si modifié, mettre à jour aussi EncounterStep3.tsx.
 * (Pas d'emoji pour le moment de la journée : uniquement le label.)
 */
export const WEATHER_EMOJI: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  windy: '🌬️',
  snowy: '🌨️',
  foggy: '🌫️',
}

/** Emoji par type d'habitat : affiché en premier dans la rangée meta du post. */
export const HABITAT_EMOJI: Record<string, string> = {
  forest: '🌳',
  park_garden: '🌷',
  prairie_heath: '🌾',
  urban: '🏙️',
  river: '🏞️',
  lake_pond: '💧',
  wetland_marsh: '🪷',
  lake_wetland: '💧',
  mountain: '⛰️',
  sea_coast: '🌊',
  rural_agricultural: '🚜',
  care_center: '🏥',
}

/**
 * NG-055 : emoji par phénomène (posts Instant). Clé = label FR stocké dans
 * `posts.tags[0]`. Doit rester aligné avec PHENOMENON_OPTIONS de
 * ContributeInstantPanel. Label absent (post ancien / tag libre) -> affiché sans
 * emoji (fallback silencieux).
 */
export const PHENOMENON_EMOJI: Record<string, string> = {
  'Coucher / lever de soleil': '🌅',
  'Pleine lune': '🌕',
  'Arc-en-ciel': '🌈',
  Marée: '🌊',
  Glace: '❄️',
  'Aurore boréale': '🌌',
  Tempête: '🌪️',
  Foudre: '⚡',
  'Feu de forêt': '🔥',
  Éclipse: '🌒',
  Comète: '☄️',
  'Éruption volcanique': '🌋',
}

/**
 * Icône d'en-tête + couleur par type de post (règle globale projet).
 *   · nature_encounter → Bird teal/vert (token --color-highlight-primary)
 *   · nature_instant   → MountainSnow amber/orange (--color-amber-primary)
 */
export const POST_TYPE_ICON: Record<
  MockPost['postType'],
  { Icon: typeof Bird; colorClass: string }
> = {
  nature_encounter: {
    Icon: Bird,
    colorClass: 'text-[var(--color-highlight-primary)]',
  },
  nature_instant: {
    Icon: MountainSnow,
    colorClass: 'text-[var(--color-amber-primary)]',
  },
}

// Tailwind du chip Figma (node 6385:60456) : bg Content/Action/Light, h-32,
// px-12 py-8, rounded-99, Mulish Bold 16px. Réutilisé pour catégorie + espèce.
export const CHIP_BASE_CLASS =
  'bg-primary-light text-foreground text-base font-bold px-3 py-2 h-8 rounded-full leading-tight inline-flex items-center gap-2'
export const CHIP_INTERACTIVE_CLASS =
  'hover:bg-primary/15 transition-colors cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
// Variante neutre : "Espèce non déterminée" qui n'est PAS un filtre activable.
// Garde la hauteur/forme pour rester aligné avec les chips voisins, mais retire
// le langage "bouton" (fond plein, texte gras).
export const CHIP_PASSIVE_CLASS =
  'bg-transparent border border-border text-muted-foreground text-base font-medium px-3 py-2 h-8 rounded-full leading-tight inline-flex items-center gap-2'
