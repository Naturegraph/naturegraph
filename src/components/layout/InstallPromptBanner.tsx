/**
 * InstallPromptBanner : Proposer l'installation de Naturegraph en PWA
 *
 * Affiche une petite bannière en haut de l'écran qui invite l'utilisateur à
 * « ajouter Naturegraph à son écran d'accueil » comme une app native.
 *
 * Deux cas selon le navigateur :
 *
 * 1. Chrome / Edge / Brave (Android et desktop) : supporte l'API
 *    `beforeinstallprompt` :
 *      - L'event est capturé au mount.
 *      - Cliquer sur « Installer » appelle `event.prompt()` qui déclenche le
 *        dialog d'installation natif du navigateur.
 *      - Réponse user (accepté / refusé) loggée dans console pour analytics.
 *
 * 2. Safari iOS : n'expose PAS `beforeinstallprompt`. Le seul moyen
 *    d'installer une PWA est manuel :
 *      Partager → « Sur l'écran d'accueil ».
 *    On affiche donc une mini explication illustrée plutôt qu'un bouton qui
 *    ne ferait rien.
 *
 * Comportement dismissal :
 *   - Le banner ne réapparaît PAS dans la session courante après dismiss.
 *   - Stocké en localStorage avec TTL 30 jours : passé ce délai on re-tente
 *     une fois (l'utilisateur a peut-être changé d'avis).
 *   - Détecte si l'app tourne déjà en mode standalone (déjà installée) → ne
 *     s'affiche pas dans ce cas.
 *
 * Accessibilité :
 *   - `role="region"` + `aria-label` pour les lecteurs d'écran.
 *   - Bouton « Plus tard » dismiss + bouton « Installer » action principale.
 *   - Touch target 44 px (WCAG 2.5.5).
 *
 * Performance :
 *   - Tout en CSS pur, pas d'animation lourde (slide-in CSS keyframe).
 *   - 0 dépendance externe.
 */

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const DISMISS_KEY = 'naturegraph-install-prompt-dismissed-at'
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

/**
 * Event Chrome `beforeinstallprompt` : typé manuellement car non standardisé
 * dans lib.dom.d.ts. Le browser le fournit avec `prompt()` et `userChoice`.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** Détecte iOS Safari (UA Apple non-Chrome + non-CriOS). */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIos && isSafari
}

/** Détecte si la PWA est déjà installée (mode standalone). */
function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari expose `navigator.standalone` quand l'app est installée
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

/** Lit le timestamp de dismiss en localStorage, retourne true si < TTL. */
function isRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number.parseInt(raw, 10)
    if (Number.isNaN(ts)) return false
    return Date.now() - ts < DISMISS_TTL_MS
  } catch {
    return false
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* private mode iOS : pas grave, ré-affichage au prochain visit */
  }
}

export function InstallPromptBanner() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  // Lazy initializer : on calcule la valeur UNE fois au mount via la fonction
  // passée à useState, plutôt que d'appeler setState synchronement depuis un
  // useEffect (lint react-hooks/set-state-in-effect). Le résultat est stable
  // pour toute la durée de vie du composant.
  const [isIos] = useState(() => isIosSafari())

  useEffect(() => {
    // Court-circuits : déjà installée ou déjà refusée récemment
    if (isAlreadyInstalled() || isRecentlyDismissed()) return

    // iOS Safari : pas d'event beforeinstallprompt, on montre le guide manuel
    if (isIos) {
      // Délai pour ne pas être agressif dès la 1ʳᵉ seconde : laisse la
      // première impression au contenu, propose l'installation après 3 s.
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // Chrome / Edge / Brave : intercepter beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Petit délai pour laisser le contenu s'afficher avant la bannière.
      setTimeout(() => setShowBanner(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIos])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[PWA install]', choice.outcome)
    }
    setDeferredPrompt(null)
    setShowBanner(false)
    if (choice.outcome === 'dismissed') {
      markDismissed()
    }
  }

  function handleDismiss() {
    setShowBanner(false)
    markDismissed()
  }

  if (!showBanner) return null

  return (
    <div
      role="region"
      aria-label={t('pwa.installRegion', { defaultValue: 'Installer Naturegraph' })}
      className="fixed top-0 inset-x-0 z-[55] bg-primary text-primary-foreground shadow-md motion-safe:animate-slide-in-top"
    >
      <div className="max-w-screen-md mx-auto flex items-center gap-3 px-4 py-3">
        {/* Icône hermine ou téléchargement selon plateforme */}
        <div
          className="shrink-0 size-10 rounded-full bg-primary-foreground/15 flex items-center justify-center"
          aria-hidden="true"
        >
          {isIos ? <Share className="size-5" /> : <Download className="size-5" />}
        </div>

        {/* Texte + bouton action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">
            {t('pwa.installTitle', { defaultValue: 'Installe Naturegraph sur ton appareil' })}
          </p>
          {isIos ? (
            <p className="text-xs leading-snug mt-0.5 opacity-90">
              {t('pwa.installIosHint', {
                defaultValue: "Appuie sur Partager puis « Sur l'écran d'accueil ».",
              })}
            </p>
          ) : (
            <p className="text-xs leading-snug mt-0.5 opacity-90">
              {t('pwa.installHint', {
                defaultValue: 'Accède plus vite à tes observations, comme une vraie app.',
              })}
            </p>
          )}
        </div>

        {/* Action principale : uniquement pour Chrome/Edge (iOS = guide manuel) */}
        {!isIos && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 h-9 px-4 rounded-full bg-primary-foreground text-[var(--color-link)] text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {t('pwa.installCta', { defaultValue: 'Installer' })}
          </button>
        )}

        {/* Bouton dismiss : toujours présent */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('common.dismiss', { defaultValue: 'Fermer' })}
          className="shrink-0 size-9 rounded-full flex items-center justify-center hover:bg-primary-foreground/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
