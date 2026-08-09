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
import { trackAction } from './monitoring'

// Anti-boucle : jamais deux reloads en rafale (une vraie panne ne doit pas nous
// coincer dans un cycle). Meme garde que le handler `vite:preloadError` de main.tsx.
const RELOAD_GUARD_KEY = 'ng:resume-reload-at'
const RELOAD_MIN_INTERVAL_MS = 10_000

// Battement de coeur : cadence de mise a jour du jeton de vivacite. Court = reprise
// detectee vite apres le degel (le prochain tick).
const HEARTBEAT_MS = 2_000
// Ecart de battement au-dela duquel on considere que le JS a ete GELE -> reload.
// 8 s : au-dessus du clamp des timers de fond (desktop reste ~2 s les 5 premieres
// min), atteint des qu'un mobile passe ~8 s en arriere-plan (le cas va-et-vient).
const FREEZE_GAP_MS = 8_000

// JS reste VIVANT mais onglet endormi ce temps -> donnees perimees : refetch doux
// (sans reload).
const STALE_SOFT_MS = 2 * 60 * 1000

let lastBeat = Date.now()
let hiddenAt: number | null = null

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
    // Pas de gel : juste endormi. Refetch doux si l'absence a ete longue.
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0
    hiddenAt = null
    if (hiddenMs > 0) trackAction('app.resume', { hiddenSec: Math.round(hiddenMs / 1000) })
    if (hiddenMs >= STALE_SOFT_MS) {
      queryClient.invalidateQueries().catch(() => {})
    }
  })
}
