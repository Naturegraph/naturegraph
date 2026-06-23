/**
 * contact : Constantes de contact Naturegraph
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Source de vérité unique pour toutes les adresses email de la plateforme.
 * Migration 2026-06-22 (NG-009) : passage de `naturegraph.fr@gmail.com` (Gmail
 * historique) vers le domaine pro `@naturegraph.ca`.
 *
 * Côté boîtes :
 *   - `support@naturegraph.ca` : SEULE boîte réelle relevée. Reçoit aussi
 *     les alias `contact@`, `privacy@`, `security@`, `staff@`, `dmarc@`.
 *   - `nicolas@naturegraph.ca` : adresse fondateur (from humain des campagnes).
 *   - `noreply@naturegraph.ca` : expéditeur des emails automatiques (réservé au
 *     SMTP transactionnel, cf. NG-009).
 *
 * On expose des constantes spécialisées (support / privacy / security) même si
 * elles redirigent toutes vers `support@` aujourd'hui : ça garde le code lisible
 * (l'intention est explicite) et permet de séparer les boîtes plus tard sans
 * retoucher les appelants.
 */

/** Support utilisateur, erreurs, footer : la boîte réellement relevée. */
export const SUPPORT_EMAIL = 'support@naturegraph.ca'

/** Demandes RGPD / Loi 25 (accès, suppression, rectification). Alias -> support. */
export const PRIVACY_EMAIL = 'privacy@naturegraph.ca'

/** Signalement de vulnérabilité (SECURITY.md). Alias -> support. */
export const SECURITY_EMAIL = 'security@naturegraph.ca'

/** Adresse fondateur (communications humaines, from des campagnes). */
export const FOUNDER_EMAIL = 'nicolas@naturegraph.ca'

/**
 * Email de contact général de référence (mentions légales, support, signalements).
 * Pointe sur la boîte relevée `support@`.
 */
export const CONTACT_EMAIL = SUPPORT_EMAIL

/**
 * Wrapper mailto: avec sujet optionnel pour les liens email du site.
 * Usage : `<a href={mailtoLink('Question RGPD')}>...</a>`
 * Le second argument permet de cibler une adresse précise (ex: PRIVACY_EMAIL).
 */
export function mailtoLink(subject?: string, email: string = CONTACT_EMAIL): string {
  if (!subject) return `mailto:${email}`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}
