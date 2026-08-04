/**
 * resumeRecovery.ts : reprise propre au retour d'arriere-plan (PWA mobile)
 * ===========================================================================
 *
 * LE bug le plus frustrant du soft launch (Nicolas, repete) : "je quitte l'app,
 * je reviens, le bouton Partage ta rencontre est mort, et RIEN dans Sentry".
 *
 * Cause racine (diagnostic 2026-08-04) : quand l'OS met la PWA en arriere-plan
 * assez longtemps, il GELE (voire tue) tout le contexte JavaScript. Au retour,
 * iOS/Android restaure un INSTANTANE FIGE de la page depuis le bfcache :
 *   - le DOM est visible mais les timers sont en pause,
 *   - la socket temps reel Supabase est morte,
 *   - le moteur JS etait suspendu -> les handlers React ne repondent plus,
 *   - et surtout Sentry etait gele LUI AUSSI -> il ne peut rien envoyer.
 * => "le bouton est mort ET rien dans Sentry" n'est PAS un trou d'instrumentation :
 *    aucune instrumentation in-page ne peut remonter depuis une page gelee.
 *
 * La seule reprise fiable est de recharger la page pour redonner une app 100 %
 * vivante. On le fait de façon ciblee, sobre et anti-boucle :
 *   - `pageshow` avec `event.persisted` = restauration bfcache = instantane fige.
 *     Si la page etait cachee depuis un moment -> reload (l'app etait morte).
 *   - retour visible apres une longue absence (JS vivant mais donnees perimees)
 *     -> pas de reload, juste un refetch des requetes actives (sobre).
 *
 * IMPORTANT : ce module est installe DEPUIS main.tsx, hors de l'arbre React, pour
 * qu'il fonctionne meme si React est fige. Ne pas le transformer en hook.
 */

import { queryClient } from './queryClient'
import { trackAction } from './monitoring'

// Anti-boucle : on ne recharge jamais deux fois en rafale (une vraie panne
// reseau ne doit pas nous coincer dans un cycle de reload). Partage la meme
// logique de garde que le handler `vite:preloadError` de main.tsx.
const RELOAD_GUARD_KEY = 'ng:resume-reload-at'
const RELOAD_MIN_INTERVAL_MS = 10_000

// bfcache restaure apres AU MOINS cette duree cachee -> reload. En dessous,
// l'instantane est frais (fige il y a quelques secondes) : un simple app-switch
// eclair, pas la peine de recharger (et on evite de perdre une saisie en cours).
const RESUME_RELOAD_MIN_HIDDEN_MS = 60 * 1000

// JS vivant mais onglet endormi tres longtemps -> donnees perimees, temps reel
// probablement decroche : on rafraichit les requetes actives sans recharger.
const STALE_SOFT_MS = 15 * 60 * 1000

// Horodatage du passage en arriere-plan, pour mesurer la duree d'absence.
let hiddenAt: number | null = null

/**
 * Recharge la page UNE fois (garde anti-boucle via sessionStorage). Le reload
 * est le SEUL moyen fiable de sortir d'un instantane bfcache fige : il reinstalle
 * un contexte JS vivant, une socket temps reel neuve et les bons chunks.
 */
function reloadOnce(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0')
    if (Date.now() - last < RELOAD_MIN_INTERVAL_MS) return // deja tente il y a peu
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    /* sessionStorage indispo (mode prive strict) : on recharge quand meme */
  }
  trackAction('app.resume.reload', { reason })
  window.location.reload()
}

/**
 * Installe les ecouteurs de reprise. A appeler UNE fois au boot (main.tsx).
 */
export function installResumeRecovery(): void {
  if (typeof window === 'undefined') return

  // On memorise l'instant ou la page part en arriere-plan. `pagehide` couvre le
  // bfcache (il precede le gel), `visibilitychange` couvre le simple masquage.
  const markHidden = (): void => {
    hiddenAt = Date.now()
  }
  window.addEventListener('pagehide', markHidden)

  // `pageshow` est le SEUL evenement fiable quand le navigateur ressort une page
  // du bfcache (retour dans la PWA apres mise en veille iOS/Android). Il fire
  // aussi au chargement initial (persisted=false) : on ne traite QUE persisted.
  window.addEventListener('pageshow', (e) => {
    if (!(e as PageTransitionEvent).persisted) return
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0
    // Instantane fige apres une absence non triviale : l'app etait morte, on la
    // ressuscite par un reload. En dessous du seuil, on laisse le handler
    // `visibilitychange` ci-dessous faire un simple refetch si besoin.
    if (hiddenMs >= RESUME_RELOAD_MIN_HIDDEN_MS) {
      reloadOnce('bfcache-restore')
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      markHidden()
      return
    }
    // Retour visible.
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0
    hiddenAt = null
    if (hiddenMs <= 0) return
    // Fil d'Ariane : chaque reprise est tracee. Si un echec survient juste apres
    // (bouton, publication), Sentry montrera "revenu apres N s d'absence" dans le
    // contexte -> on relie enfin le bug au retour d'arriere-plan.
    trackAction('app.resume', { hiddenSec: Math.round(hiddenMs / 1000) })
    // JS vivant mais endormi longtemps : donnees perimees. Refetch cible des
    // seules requetes actives (montees) : sobre, pas de reload, pas de storm.
    if (hiddenMs >= STALE_SOFT_MS) {
      trackAction('app.resume.soft-refresh', { hiddenSec: Math.round(hiddenMs / 1000) })
      queryClient.invalidateQueries().catch(() => {})
    }
  })
}
