/**
 * authGuard, helper de detection de session morte cote client
 * ============================================================
 *
 * Probleme adresse (cas Flo.d 2026-05-25) :
 *   L user reste affiche comme authentifie dans React state (AuthContext)
 *   alors que son JWT a expire et le refresh local ne marche plus (corruption
 *   localStorage, race condition, Chrome Android qui recycle l onglet, etc.).
 *   Les services qui font supabase.auth.getUser() retournent null, jettent
 *   des erreurs genre Authentification requise, et l user ne sait pas quoi
 *   faire (les boutons UI semblent fonctionnels).
 *
 * Solution :
 *   Helper assertActiveSession() qui valide le JWT serveur via getUser().
 *   Si invalide, il purge le storage local + signe out + redirige vers
 *   /welcome avec un toast clair  "Ta session a expire, reconnecte-toi".
 *
 * Usage dans les services / hooks critiques :
 *
 *   ```ts
 *   const session = await assertActiveSession()
 *   // session.user.id disponible ici, sinon assertActiveSession a redirige
 *   ```
 *
 * Note : on garde le module leger (pas d import de react-router pour
 * eviter de coupler la couche service au router). On utilise
 * window.location.assign qui est universel et purge l etat React.
 */

import { supabase } from './supabase'
import { clearAuthStorage } from './authStorage'

/** Resultat d une session valide, expose l user authentifie pour l appelant. */
export interface ActiveSession {
  user: { id: string; email: string | null }
}

/** Erreur jetee si la session est morte ET la redirection a eu lieu. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired, redirect to /welcome')
    this.name = 'SessionExpiredError'
  }
}

/**
 * Detecte un refresh token DEFINITIVEMENT mort (revoque, absent, deja consomme).
 * C'est le SEUL cas ou l'on doit reellement deconnecter : tout le reste (access
 * token juste expire, coupure reseau) est rattrapable par un refresh ou un
 * retry, et ne doit PAS faire perdre son brouillon a l'utilisateur.
 */
function isDeadRefreshToken(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    m.includes('refresh_token_not_found') ||
    m.includes('invalid refresh token') ||
    m.includes('refresh token not found') ||
    m.includes('already used')
  )
}

/**
 * Verifie que la session courante est encore valide cote serveur, en la
 * REPARANT d'abord si possible au lieu de la detruire.
 *
 * Ordre (du moins destructif au plus destructif) :
 *   1. getUser() OK -> session valide, on retourne { user }.
 *   2. getUser() KO (le plus souvent : ACCESS token expire au retour
 *      d'arriere-plan mobile, alors que le REFRESH token est encore bon)
 *      -> on tente `refreshSession()`. Si ca marche, la session est reparee
 *      de facon transparente : l'utilisateur ne voit RIEN, ne recommence RIEN.
 *   3. Le refresh echoue avec un refresh token MORT -> la seulement on purge +
 *      redirige vers /login (SessionExpiredError). Reste rare.
 *   4. Le refresh echoue de facon TRANSITOIRE (reseau) -> on ne detruit RIEN :
 *      on remonte une erreur normale, l'appelant affiche "reessaie" et le
 *      brouillon (auto-save localStorage + photos IndexedDB) reste intact.
 *
 * C'est ce qui evite le "il faut tout recommencer / relancer la session a la
 * main" quand l'app revient de veille (retour Nicolas 2026-07-30, critique).
 */
export async function assertActiveSession(): Promise<ActiveSession> {
  if (!supabase) {
    throw new SessionExpiredError()
  }

  try {
    // 1. Session deja valide ?
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      return { user: { id: data.user.id, email: data.user.email ?? null } }
    }

    // 2. Access token probablement expire : on REPARE via le refresh token
    //    avant tout, plutot que de deconnecter. Cas ultra frequent au retour
    //    d'arriere-plan sur mobile.
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
    if (!refreshErr && refreshed?.user) {
      return { user: { id: refreshed.user.id, email: refreshed.user.email ?? null } }
    }

    // 3. Refresh token reellement mort : la, on doit reauth.
    if (isDeadRefreshToken(refreshErr)) {
      await forceReauth()
      throw new SessionExpiredError()
    }

    // 4. Echec transitoire (reseau) : on NE detruit PAS la session. On laisse
    //    une chance a l'appelant (le pipeline de publication retente + le
    //    watchdog gere), en gardant le brouillon intact.
    throw new Error('Session momentanement indisponible, reessaie dans un instant.')
  } catch (err) {
    if (err instanceof SessionExpiredError) throw err
    // Erreur reseau ou autre : on laisse passer une chance, l appelant gere.
    throw err
  }
}

/**
 * Purge la session locale + signOut serveur (best effort) + redirige.
 *
 * Exposee aussi en helper pour les cas ou l appelant a deja detecte une
 * erreur auth specifique (ex : code Postgres 42501 sur INSERT RLS).
 */
export async function forceReauth(): Promise<void> {
  // Purge localStorage + sessionStorage Naturegraph
  clearAuthStorage()
  // SignOut serveur, best effort (peut echouer si le JWT est deja invalide)
  try {
    await supabase?.auth.signOut({ scope: 'local' })
  } catch {
    // ignore, on a deja purge le local
  }
  // Pose un flag pour que l'ecran de connexion affiche un toast a l arrivee
  try {
    window.sessionStorage.setItem('naturegraph-session-expired', '1')
  } catch {
    // sessionStorage indisponible (Safari prive), tant pis
  }
  // Redirige vers la connexion avec un hard reload pour vider l etat React +
  // Query cache (l'ecran /welcome n'existe plus, acces ouvert NG-029).
  window.location.assign('/login')
}
