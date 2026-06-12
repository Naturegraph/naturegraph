/**
 * featureFlags — Activation de fonctionnalites par environnement ("labs")
 * ========================================================================
 *
 * Decision Nicolas (2026-06-11) : garder la PRODUCTION focalisee sur le socle
 * de base, pour que les beta-testeurs approfondissent les tests sur l'existant.
 * Les fonctionnalites "labs" (carnets d'observations + aide a l'identification
 * NG-039) restent accessibles en DEV / STAGING mais sont MASQUEES en PRODUCTION.
 *
 * Important : c'est un simple masquage d'UI, pilote par l'environnement. AUCUNE
 * donnee n'est supprimee, AUCUN code n'est retire -> 100 % reversible : il
 * suffit de rebasculer le flag (ou de passer VITE_APP_ENV). Les posts-carnets
 * deja publies en prod restent en base et reapparaitront si on reactive.
 *
 * Source : import.meta.env.VITE_APP_ENV ('production' en prod, sinon dev).
 * Defini par branche dans Vercel (Production = 'production', Preview = 'development').
 */

const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development'

/** true partout SAUF en production (= dev, staging, previews, local). */
export const LABS_ENABLED = APP_ENV !== 'production'

/**
 * Carnets d'observations (creation, onglet profil, carte feed, mode terrain).
 * Masques en prod (Nicolas 2026-06-11).
 */
export const NOTEBOOKS_ENABLED = LABS_ENABLED

/**
 * Aide a l'identification collaborative (NG-039 : demande d'aide, propositions,
 * votes, affichage distinctif). Masquee en prod tant qu'en cours de test.
 */
export const IDENTIFICATION_HELP_ENABLED = LABS_ENABLED
