/**
 * featureFlags — Activation de fonctionnalites par environnement ("labs")
 * ========================================================================
 *
 * Decision Nicolas (2026-06-11) : garder la PRODUCTION PUBLIQUE focalisee sur le
 * socle de base, pour que les beta-testeurs approfondissent les tests sur
 * l'existant. Les fonctionnalites "labs" (carnets d'observations + aide a
 * l'identification NG-039) restent accessibles PARTOUT SAUF sur le site public,
 * mais sont MASQUEES sur naturegraph.ca.
 *
 * Important : simple masquage d'UI. AUCUNE donnee supprimee, AUCUN code retire
 * -> 100 % reversible. Les posts-carnets deja publies en prod restent en base
 * et reapparaitront si on reactive.
 *
 * Detection ROBUSTE (independante de la config Vercel) :
 *   - Si VITE_APP_ENV === 'production' -> labs OFF (cas ou la variable est posee).
 *   - Sinon, si l'hote est le domaine public prod (naturegraph.ca) -> labs OFF.
 *   - Sinon (localhost, previews *.vercel.app, beta.naturegraph.ca) -> labs ON.
 * On combine les deux signaux pour ne PAS dependre uniquement d'une variable
 * d'env qu'on ne peut pas verifier a coup sur : des qu'un indicateur dit "prod",
 * on masque (defaut sur). Les testeurs sur beta.naturegraph.ca gardent l'acces.
 */

/** Hotes du site PUBLIC de production (labs masques). beta.* en est exclu. */
const PUBLIC_PROD_HOSTS = new Set(['naturegraph.ca', 'www.naturegraph.ca'])

function computeLabsEnabled(): boolean {
  // Signal 1 : variable d'env explicite (si correctement posee en prod).
  if ((import.meta.env.VITE_APP_ENV as string | undefined) === 'production') return false
  // Signal 2 : hostname du site public (fiable meme sans variable d'env).
  if (typeof window !== 'undefined' && PUBLIC_PROD_HOSTS.has(window.location.hostname)) {
    return false
  }
  return true
}

/** true PARTOUT sauf sur le site public de production (naturegraph.ca). */
export const LABS_ENABLED = computeLabsEnabled()

/**
 * Carnets d'observations (creation, mode terrain, carte feed, import).
 * Masques sur le site public prod (Nicolas 2026-06-11).
 */
export const NOTEBOOKS_ENABLED = LABS_ENABLED

/**
 * Aide a l'identification collaborative (NG-039 : demande d'aide, propositions,
 * votes, affichage distinctif). Masquee sur le site public prod (en test).
 */
export const IDENTIFICATION_HELP_ENABLED = LABS_ENABLED
