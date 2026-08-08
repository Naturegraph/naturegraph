/**
 * resumeRecovery.ts : reprise propre au retour d'arriere-plan / de veille
 * ===========================================================================
 *
 * LE bug le plus frustrant du soft launch (repete par les users) : "je quitte
 * l'app (juste en arriere-plan, ex. pour ouvrir Instagram), je reviens, le bouton
 * Publier est mort, et il faut fermer completement l'app pour que ca remarche".
 *
 * Cause racine : quand l'OS met l'app en arriere-plan (meme quelques secondes sur
 * mobile), il GELE tout le contexte JavaScript. Au retour, la page est un
 * INSTANTANE FIGE : les timers etaient en pause, la socket temps reel morte, le
 * moteur JS suspendu -> les handlers React ne repondent plus (bouton mort), et
 * Sentry etait gele LUI AUSSI (rien ne remonte). AUCUNE reprise in-page ne peut
 * ressusciter une page gelee : la seule voie fiable est de RECHARGER.
 *
 * Detection fiable du gel = un BATTEMENT DE COEUR (heartbeat). Un timer met a jour
 * `lastBeat` regulierement. En veille/arriere-plan le timer est gele ; au retour,
 * un grand ecart entre "maintenant" et `lastBeat` prouve que le JS a ete suspendu.
 * C'est independant de bfcache/pageshow (qui ne fire pas partout) et sans faux
 * positif desktop (Chrome clampe les timers de fond a >= 1s les 5 premieres minutes,
 * donc l'ecart reste petit tant que la page n'est pas vraiment gelee).
 *
 * Au rechargement, la SAISIE N'EST PAS PERDUE : le brouillon (NG-004) et les photos
 * (IndexedDB NG-038) sont restaures a la reouverture du panneau de publication.
 *
 * IMPORTANT : ce module est installe DEPUIS main.tsx, hors de l'arbre React, pour
 * qu'il fonctionne meme si React est fige. Ne pas le transformer en hook.
 */

import { queryClient } from './queryClient'
import { trackAction } from './monitoring'

// Anti-boucle : on ne recharge jamais deux fois en rafale (une vraie panne ne doit
// pas nous coincer dans un cycle de reload). Partage la logique de garde du handler
// `vite:preloadError` de main.tsx.
const RELOAD_GUARD_KEY = 'ng:resume-reload-at'
const RELOAD_MIN_INTERVAL_MS = 10_000

// Battement de coeur : frequence de mise a jour du jeton de vivacite.
const HEARTBEAT_MS = 4_000
// Ecart de battement au-dela duquel on considere que le JS a ete GELE (page morte)
// -> reload. 15 s : au-dessus d'un simple clamp de timer de fond (desktop), mais
// atteint des qu'un mobile passe ~15 s en arriere-plan (le cas Instagram).
const FREEZE_GAP_MS = 15_000

// JS resté VIVANT mais onglet endormi ce temps -> donnees perimees, temps reel
// probablement decroche : on rafraichit les requetes actives SANS recharger.
const STALE_SOFT_MS = 2 * 60 * 1000

// Horodatage du passage en arriere-plan (mesure l'absence pour le refetch doux).
let hiddenAt: number | null = null
// Jeton de vivacite : mis a jour par le heartbeat tant que le JS tourne.
let lastBeat = Date.now()

/**
 * Recharge la page UNE fois (garde anti-boucle via sessionStorage). Le reload est
 * le SEUL moyen fiable de sortir d'un instantane fige : il reinstalle un contexte
 * JS vivant, une socket temps reel neuve, une session fraiche et les bons chunks.
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
 * Reprise unifiee, appelee au retour au premier plan ET a la restauration bfcache.
 * Decide entre : reload (page gelee) OU refetch doux (endormie mais vivante) OU
 * rien (aller-retour eclair).
 */
function recover(source: string): void {
  const frozenGap = Date.now() - lastBeat
  lastBeat = Date.now()
  const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0
  hiddenAt = null

  // Fil d'Ariane : chaque reprise tracee. Si un echec survient juste apres, Sentry
  // montre "revenu apres N s, JS gele M s" -> on relie enfin le bug au reveil.
  trackAction('app.resume', {
    source,
    hiddenSec: Math.round(hiddenMs / 1000),
    frozenSec: Math.round(frozenGap / 1000),
  })

  // On RECHARGE des qu'on detecte une page potentiellement morte. Deux signaux :
  //  - bfcache : la restauration bfcache signifie que la page etait un instantane
  //    GELE (handlers muets). On recharge des qu'il y a eu un vrai passage en fond
  //    (> 3 s, pour ignorer un aller-retour eclair). C'est le cas mobile Safari/PWA.
  //  - heartbeat : le battement de coeur a saute >= 15 s => le JS a ete suspendu
  //    (mobile Android / freeze onglet). Universel, sans faux positif desktop.
  // Le brouillon (NG-004 + photos IndexedDB NG-038) restaure la saisie : zero perte.
  const bfcacheFrozen = source === 'bfcache' && hiddenMs > 3000
  const heartbeatFrozen = frozenGap >= FREEZE_GAP_MS
  if (bfcacheFrozen || heartbeatFrozen) {
    reloadOnce(
      bfcacheFrozen
        ? `bfcache:${Math.round(hiddenMs / 1000)}s`
        : `frozen:${Math.round(frozenGap / 1000)}s`,
    )
    return
  }

  // JS vivant mais endormi un moment : refetch cible des requetes montees (sobre).
  if (hiddenMs >= STALE_SOFT_MS) {
    trackAction('app.resume.soft-refresh', { hiddenSec: Math.round(hiddenMs / 1000) })
    queryClient.invalidateQueries().catch(() => {})
  }
}

/**
 * Installe les ecouteurs de reprise. A appeler UNE fois au boot (main.tsx).
 */
export function installResumeRecovery(): void {
  if (typeof window === 'undefined') return

  // Battement de coeur : tant que le JS tourne, lastBeat reste frais. En arriere-
  // plan, le timer est gele -> au retour l'ecart revele le gel (cf. recover()).
  window.setInterval(() => {
    lastBeat = Date.now()
  }, HEARTBEAT_MS)

  const markHidden = (): void => {
    hiddenAt = Date.now()
  }
  // `pagehide` couvre le bfcache (precede le gel), `visibilitychange` le masquage.
  window.addEventListener('pagehide', markHidden)

  // `pageshow` persisted = restauration bfcache = instantane fige. On passe par
  // recover() qui recharge si le heartbeat confirme le gel.
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) recover('bfcache')
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      markHidden()
      return
    }
    recover('visible')
  })
}
