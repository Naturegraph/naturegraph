/**
 * AppLoader, loader officiel Naturegraph (NG-013 V1.1.4)
 *
 * Composant centralise pour les longs chargements (boot PWA, hydratation
 * session, fetch de donnees critiques). Utilise l animation webm fournie
 * par Nicolas (app-loading.webm, 36 KB).
 *
 * Fallback :
 * 1. Video webm si le navigateur la supporte (Chrome / Firefox / Edge)
 * 2. Spinner CSS classique sinon (Safari < 16, vieux Android)
 *
 * Respecte prefers-reduced-motion : si l user a desactive les animations,
 * affiche un spinner statique (ou rien) pour eviter la nausee.
 *
 * Usage :
 *   <AppLoader />                // plein ecran centre
 *   <AppLoader size="sm" />      // version compacte inline
 *   <AppLoader inline />         // sans wrapper plein ecran
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from './Spinner'
import loadingVideo from '@/assets/branding/app-loading.webm'

type AppLoaderSize = 'sm' | 'md' | 'lg'

interface AppLoaderProps {
  /** Taille de la zone d animation. md par defaut. */
  size?: AppLoaderSize
  /** Si true, pas de wrapper centre plein ecran. Pour usage inline. */
  inline?: boolean
  /** Label accessible (sr-only). */
  label?: string
  /**
   * V1.1.4 QA round 9 (Nicolas 2026-06-02) : si true, la video / spinner
   * remplit son container parent (w-full h-full). Permet au BootSplash
   * mobile d afficher le webm en grand presque pleine largeur.
   */
  fullSize?: boolean
}

const sizeClasses: Record<AppLoaderSize, string> = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
}

/**
 * Detecte une seule fois si le navigateur peut lire le webm.
 * Cache le resultat pour eviter les recalculs.
 */
let canPlayWebmCache: boolean | null = null
function canPlayWebm(): boolean {
  if (canPlayWebmCache !== null) return canPlayWebmCache
  if (typeof document === 'undefined') return false
  const video = document.createElement('video')
  const result = video.canPlayType('video/webm; codecs="vp9"') !== ''
  canPlayWebmCache = result
  return result
}

/**
 * Detecte prefers-reduced-motion (mediaQuery + listener react au runtime).
 */
function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    function onChange(e: MediaQueryListEvent) {
      setPrefers(e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return prefers
}

export function AppLoader({
  size = 'md',
  inline = false,
  label,
  fullSize = false,
}: AppLoaderProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const accessibleLabel = label ?? t('common.loading', { defaultValue: 'Chargement' })

  // Si reduced-motion ou pas de support webm : spinner CSS de secours
  const useFallback = prefersReducedMotion || !canPlayWebm()

  // V1.1.4 QA round 9 : si fullSize, on prend toute la place du parent
  const videoClass = fullSize ? 'w-full h-full object-contain' : `${sizeClasses[size]} object-contain`

  const content = useFallback ? (
    <Spinner size={fullSize || size === 'lg' ? 'lg' : size} label={accessibleLabel} />
  ) : (
    <video
      ref={videoRef}
      className={videoClass}
      src={loadingVideo}
      autoPlay
      loop
      muted
      playsInline
      // Pas d aria-label sur video, on utilise sr-only en parallele
      aria-hidden="true"
    />
  )

  if (inline) {
    return (
      <span className="inline-flex items-center justify-center" role="status" aria-label={accessibleLabel}>
        {content}
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    )
  }

  return (
    <div
      className="flex items-center justify-center w-full min-h-[40vh]"
      role="status"
      aria-label={accessibleLabel}
    >
      {content}
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  )
}
