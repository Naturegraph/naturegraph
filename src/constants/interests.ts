/**
 * Centres d'intérêt — Configuration UI
 *
 * Source de vérité pour les labels et emojis des centres d'intérêt.
 * Utilisé dans l'éditeur de profil, l'ADN de l'observateur, les badges.
 *
 * Les IDs correspondent aux valeurs de l'ENUM `Interest` dans la DB Supabase.
 *
 * Nicolas 2026-05-24 : les emojis sont DÉRIVÉS de CATEGORY_EMOJIS pour
 * éviter les drifts visuels (avant : `🐿` sans variation selector dans
 * ProfileSidebar vs `🐿️` avec dans FeedPost — rendu différent selon OS).
 */

import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'

/**
 * Config complète des centres d'intérêt : ID → label + emoji.
 * Source de vérité pour l'éditeur de profil et l'ADN de l'observateur.
 */
export const INTEREST_CONFIG: Record<string, { label: string; emoji: string }> = {
  birds: { label: 'Oiseaux', emoji: CATEGORY_EMOJIS.birds },
  mammals: { label: 'Mammifères', emoji: CATEGORY_EMOJIS.mammals },
  insects: { label: 'Insectes', emoji: CATEGORY_EMOJIS.insects },
  amphibians: { label: 'Amphibiens', emoji: CATEGORY_EMOJIS.amphibians },
  reptiles: { label: 'Reptiles', emoji: CATEGORY_EMOJIS.reptiles },
  arachnids: { label: 'Arachnides', emoji: CATEGORY_EMOJIS.arachnids },
  mollusks: { label: 'Mollusques', emoji: CATEGORY_EMOJIS.mollusks },
  fish: { label: 'Poissons', emoji: CATEGORY_EMOJIS.fish },
  plants: { label: 'Plantes', emoji: CATEGORY_EMOJIS.plants },
  other: { label: 'Autre', emoji: '🌍' },
}

/**
 * Labels français dérivés de INTEREST_CONFIG.
 * Raccourci pour l'affichage : interestId → label français.
 */
export const INTEREST_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(INTEREST_CONFIG).map(([k, v]) => [k, v.label]),
)
