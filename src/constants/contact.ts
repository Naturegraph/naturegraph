/**
 * contact — Constantes de contact Naturegraph
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ATTENTION — EMAIL DE CONTACT UNIQUE (Nicolas BATCH 53, 2026-05-15)
 * ─────────────────────────────────────────────────────────────────────
 * Pour la beta privée et toutes les mentions légales / RGPD / contact,
 * l'unique email de référence est `naturegraph.fr@gmail.com`.
 *
 * NE PAS REMPLACER PAR :
 *   - privacy@naturegraph.fr (ancien, pas encore actif)
 *   - contact@naturegraph.fr (ancien, pas encore actif)
 *   - staff@naturegraph.fr (ancien, pas encore actif)
 *   - hello@naturegraph.fr (jamais utilisé)
 *
 * Tant que le domaine `naturegraph.fr` n'est pas configuré côté Hostinger
 * (en attente du transfert, ~7 jours au 2026-05-14), TOUTES les communications
 * doivent passer par l'adresse Gmail `naturegraph.fr@gmail.com`.
 *
 * Au moment de la transition vers les adresses pro `@naturegraph.fr` :
 *   1. Migrer cette constante vers les bonnes adresses spécialisées
 *      (contact@, privacy@, staff@)
 *   2. Mettre à jour les fichiers i18n fr.json + en.json (legal/privacy keys)
 *   3. Tester que chaque adresse reçoit bien les emails
 *   4. Documenter le changement dans MASTER_TODO + commit dédié
 *
 * Refs : décision Nicolas 2026-05-15 — beta pré-domain transfer.
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
