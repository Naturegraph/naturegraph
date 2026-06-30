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
 * Verifie que la session courante est encore valide cote serveur.
 *
 * - Si valide, retourne { user }.
 * - Si invalide (JWT expire, refresh mort), purge le storage + signOut
 *   local + redirige vers /welcome avec un flag pour afficher un toast
 *   sur la page d arrivee, puis throw SessionExpiredError.
 *
 * Le throw est intentionnel, il interrompt le flux appelant (try/catch
 * dans le service / hook le capture proprement). Si l appelant ne capture
 * pas, l erreur remonte mais l user voit deja la nouvelle page.
 */
export async function assertActiveSession(): Promise<ActiveSession> {
  if (!supabase) {
    throw new SessionExpiredError()
  }

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      await forceReauth()
      throw new SessionExpiredError()
    }
    return { user: { id: data.user.id, email: data.user.email ?? null } }
  } catch (err) {
    if (err instanceof SessionExpiredError) throw err
    // Erreur reseau ou autre, on laisse passer une chance, l appelant gere
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
