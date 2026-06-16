/**
 * Helpers de securite pour les URLs externes (liens de profil, etc.).
 *
 * Contexte : NG-004 (test interne 2026-06-15). Les champs liens du profil
 * (site web, Instagram, Facebook) pouvaient stocker des valeurs malveillantes
 * via un appel API direct (bypass du front) : schema `javascript:` (XSS stocke),
 * `data:`, etc. Ces helpers garantissent qu'aucun href dangereux n'est jamais
 * rendu, quelle que soit la valeur stockee en base (defense en profondeur, en
 * complement de la validation a la saisie et du garde-fou backend).
 */

/** Schemas autorises pour un lien externe affiche/cliquable. */
const SAFE_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Retourne un href sur si la valeur est une URL http(s) exploitable, sinon null.
 * Tolere l'absence de schema (prefixe https:// comme le reste du produit), mais
 * REJETTE tout schema dangereux (`javascript:`, `data:`, `vbscript:`, ...).
 *
 * Usage rendu : ne rendre un `<a href>` que si le retour n'est pas null.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Un schema explicite different de http(s) (ex. "javascript:") est rejete :
  // on ne prefixe https:// que si AUCUN schema n'est present.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null
    if (!url.hostname.includes('.')) return null
    // NG-004 : rejette les domaines punycode/IDN (xn--), vecteur de spoofing
    // visuel (faux "gоogle" en cyrillique). Aucun usage legitime attendu ici.
    if (/(^|\.)xn--/i.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}
