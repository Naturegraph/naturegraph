/**
 * featureFlags : Activation de fonctionnalites par environnement ("labs")
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

/**
 * Consentement marketing (opt-in newsletter sur le formulaire waitlist).
 *
 * Decision Nicolas (2026-06-24) : MASQUE PARTOUT pour l'instant, on n'est pas
 * encore en phase marketing / mailing / newsletter (MailerLite prevu pour aout).
 * Afficher une case "recevoir les nouvelles" maintenant n'aurait pas de sens.
 *
 * Reversible : passer a `true` reaffiche la case quand la phase marketing demarre.
 * Non destructif : la colonne `beta_waitlist.marketing_consent` reste en place
 * (toujours false tant que la case est masquee). La mention transactionnelle et
 * le lien vers la politique de confidentialite, eux, restent toujours affiches
 * (transparence RGPD de base, independante du marketing).
 */
export const MARKETING_CONSENT_ENABLED = false

/**
 * Acces ouvert / early access (NG-029, Epic A).
 *
 * ACTIF (etat actuel, decision Nicolas 2026-06-30) : la beta fermee et le code
 * d'acces sont supprimes. L'app est accessible sans cle (BetaAccessGuard
 * transparent), l'inscription est libre depuis la landing, le messaging "beta
 * fermee" devient "acces anticipe (phase de test)".
 *
 * Note : l'ecran /welcome (saisie du code) a ete PHYSIQUEMENT SUPPRIME du repo
 * (plus de fichier Welcome.tsx, route /welcome redirige vers /). Ce flag n'est
 * donc plus un simple interrupteur reversible : le retour a une beta fermee
 * exigerait de restaurer cet ecran. On reste en "acces anticipe" cote messaging
 * et legal (protection juridique : service fourni tel quel, phase de test).
 */
export const OPEN_ACCESS_ENABLED = true
