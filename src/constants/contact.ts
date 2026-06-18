/**
 * contact : Constantes de contact Naturegraph
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ATTENTION : EMAIL DE CONTACT UNIQUE
 * ─────────────────────────────────────────
 * Pour la beta et toutes les mentions légales / RGPD / contact, l'unique
 * email de référence est `naturegraph.fr@gmail.com` (boîte Gmail).
 *
 * Le nom du compte Gmail reflète l'identité historique « naturegraph.fr » -
 * indépendant du domaine du site web (`naturegraph.ca` depuis 2026-05-21,
 * migration Hostinger). On garde cette adresse Gmail pendant toute la beta
 * pour ne pas casser les liens mailto déjà partagés / templates email envoyés.
 *
 * Migration future vers `@naturegraph.ca` :
 *   1. Créer les boîtes pro sur l'hébergeur (`contact@naturegraph.ca`,
 *      `privacy@naturegraph.ca`, etc.)
 *   2. Migrer cette constante + ajouter d'éventuelles spécialisations
 *   3. Mettre à jour i18n fr.json + en.json (clés legal/privacy/contact)
 *   4. Configurer SPF/DKIM/DMARC sur naturegraph.ca pour la délivrabilité
 *   5. Mettre à jour le SMTP custom Supabase si bascule vers une boîte pro
 *   6. Conserver naturegraph.fr@gmail.com en alias / forwarding ~6 mois
 *      pour ne pas perdre les réponses aux anciens emails
 */

/**
 * Email de contact unique pour la beta privée.
 * Utilisé pour : mentions légales, RGPD, support, signalements, erreurs.
 */
export const CONTACT_EMAIL = 'naturegraph.fr@gmail.com'

/**
 * Wrapper mailto: avec sujet optionnel pour les liens email du site.
 * Usage : `<a href={mailtoLink('Question RGPD')}>...</a>`
 */
export function mailtoLink(subject?: string): string {
  if (!subject) return `mailto:${CONTACT_EMAIL}`
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
