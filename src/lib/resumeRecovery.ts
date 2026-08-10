/**
 * resumeRecovery.ts : reprise propre au retour d'arriere-plan / de veille
 * ===========================================================================
 *
 * LE bug le plus frustrant du soft launch : "je quitte l'app (juste en arriere-plan,
 * ex. pour ouvrir Instagram), je reviens, le bouton Publier est mort, et il faut
 * fermer completement l'app pour que ca remarche" (le "va-et-vient" mobile).
 *
 * Cause : en arriere-plan (surtout mobile / PWA), l'OS GELE tout le contexte JS.
 * Au retour, la page est un instantane fige : handlers React muets -> bouton mort.
 * AUCUNE reprise in-page ne ressuscite une page gelee -> la seule voie fiable est
 * de RECHARGER (et comme il n'y a PAS de Service Worker, un reload prend toujours
 * la derniere version + une session fraiche + une socket temps reel neuve).
 *
 * DETECTION FIABLE = le BATTEMENT DE COEUR lui-meme, PAS les evenements.
 * On avait d'abord tente `visibilitychange` / `pageshow(persisted)` : mais en PWA
 * iOS/Android standalone ils sont peu fiables (parfois pas emis au reveil) -> le
 * detecteur ne tournait jamais. Ici, un `setInterval` met a jour un jeton ; en
 * arriere-plan il est GELE ; au degel, le PREMIER tick voit un grand ecart depuis
 * le dernier battement = preuve que le JS a ete suspendu -> reload. L'intervalle,
 * lui, reprend TOUJOURS quand le JS degele, independamment de tout evenement.
 *
 * Sans faux positif desktop : un onglet de fond garde ses timers clampes a ~>=1s
 * les 5 premieres minutes, donc l'ecart reste petit tant que la page n'est pas
 * vraiment gelee. On ne recharge d'ailleurs QUE si l'app est au premier plan
 * (visibilityState === 'visible').
 *
 * Au reload, la SAISIE N'EST PAS PERDUE : le brouillon (NG-004) et les photos
 * (IndexedDB NG-038) sont restaures a la reouverture du panneau de publication.
 *
 * IMPORTANT : installe DEPUIS main.tsx, hors de l'arbre React, pour fonctionner
 * meme si React est fige. Ne pas le transformer en hook.
 */

import { queryClient } from './queryClient'
import { supabase } from './supabase'
import { trackAction, trackFailure } from './monitoring'

// Anti-boucle : jamais deux reloads en rafale (une vraie panne ne doit pas nous
// coincer dans un cycle). Meme garde que le handler `vite:preloadError` de main.tsx.
const RELOAD_GUARD_KEY = 'ng:resume-reload-at'
const RELOAD_MIN_INTERVAL_MS = 10_000

// Battement de coeur : cadence de mise a jour du jeton de vivacite. Court = reprise
// detectee vite apres le degel (le prochain tick).
const HEARTBEAT_MS = 2_000
// Ecart de battement au-dela duquel on considere que le JS a ete GELE -> reload.
// 6 s : au-dessus du clamp des timers de fond (desktop reste ~2 s les 5 premieres
// min), atteint des qu'un mobile passe ~6 s en arriere-plan (le cas va-et-vient).
const FREEZE_GAP_MS = 6_000

// Marqueur pose AVANT un reload-de-gel : au boot suivant, on remonte un EVENEMENT
// Sentry (pas un breadcrumb) pour CONFIRMER que le rechargement a bien eu lieu.
const FROZE_RELOAD_KEY = 'ng:froze-reload-gap'

// JS reste VIVANT mais onglet endormi ce temps -> donnees perimees : refetch doux
// (sans reload).
const STALE_SOFT_MS = 2 * 60 * 1000

// Absence minimale (arriere-plan) au-dela de laquelle on SONDE le backend au retour.
// En dessous (bascule eclair), inutile : la socket n'a pas eu le temps de mourir.
const PROBE_MIN_HIDDEN_MS = 3_000
// Delai max de la sonde. Un getUser() sain repond en <1 s ; au-dela on considere le
// client supabase-js bloque. Marge confortable pour ne pas faire de faux positif sur
// reseau mobile lent, tout en restant sous le timeout de submit (8 s).
const PROBE_TIMEOUT_MS = 5_000

let lastBeat = Date.now()
let hiddenAt: number | null = null

/**
 * Sonde de vivacite du backend (fix "va-et-vient : publier tourne en rond puis
 * timeout"). Au retour d'arriere-plan sur mobile, les appels du client supabase-js
 * (auth `getUser`, puis l'insert) PENDENT indefiniment (Sentry prod 2026-08 :
 * `session-timeout-on-continue` + `Timeout creation du post apres 20s`). Une sonde
 * reseau BRUTE ne suffit pas : le TCP peut repondre alors que le CLIENT supabase-js
 * reste bloque. On teste donc l'appel EXACT qui pend (`auth.getUser`), borne par un
 * timeout court.
 *
 * Cle : on distingue "PEND" (probleme) de "repond avec une erreur" (pas un probleme,
 * l'app sait gerer). Une resolution OU un rejet dans le delai = client vivant. Seul
 * un depassement du timeout (aucune reponse) = client bloque -> l'appelant recharge.
 */
