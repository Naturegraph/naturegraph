/**
 * useScrollReveal — Hook CSS-only pour animations au scroll
 * =========================================================
 * Utilise IntersectionObserver (natif, performant) pour déclencher
 * des animations CSS au défilement. Respecte prefers-reduced-motion
 * pour l'accessibilité WCAG AA.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })
 *   return <div ref={ref} className={isVisible ? 'reveal' : ''}>...</div>
 * }
 * ```
 */

import { useEffect, useRef, useState, useMemo } from 'react'

interface UseScrollRevealOptions {
  /** Pourcentage de visibilité avant déclenchement (0 à 1) */
  threshold?: number
  /** Ne déclencher qu'une seule fois (par défaut true pour éco-conception) */
  triggerOnce?: boolean
  /** Marge autour du viewport pour déclencher plus tôt/tard */
  rootMargin?: string
}

interface UseScrollRevealReturn {
  /** Ref à attacher à l'élément cible */
  ref: React.RefObject<HTMLElement | null>
  /** true quand l'élément est visible dans le viewport */
  isVisible: boolean
}

export function useScrollReveal({
  threshold = 0.1,
  triggerOnce = true,
  rootMargin = '0px 0px -80px 0px',
}: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const ref = useRef<HTMLElement | null>(null)

  // Vérifier prefers-reduced-motion en dehors de l'effect
  // pour éviter un setState synchrone dans useEffect
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
    [],
  )

  const [isVisible, setIsVisible] = useState(prefersReducedMotion)

  useEffect(() => {
    // Si reduced motion, déjà visible via le state initial
    if (prefersReducedMotion) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Si triggerOnce, on déconnecte après le premier affichage
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, triggerOnce, rootMargin])

  return { ref, isVisible }
}
