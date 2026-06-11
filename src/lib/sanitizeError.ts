/**
 * sanitizeError — Filtre central des messages d'erreur exposes a l'utilisateur
 * ===========================================================================
 *
 * Retour testeur (naelm_photo, 2026-06-11) : « pour le retour des erreurs, tu
 * ne dois rien afficher de technique a l'utilisateur. Toujours reecrire le
 * message qui vient du back : pas de detail technique (ca donne des indices a
 * un attaquant) et l'user ne comprend pas ce qu'il fait de mal. »
 *
 * Probleme concret : nos services font massivement `throw new Error(error.message)`
 * avec le message Postgres/PostgREST brut. Affiche tel quel, ca fuit le schema
 * (« value too long for type character varying(160) », noms de colonnes,
 * contraintes, SQLSTATE...).
 *
 * Strategie : assainir AU POINT D'AFFICHAGE (toasts, setError) plutot qu'a
 * chaque `throw` (60+ sites, dont certains testent `error.code` -> risque de
 * regression). Un seul helper, applique cote UI :
 *   - si le message ressemble a du technique -> message generique sur,
 *   - sinon (un de nos libelles FR ecrits a la main) -> on le garde.
 *
 * Module « pur » (aucune dependance React/i18n) pour etre utilisable partout :
 * hook de submit, composants, services.
 */

/**
 * Motifs « techniques » a ne JAMAIS exposer. Couvre Postgres / PostgREST /
 * Supabase / stack traces / codes SQLSTATE. Nos messages FR maison ne
 * contiennent pas ces tokens (anglais / symboles), donc ils passent.
 */
export const TECHNICAL_ERROR_PATTERN =
  /violates|constraint|relation|null value|duplicate key|value too long|character varying|varchar|syntax error|permission denied|\bcolumn\b|\bschema\b|pgrst|jwt|sqlstate|invalid input|foreign key|not-null|deadlock|supabase\.co|postgres|\b\d{5}\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|stack|0x[0-9a-f]+/i

/** Message generique par defaut, neutre et rassurant. */
export const GENERIC_ERROR_MESSAGE = 'Une erreur est survenue. Reessaie dans un instant.'

/** True si le message porte des indices techniques a ne pas exposer. */
export function isTechnicalMessage(message: string | null | undefined): boolean {
  if (!message) return false
  return TECHNICAL_ERROR_PATTERN.test(message)
}

/**
 * Transforme une erreur quelconque en message AFFICHABLE par l'utilisateur.
 *  - extrait le message si c'est une Error,
 *  - le remplace par `fallback` s'il est vide OU s'il sent le technique,
 *  - sinon le retourne tel quel (cas de nos libelles FR maison).
 *
 * Le detail technique d'origine doit etre logge separement (console.error) par
 * l'appelant pour le debug : ce helper ne s'occupe QUE de l'affichage.
 */
export function toSafeMessage(err: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw || isTechnicalMessage(raw)) return fallback
  return raw
}