async function isBackendReachable(): Promise<boolean> {
  if (!supabase) return true // pas de client : rien a sonder, on ne recharge pas
  const timeout = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), PROBE_TIMEOUT_MS),
  )
  // getUser() resolue OU rejetee = le serveur a repondu = client vivant. On mappe les
  // deux sur 'ok' ; seul le timeout signale un blocage.
  const probe = supabase.auth
    .getUser()
    .then(() => 'ok' as const)
    .catch(() => 'ok' as const)
  const res = await Promise.race([probe, timeout])
  return res !== 'timeout'
}

/**
 * Recharge la page UNE fois (garde anti-boucle). Seul moyen fiable de sortir d'un
 * instantane fige : reinstalle un JS vivant, une session fraiche, les bons chunks.
 */
function reloadOnce(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0')
    if (Date.now() - last < RELOAD_MIN_INTERVAL_MS) return // deja tente il y a peu
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    /* sessionStorage indispo (prive strict) : on recharge quand meme */
  }
  trackAction('app.resume.reload', { reason })
  window.location.reload()
}

/**
 * Coeur de la detection : compare l'instant courant au dernier battement. Un grand
 * ecart = le JS a ete gele entre deux battements (arriere-plan) -> reload si on est
 * revenu au premier plan. Appele a chaque tick ET au retour visible (plus rapide).
 * Retourne true si un reload a ete declenche.
 */
function checkFreeze(source: string): boolean {
  const now = Date.now()
  const gap = now - lastBeat
  lastBeat = now
  if (gap >= FREEZE_GAP_MS && document.visibilityState === 'visible') {
    // Pose le marqueur AVANT le reload : Sentry est peut-etre gele et n'a pas le
    // temps d'emettre ici. Au boot suivant, installResumeRecovery() le lira et
    // remontera un EVENEMENT visible confirmant le rechargement.
    try {
      sessionStorage.setItem(FROZE_RELOAD_KEY, String(Math.round(gap / 1000)))
    } catch {
      /* ignore */
    }
    reloadOnce(`${source}:${Math.round(gap / 1000)}s`)
    return true
  }
  return false
}

/**
 * Installe la reprise. A appeler UNE fois au boot (main.tsx).
 */
export function installResumeRecovery(): void {
  if (typeof window === 'undefined') return
  lastBeat = Date.now()

  // Confirmation : si le boot precedent s'est termine par un reload-de-gel, on
  // remonte un EVENEMENT Sentry (trackFailure = captureMessage, visible dans la
  // liste des issues, contrairement aux breadcrumbs). Permet de VERIFIER que la
  // reprise du va-et-vient s'est bien declenchee, meme quand la page gelee n'avait
  // rien pu envoyer.
  try {
    const froze = sessionStorage.getItem(FROZE_RELOAD_KEY)
    if (froze) {
      sessionStorage.removeItem(FROZE_RELOAD_KEY)
      trackFailure('app.resume', 'reload-after-freeze', { frozenSec: Number(froze) })
    }
  } catch {
    /* ignore */
  }

  // DETECTEUR PRINCIPAL (independant des evenements, fiable en PWA) : au degel, le
  // premier tick voit l'ecart et recharge.
  window.setInterval(() => {
    checkFreeze('heartbeat')
  }, HEARTBEAT_MS)

  window.addEventListener('pagehide', () => {
    hiddenAt = Date.now()
  })

  // bfcache : la page ressort d'un instantane fige -> reload direct.
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) reloadOnce('bfcache')
  })

  // Retour au premier plan : reprise IMMEDIATE si l'evenement fire (plus rapide que
  // d'attendre le prochain tick). Sinon, le heartbeat s'en charge.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (checkFreeze('visible')) return
    // Pas de gel JS. Mais la socket vers le backend a pu mourir en arriere-plan
    // (mobile : la radio coupe les connexions au repos) SANS geler le JS -> les
    // prochaines requetes PENDENT (publier "tourne en rond" puis timeout, confirme
    // Sentry 2026-08). On mesure l'absence, puis on SONDE le backend.
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0
    hiddenAt = null
    if (hiddenMs > 0) trackAction('app.resume', { hiddenSec: Math.round(hiddenMs / 1000) })
    // Bascule eclair : rien a faire (la socket n'a pas eu le temps de mourir).
    if (hiddenMs < PROBE_MIN_HIDDEN_MS) return
    void (async () => {
      const reachable = await isBackendReachable()
      if (!reachable) {
        // Backend injoignable = socket morte : on recharge pour repartir sur des
        // sockets neuves (equivaut a la "relance complete" qui debloquait tout).
        // Le brouillon (NG-004) + les photos (NG-038) sont restaures : zero perte.
        trackFailure('app.resume', 'backend-injoignable-reload', {
          hiddenSec: Math.round(hiddenMs / 1000),
        })
        reloadOnce('backend-injoignable')
        return
      }
      // Backend vivant : juste des donnees potentiellement perimees -> refetch doux
      // si l'absence a ete longue.
      if (hiddenMs >= STALE_SOFT_MS) {
        queryClient.invalidateQueries().catch(() => {})
      }
    })()
  })
}
