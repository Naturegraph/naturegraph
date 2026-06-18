/**
 * debugLog : Helper de log debug conditionné au mode dev
 * ========================================================
 *
 * Le projet impose la règle ESLint `no-console` (sauf `warn` / `error`)
 * pour éviter de polluer la console en prod. Mais on a parfois besoin
 * de tracer des flows critiques (ex: persistance onboarding RC-E) pour
 * la validation manuelle ou le support utilisateur.
 *
 * Ce helper résout les 2 contraintes :
 *   - Log uniquement en dev (`import.meta.env.DEV === true`) → pas de
 *     pollution console en prod
 *   - Centralise les `eslint-disable` dans un seul fichier
 *   - Préfixe les logs avec un `scope` pour faciliter le filtrage
 *     ("[scope] message")
 *
 * Usage :
 * ```ts
 * import { debugLog } from '@/lib/debugLog'
 * debugLog('onboarding', 'persisting user data', { userId, interestsCount })
 * ```
 *
 * En prod, `import.meta.env.DEV === false` → la fonction est un no-op total
 * et Vite tree-shake l'appel (les arguments ne sont même pas évalués).
 */

/* eslint-disable no-console */

/**
 * Logue un message debug avec un préfixe `[scope]` : visible UNIQUEMENT en dev.
 *
 * @param scope Préfixe pour grep (ex: 'onboarding', 'cookie-banner')
 * @param message Message principal
 * @param data Données contextuelles optionnelles (objet, error, etc.)
 */
export function debugLog(scope: string, message: string, data?: unknown): void {
  if (!import.meta.env.DEV) return
  if (data !== undefined) {
    console.log(`[${scope}] ${message}`, data)
  } else {
    console.log(`[${scope}] ${message}`)
  }
}
