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

/** Regex UUID v4 (capture l'UUID à n'importe quelle position dans la chaîne). */
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

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
    .slice(0, 60)
    .replace(/-+$/, '') // pas de tiret final après troncature
}

/**
 * Construit l'URL canonique d'un post :
 *   - `/post/grand-duc-amerique-{uuid}` si on a un titre ou nom d'espèce
 *   - `/post/{uuid}` en fallback (rétro-compatible)
 */
export function buildPostPath(
  postId: string,
  opts: { title?: string | null; species?: string | null } = {},
): string {
  const base = opts.title || opts.species || ''
  const slug = base ? slugify(base) : ''
  return slug ? `/post/${slug}-${postId}` : `/post/${postId}`
}

/**
 * Extrait l'UUID d'un paramètre de route `/post/:slug`.
 * Accepte aussi bien `{uuid}` que `{slug}-{uuid}`.
 * Retourne null si aucun UUID valide n'est trouvé.
 */
export function extractPostId(slugOrId: string | undefined): string | null {
  if (!slugOrId) return null
  const match = slugOrId.match(UUID_REGEX)
  return match ? match[0] : null
}
