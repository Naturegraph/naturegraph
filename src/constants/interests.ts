/**
 * Centres d'intérêt — Configuration UI
 *
 * Source de vérité pour les labels et emojis des centres d'intérêt.
 * Utilisé dans l'éditeur de profil, l'ADN de l'observateur, les badges.
 *
 * Les IDs correspondent aux valeurs de l'ENUM `Interest` dans la DB Supabase.
 */

/**
 * Config complète des centres d'intérêt : ID → label + emoji.
 * Source de vérité pour l'éditeur de profil et l'ADN de l'observateur.
 */
export const INTEREST_CONFIG: Record<string, { label: string; emoji: string }> = {
  birds: { label: 'Oiseaux', emoji: '🦉' },
  mammals: { label: 'Mammifères', emoji: '🐿' },
  insects: { label: 'Insectes', emoji: '🐝' },
  amphibians: { label: 'Amphibiens', emoji: '🐸' },
  reptiles: { label: 'Reptiles', emoji: '🦎' },
  arachnids: { label: 'Arachnides', emoji: '🕷' },
  mollusks: { label: 'Mollusques', emoji: '🐌' },
  fish: { label: 'Poissons', emoji: '🐠' },
  plants: { label: 'Plantes', emoji: '🌿' },
  other: { label: 'Autre', emoji: '🌍' },
}

/**
 * Labels français dérivés de INTEREST_CONFIG.
 * Raccourci pour l'affichage : interestId → label français.
 */
export const INTEREST_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(INTEREST_CONFIG).map(([k, v]) => [k, v.label]),
)
