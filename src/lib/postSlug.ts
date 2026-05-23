/**
 * postSlug — URL canonique d'un post avec slug humain
 * ============================================================
 *
 * Pourquoi :
 *   Les URLs `/post/{uuid}` sont opaques (« d16d2fd1-8fce-4e81-… »).
 *   On préfère `/post/grand-duc-amerique-d16d2fd1-8fce-4e81-…` pour :
 *     - SEO + crawlers (slug parlant en preview)
 *     - Lisibilité humaine (on devine le contenu avant de cliquer)
 *     - Rétro-compatibilité (l'UUID reste à la fin, donc tous les anciens
 *       liens `/post/{uuid}` continuent de fonctionner sans 404)
 *
 * Stratégie :
 *   - Le slug est calculé à l'affichage (pas stocké en DB) — pas de
 *     migration nécessaire.
 *   - L'extraction côté lecture utilise une regex UUID (toujours en fin
 *     de chemin) qui ignore le préfixe slug.
 *
 * Pattern UUID v4 : 8-4-4-4-12 hex chars séparés par tirets.
 */

/** Regex UUID v4 complète (capture à n'importe quelle position). */
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
/** Regex « short id » — 8 hex chars en fin de chaîne (préfixe UUID). */
const SHORT_ID_REGEX = /-([0-9a-f]{8})$/i

/**
 * Transforme un texte en slug URL-safe :
 *   - Minuscules
 *   - Accents retirés (NFD + suppression des marques)
 *   - Espaces + caractères non-alphanumériques → tirets
 *   - Tirets consécutifs réduits à un seul
 *   - Tirets de début/fin retirés
 *   - Tronqué à 60 caractères max (URLs courtes pour le partage)
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) // Nicolas 2026-05-22 : 30 au lieu de 60 — URL plus courte
    .replace(/-+$/, '') // pas de tiret final après troncature
}

/**
 * Construit l'URL canonique d'un post :
 *   - `/post/grand-duc-amerique-{uuid_short}` si on a un titre ou nom d'espèce
 *   - `/post/{uuid}` en fallback (rétro-compatible)
 *
 * Nicolas 2026-05-22 : on utilise les 8 PREMIERS caractères de l'UUID au
 * lieu du UUID complet — quand un slug humain est présent, ces 8 chars
 * suffisent largement pour l'unicité (4³² combinaisons). URL beaucoup
 * plus courte et lisible : 38 chars au lieu de 78.
 */
export function buildPostPath(
  postId: string,
  opts: { title?: string | null; species?: string | null } = {},
): string {
  const base = opts.title || opts.species || ''
  const slug = base ? slugify(base) : ''
  if (!slug) return `/post/${postId}`
  // Premier segment UUID (8 hex chars avant le premier tiret) pour identifier
  // le post de manière unique mais compacte.
  const shortId = postId.split('-')[0]
  return `/post/${slug}-${shortId}`
}

/**
 * Extrait l'identifiant d'un paramètre de route `/post/:slug`.
 * Accepte trois formats :
 *   1. UUID complet : `d16d2fd1-8fce-4e81-9a28-a8f1b40a2571`
 *   2. Slug + UUID complet (legacy) : `grand-duc-d16d2fd1-8fce-...-2571`
 *   3. Slug + short ID (8 hex chars) : `grand-duc-d16d2fd1`
 *
 * Pour les cas 1 et 2 retourne l'UUID complet (à utiliser tel quel).
 * Pour le cas 3 retourne juste le short ID — postService.getPostById
 * fait alors une requête prefix LIKE pour retrouver le full UUID.
 */
export function extractPostId(slugOrId: string | undefined): string | null {
  if (!slugOrId) return null
  const fullMatch = slugOrId.match(UUID_REGEX)
  if (fullMatch) return fullMatch[0]
  const shortMatch = slugOrId.match(SHORT_ID_REGEX)
  if (shortMatch) return shortMatch[1]
  return null
}
