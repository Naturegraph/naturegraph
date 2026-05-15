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
 * BATCH 115 — Safety iOS Safari Private Mode :
 *   Tous les accès localStorage/sessionStorage sont enveloppés dans try/catch.
 *   iOS Safari Private Mode lève QUOTA_EXCEEDED_ERR sur setItem au-delà de 0-5 MB.
 *   Sans try/catch, l'auth crash silencieusement et le user ne peut pas se logger.
 *   Fallback : memoire en cours (objet `memoryStorage`) → la session existe
 *   uniquement le temps de l'onglet (acceptable en mode privé).
 *
 * Limite connue — cookies HttpOnly impossibles en SPA pur :
 *   Un vrai stockage HttpOnly nécessiterait un backend proxy (Next.js SSR,
 *   edge function) émettant des cookies côté serveur. Ici on utilise le
 *   meilleur compromis possible en Vite SPA.
 *
 * Le flag "remember" est lui-même stocké dans sessionStorage : il est posé
 * avant l'envoi de l'OTP (signInWithOtp) et consommé au moment de la
 * vérification (verifyOtp), quand Supabase écrit la session via setItem().
 */

const REMEMBER_KEY = 'naturegraph-auth-remember'

// BATCH 115 : fallback in-memory pour iOS Safari Private Mode (QUOTA_EXCEEDED)
const memoryStorage = new Map<string, string>()

// ─── Wrappers safe pour localStorage/sessionStorage ──────────────────────────

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memoryStorage.get(`L:${key}`) ?? null
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memoryStorage.set(`L:${key}`, value)
  }
}

function safeLocalRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* private mode : pas d'erreur */
  }
  memoryStorage.delete(`L:${key}`)
}

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return memoryStorage.get(`S:${key}`) ?? null
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    memoryStorage.set(`S:${key}`, value)
  }
}

function safeSessionRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* private mode : pas d'erreur */
  }
  memoryStorage.delete(`S:${key}`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pose le choix "Se souvenir de moi" AVANT que Supabase écrive la session.
 * À appeler juste avant `signInWithOtp` (envoi du code).
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === 'undefined') return
  if (remember) {
    safeSessionSet(REMEMBER_KEY, '1')
  } else {
    safeSessionRemove(REMEMBER_KEY)
  }
}

/** Retourne l'état courant du flag "remember me" */
export function isRememberMeActive(): boolean {
  if (typeof window === 'undefined') return false
  return safeSessionGet(REMEMBER_KEY) === '1'
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
    return safeLocalGet(key) ?? safeSessionGet(key)
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    if (isRememberMeActive()) {
      safeLocalSet(key, value)
      safeSessionRemove(key)
    } else {
      safeSessionSet(key, value)
      safeLocalRemove(key)
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    safeLocalRemove(key)
    safeSessionRemove(key)
  },
}

/**
 * Purge totale côté client — à appeler depuis signOut() en complément
 * de supabase.auth.signOut() (qui lui révoque aussi côté serveur).
 */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  const keys = ['naturegraph-auth', REMEMBER_KEY]
  for (const k of keys) {
    safeLocalRemove(k)
    safeSessionRemove(k)
  }
}
