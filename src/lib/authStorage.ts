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
 * Le flag "remember" est stocké dans localStorage (Nicolas 2026-05-22) :
 * il doit survivre à la fermeture du navigateur pour que les rotations
 * automatiques du refresh token (déclenchées au retour de l'utilisateur)
 * continuent d'écrire la session en localStorage. Stocké en sessionStorage
 * il était perdu à chaque fermeture, et l'utilisateur finissait par devoir
 * redemander un OTP même avec "Se souvenir de moi" coché.
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
 *
 * Stocké en localStorage pour survivre à la fermeture du navigateur. Sinon
 * les rotations de refresh token au retour de l'utilisateur reverraient
 * la session vers sessionStorage et l'auth serait éphémère malgré le check.
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === 'undefined') return
  if (remember) {
    safeLocalSet(REMEMBER_KEY, '1')
    // Nettoie l'ancien emplacement (sessionStorage) au cas où un utilisateur
    // ait une session héritée d'avant ce fix.
    safeSessionRemove(REMEMBER_KEY)
  } else {
    safeLocalRemove(REMEMBER_KEY)
    safeSessionRemove(REMEMBER_KEY)
  }
}

/** Retourne l'état courant du flag "remember me" */
export function isRememberMeActive(): boolean {
  if (typeof window === 'undefined') return false
  // Lecture prioritaire localStorage (nouveau standard) + fallback session
  // pour ne pas casser les sessions actives migrées d'avant ce fix.
  return safeLocalGet(REMEMBER_KEY) === '1' || safeSessionGet(REMEMBER_KEY) === '1'
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
 * NG-038 : détecte SYNCHRONEMENT la présence d'une session persistée
 * (localStorage ou sessionStorage), sans réseau.
 *
 * Sert au boot d'auth : tant qu'un token existe, on ne doit JAMAIS conclure
 * « déconnecté » (cause racine du faux état déconnecté / Landing avant feed).
 * On attend / on réessaie la restauration au lieu d'afficher la Landing.
 */
export function hasStoredAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  const raw = safeLocalGet('naturegraph-auth') ?? safeSessionGet('naturegraph-auth')
  // Un blob de session valide contient au minimum un access_token.
  return !!raw && raw.includes('access_token')
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
  // V1.1.4 QA round 11 (Nicolas 2026-06-02) : on purge aussi le flag du
  // BootSplash pour que l user revoie le loader Naturegraph apres une
  // reconnexion (effet "bienvenue", coherent avec le branding).
  safeSessionRemove('naturegraph-splash-seen')
}
