/**
 * authUrlNotice : capture les erreurs d'authentification presentes dans l'URL au boot
 * ===================================================================================
 *
 * Probleme (NG-042 / invitations 2026-06-30) : quand un lien d'invitation ou un
 * magic link est deja consomme (pre-scan anti-spam Gmail/Outlook qui pre-clique
 * les liens) ou expire, Supabase Auth redirige vers l'app avec une ERREUR dans le
 * hash de l'URL, par exemple :
 *   /onboarding#error=access_denied&error_code=otp_expired&error_description=...
 *
 * Sans ce module : `detectSessionInUrl` n'etablit aucune session, le guard
 * redirige vers /login sans aucune explication -> l'utilisateur ne comprend pas
 * pourquoi il n'est pas connecte.
 *
 * Solution : on capture l'erreur AU PLUS TOT (premiere ligne de main.tsx, avant
 * que le client Supabase ne nettoie le hash de maniere asynchrone), on pose un
 * flag en sessionStorage, et on renvoie l'utilisateur vers l'inscription libre.
 * En acces ouvert (NG-029), le lien d'invitation n'a plus de valeur particuliere :
 * l'invite peut simplement creer son compte depuis le signup. AuthPage affiche un
 * message clair pour expliquer la situation.
 */

/** Flag lu par AuthPage pour afficher le toast "lien expire". */
const INVITE_EXPIRED_KEY = 'naturegraph-invite-expired'

/**
 * A appeler tout au debut du boot (main.tsx). Si l'URL contient une erreur d'auth
 * (hash `#error=...` / `error_code=...`), pose le flag et nettoie le hash. C'est
 * ensuite AuthPage qui bascule sur le formulaire d'inscription (acces ouvert :
 * l'invite n'a qu'a creer son compte) et affiche le message.
 */
export function captureAuthUrlError(): void {
  try {
    const rawHash = window.location.hash
    if (!rawHash || rawHash.length < 2) return
    const params = new URLSearchParams(rawHash.slice(1))
    const hasError = !!(params.get('error') || params.get('error_code'))
    if (!hasError) return

    window.sessionStorage.setItem(INVITE_EXPIRED_KEY, '1')
    // Nettoie le hash (evite un re-declenchement + URL propre).
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    // sessionStorage/history indisponible (Safari prive) : on ignore.
  }
}

/**
 * Lit le flag "lien expire" SANS le consommer (pour choisir le mode initial de
 * l'ecran auth des le premier rendu, sans setState dans un effet).
 */
export function peekInviteExpired(): boolean {
  try {
    return window.sessionStorage.getItem(INVITE_EXPIRED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Lit et consomme (one-shot) le flag "lien expire". Retourne true une seule fois.
 */
export function consumeInviteExpired(): boolean {
  try {
    const flag = window.sessionStorage.getItem(INVITE_EXPIRED_KEY)
    if (flag === '1') {
      window.sessionStorage.removeItem(INVITE_EXPIRED_KEY)
      return true
    }
  } catch {
    // ignore
  }
  return false
}
