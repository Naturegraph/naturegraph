/**
 * usernameValidation : Règles de validation du pseudo
 * ============================================================
 *
 * Source de vérité unique pour le format des pseudos Naturegraph.
 * Utilisé à la fois à l'onboarding (OnboardingStep4) et à l'édition
 * de profil (EditInfoTab) pour éviter toute divergence.
 *
 * Règles (Nicolas 2026-05-22 : assouplissement après retour beta) :
 *   - 3 à 30 caractères
 *   - Caractères autorisés : a-z A-Z 0-9 . _
 *   - Pas de `..` ou `__` consécutifs (anti-typosquatting)
 *   - Pas de mot banni (liste séparée : vérifiée côté composant)
 *
 * Les positions début/fin du `.` et `_` ne sont PLUS bloquées :
 * "flo.d", "flod.", ".flod", "_flod" sont tous acceptés.
 */

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

export type UsernameFormatError = 'tooShort' | 'tooLong' | 'invalidFormat' | null

/**
 * Valide le format brut du pseudo (sans vérifier les mots bannis
 * ni l'unicité : ces deux checks restent côté appelant qui a accès
 * à BANNED_USERNAMES + Supabase).
 */
export function validateUsernameFormat(username: string): UsernameFormatError {
  if (username.length < USERNAME_MIN_LENGTH) return 'tooShort'
  if (username.length > USERNAME_MAX_LENGTH) return 'tooLong'
  if (!/^[a-zA-Z0-9._]+$/.test(username)) return 'invalidFormat'
  // Pas de double point/underscore consécutifs : évite "jo..n" ou "jo__n"
  if (/[._]{2,}/.test(username)) return 'invalidFormat'
  return null
}
