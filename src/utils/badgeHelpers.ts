/**
 * badgeHelpers — Emojis centralisés pour les catégories de biodiversité
 *
 * SOURCE DE VÉRITÉ pour tous les emojis de catégories dans l'application.
 * Utilisé dans l'onboarding, les badges profil, les posts, etc.
 * Les emojis doivent rester cohérents partout — ne jamais les dupliquer.
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
