/**
 * sanitize : Utilitaires de validation/échappement pour les sources non-fiables
 *
 * BATCH 78 (CodeQL #3 + #4) : helper pour valider les URLs d'image avant
 * de les utiliser comme `src` d'une balise <img>.
 *
 * Vulnérabilité corrigée : CWE-79 (DOM text reinterpreted as HTML). Un attaquant
 * pourrait injecter une URL `javascript:...` qui s'exécuterait au click ou via
 * un protocol handler. React n'échappe PAS automatiquement les schémas d'URL.
 *
 * Schémas autorisés pour les images :
 *   - http:  / https:   (URLs externes, Supabase storage public, etc.)
 *   - data:image/...     (data URIs créés en client pour preview)
 *   - blob:              (URL.createObjectURL pour upload local)
 *
 * Tout autre schéma (javascript:, file:, vbscript:, data:text/html, etc.)
 * est rejeté en retournant `null` : le caller doit gérer le fallback.
 */

const ALLOWED_IMAGE_SCHEMES = ['http:', 'https:', 'blob:'] as const

/**
 * Valide une URL d'image avant de l'utiliser comme `src`.
 * Retourne l'URL si safe, sinon `null`.
 *
 * Exemples :
 *   sanitizeImageUrl('https://cdn.example.com/avatar.png')  → 'https://...'
 *   sanitizeImageUrl('blob:nullhttps://localhost/abc-123')  → 'blob:...'
 *   sanitizeImageUrl('data:image/png;base64,iVBOR...')      → 'data:image/...'
 *   sanitizeImageUrl('javascript:alert(1)')                 → null  (rejected)
 *   sanitizeImageUrl('data:text/html,<script>...</script>') → null  (rejected)
 *   sanitizeImageUrl(null)                                  → null
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // data: URI doit être un type image MIME (pas text/html, application/xml, etc.)
  if (trimmed.toLowerCase().startsWith('data:')) {
    return /^data:image\/(png|jpeg|jpg|gif|webp|avif|svg\+xml);/i.test(trimmed) ? trimmed : null
  }

  // Pour les autres schémas, utiliser URL parsing strict
  try {
    const parsed = new URL(trimmed)
    return (ALLOWED_IMAGE_SCHEMES as readonly string[]).includes(parsed.protocol) ? trimmed : null
  } catch {
    // URL relative (ex: "/path/to/img.png") : autorisé pour les assets locaux
    // mais on refuse tout ce qui ressemble à un schéma suspect.
    if (trimmed.includes(':')) return null
    return trimmed
  }
}
