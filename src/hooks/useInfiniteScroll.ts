/**
 * useInfiniteScroll — Sentinelle IntersectionObserver pour scroll infini
 * =====================================================================
 *
 * V1.1.4 NG-026 (Nicolas 2026-06-03) : hook generique reutilisable pour
 * declencher fetchNextPage quand le sentinel atteint le viewport. Respecte
 * la regle eco-conception CLAUDE.md (IntersectionObserver, pas de scroll
 * listener qui s'execute en continu).
 *
 * V1.1.4 round 12 fix (Nicolas 2026-06-03) : refonte pour corriger le bug
 * "loader en boucle". L'ancienne version recreait l'observer a chaque render
 * (fetchNextPage instable en dependance) et pouvait soit boucler, soit ne
 * jamais re-declencher. Nouvelle approche :
 *   - L'observer est cree UNE fois sur le node (callback ref).
 *   - Le callback lit les valeurs fraiches via une ref (pas de stale closure).
 *   - Un effet re-verifie l'intersection apres chaque fin de fetch : si le
 *     sentinel est encore visible et qu'il reste des pages, on enchaine.
 *     C'est ce qui permet de charger plusieurs pages quand le contenu tient
 *     dans le viewport, sans boucle infinie (borne par hasNextPage).
 *
 * Usage type :
 *   const { sentinelRef } = useInfiniteScroll({
 *     hasNextPage, isFetchingNextPage, fetchNextPage,
 *   })
 *   {hasNextPage && <div ref={sentinelRef} aria-hidden />}
 */

import { useCallback, useEffect, useRef } from 'react'

export interface UseInfiniteScrollOptions {
  /** True si une page suivante existe (cf React Query useInfiniteQuery). */
  hasNextPage: boolean
  /** True pendant le fetch de la page suivante. Empeche le re-trigger. */
  isFetchingNextPage: boolean
  /** Callback a appeler pour charger la page suivante. */
  fetchNextPage: () => void | Promise<unknown>
  /**
   * Distance du bord du viewport a laquelle on commence a prefetch.
   * Defaut 400px : assez pour absorber un fetch lent sans charger trop
   * de pages d'un coup (300KB budget eco-conception).
   */
  rootMargin?: string
  /** Element racine pour l'observer (defaut : viewport navigateur). */
  root?: Element | null
}

export interface UseInfiniteScrollResult {
  /** Ref a poser sur le div sentinelle (en bas de la liste). */
  sentinelRef: (node: HTMLDivElement | null) => void
}

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '400px',
  root = null,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  // Ref qui contient toujours les valeurs fraiches. Le callback de
  // l'observer la lit, ce qui evite de recreer l'observer a chaque render
  // et evite les stale closures. Mise a jour via effet (jamais pendant le
  // render : interdit par le React Compiler).
  const stateRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage })
  useEffect(() => {
    stateRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage }
  })

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null)

  /** Declenche le fetch si les conditions sont reunies (lecture fraiche). */
  const maybeFetch = useCallback(() => {
    const s = stateRef.current
    if (s.hasNextPage && !s.isFetchingNextPage) {
      void s.fetchNextPage()
    }
  }, [])

  // Callback ref : cree l'observer une seule fois quand le node est monte.
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelNodeRef.current = node
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node || typeof IntersectionObserver === 'undefined') return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) maybeFetch()
        },
        { root, rootMargin, threshold: 0 },
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [maybeFetch, root, rootMargin],
  )

  // Apres chaque fin de fetch (isFetchingNextPage : true -> false), si le
  // sentinel est toujours dans le viewport et qu'il reste des pages, on
  // enchaine. Indispensable quand tout le contenu charge tient dans le
  // viewport (sinon l'observer ne re-fire pas faute de changement
  // d'intersection). Borne par hasNextPage donc pas de boucle infinie.
  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage) return
    const node = sentinelNodeRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const viewportH = window.innerHeight || document.documentElement.clientHeight
    // Marge identique a rootMargin (400px) pour coherence du prefetch.
    if (rect.top <= viewportH + 400) {
      maybeFetch()
    }
  }, [isFetchingNextPage, hasNextPage, maybeFetch])

  // Cleanup au demontage.
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  return { sentinelRef }
}
