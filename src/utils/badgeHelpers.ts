/**
 * badgeHelpers — Emojis centralisés pour les catégories de biodiversité
 *                + emojis météo (Figma 6385:55806).
 *
 * SOURCE DE VÉRITÉ pour tous les emojis catégorie/météo dans l'application.
 * Utilisé dans l'onboarding, les badges profil, les posts, le formulaire
 * de contribution, etc.
 *
 * Les emojis doivent rester cohérents partout — ne jamais les dupliquer.
 * Voir second-agent/09 et second-agent/11 pour le contexte.
 */

/** Emojis par catégorie */
export const CATEGORY_EMOJIS = {
  birds: '🦉',
  mammals: '🐿️',
  insects: '🐝',
  reptiles: '🦎',
  amphibians: '🐸',
  arachnids: '🕷️',
  mollusks: '🐌',
  fish: '🐠',
  plants: '🌿',
} as const

export type CategoryKey = keyof typeof CATEGORY_EMOJIS

/** Mapping texte français → ID de catégorie */
export const FRENCH_TO_CATEGORY_ID: Record<string, CategoryKey> = {
  Oiseaux: 'birds',
  Mammifères: 'mammals',
  Insectes: 'insects',
  Reptiles: 'reptiles',
  Amphibiens: 'amphibians',
  Arachnides: 'arachnids',
  Mollusques: 'mollusks',
  Poissons: 'fish',
  Plantes: 'plants',
}

/** Retourne l'emoji d'une catégorie par ID ou texte FR. Défaut : plante */
export function getBadgeEmoji(badge: string): string {
  if (badge in CATEGORY_EMOJIS) return CATEGORY_EMOJIS[badge as CategoryKey]
  const id = FRENCH_TO_CATEGORY_ID[badge]
  return id ? CATEGORY_EMOJIS[id] : CATEGORY_EMOJIS.plants
}

/**
 * Emojis météo — alignés Figma 6385:55806 (second-agent/11).
 * Utilisés dans FeedPost (affichage post) ET EncounterStep3 (formulaire de
 * contribution) — source de vérité unique pour rester cohérent.
 */
export const WEATHER_EMOJIS = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  windy: '🌬️',
  snowy: '🌨️',
} as const

export type WeatherKey = keyof typeof WEATHER_EMOJIS
