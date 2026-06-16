/**
 * Flag "session expiree" (NG-003).
 *
 * AuthContext ne peut pas afficher de toast (il est monte AU-DESSUS du
 * ToastProvider). Quand une session est invalidee involontairement (refresh
 * token mort), on pose ce flag ; l'ecran de connexion (Welcome) le lit au montage
 * et affiche un message clair ("Ta session a expire, reconnecte-toi") au lieu de
 * laisser l'utilisateur face a un etat casse / un sablier sans explication.
 *
 * On reutilise la MEME cle que le flux existant `assertActiveSession` afin que le
 * handler deja en place dans Welcome.tsx affiche le message sans duplication.
 */

const KEY = 'naturegraph-session-expired'

/** Marque la session comme expiree involontairement (refresh token mort). */
export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* sessionStorage indisponible (mode prive strict) : on ignore */
  }
}
