/**
 * authStorage — Storage adapter dynamique pour Supabase Auth
 * ===========================================================
 *
 * Implémente le comportement "Se souvenir de moi" côté SPA :
 *   - remember = true  → session écrite dans localStorage (persistante 30j,
 *                        durée de vie du refresh token Supabase)
 *   - remember = false → session écrite dans sessionStorage (effacée à la
 *                        fermeture du navigateur → reconnexion = nouveau OTP)
 *
 * Limite connue — cookies HttpOnly impossibles en SPA pur :
 *   Un vrai stockage HttpOnly nécessiterait un backend proxy (Next.js SSR,
 *   edge function) émettant des cookies côté serveur. Ici on utilise le
 *   meilleur compromis possible en Vite SPA, en s'appuyant sur :
 *     - la rotation automatique des refresh tokens par Supabase,
 *     - l'access token JWT court (1h),
 *     - la révocation côté serveur via signOut() ou changement de mot de passe.
 *
 * Le flag "remember" est lui-même stocké dans sessionStorage : il est posé
 * avant l'envoi de l'OTP (signInWithOtp) et consommé au moment de la
 * vérification (verifyOtp), quand Supabase écrit la session via setItem().
 */

/** Clé sessionStorage où est posé le flag "remember me" pendant le flow OTP */
const REMEMBER_KEY = 'naturegraph-auth-remember'

/**
 * Pose le choix "Se souvenir de moi" AVANT que Supabase écrive la session.
 * À appeler juste avant `signInWithOtp` (envoi du code).
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === 'undefined') return
  if (remember) {
    sessionStorage.setItem(REMEMBER_KEY, '1')
  } else {
    sessionStorage.removeItem(REMEMBER_KEY)
  }
}

/** Retourne l'état courant du flag "remember me" */
export function isRememberMeActive(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(REMEMBER_KEY) === '1'
}

/**
 * Storage adapter consommé par `createClient({ auth: { storage } })`.
 *
 * Lecture : cherche dans les deux storages (permet de lire une session
 * existante sans connaître son origine).
 *
 * Écriture : route selon le flag — localStorage si "remember" actif,
 * sessionStorage sinon. Nettoie systématiquement l'autre storage pour
 * éviter les doublons/sessions orphelines.
 *
 * Suppression : purge les deux storages (utilisé par signOut).
 */
export const authStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    if (isRememberMeActive()) {
      window.localStorage.setItem(key, value)
      window.sessionStorage.removeItem(key)
    } else {
      window.sessionStorage.setItem(key, value)
      window.localStorage.removeItem(key)
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

/**
 * Purge totale côté client — à appeler depuis signOut() en complément
 * de supabase.auth.signOut() (qui lui révoque aussi côté serveur).
 */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  // Purge la clé Supabase + le flag remember
  const keys = ['naturegraph-auth', REMEMBER_KEY]
  for (const k of keys) {
    window.localStorage.removeItem(k)
    window.sessionStorage.removeItem(k)
  }
}
