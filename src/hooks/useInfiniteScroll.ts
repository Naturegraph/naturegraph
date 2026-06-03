/**
 * useInfiniteScroll — Sentinelle IntersectionObserver pour scroll infini
 * =====================================================================
 *
 * V1.1.4 NG-026 (Nicolas 2026-06-03) : hook generique reutilisable pour
 * declencher fetchNextPage quand le sentinel atteint le viewport. Respecte
 * la regle eco-conception CLAUDE.md (IntersectionObserver, pas de scroll
 * listener qui s'execute en continu).
 *
 * Usage type :
 *   const { sentinelRef } = useInfiniteScroll({
 *     hasNextPage,
 *     isFetchingNextPage,
 *     fetchNextPage,
 *     rootMargin: '600px', // declenche le fetch 600px avant le bas
 *   })
 *   return (
 *     <>
 *       {pages.map(...)}
 *       <div ref={sentinelRef} aria-hidden />
 *     </>
 *   )
 *
 * Garde-fous :
 *   - Ne re-trigger pas pendant un fetch en cours (isFetchingNextPage)
 *   - Se desabonne au demontage (cleanup)
 *   - rootMargin permet de prefetch avant que l'user n'atteigne le bas
 *     (UX fluide, pas de flicker)
 */

import { useEffect, useRef } from 'react'

export interface UseInfiniteScrollOptions {
  /** True si une page suivante existe (cf React Query useInfiniteQuery). */
  hasNextPage: boolean
  /** True pendant le fetch de la page suivante. Empeche le re-trigger. */
  isFetchingNextPage: boolean
  /** Callback a appeler pour charger la page suivante. */
  fetchNextPage: () => void
  /**
   * Distance du bord du viewport a laquelle on commence a prefetch.
   * Defaut 600px : assez pour absorber un fetch lent (mobile 3G/4G).
   */
  rootMargin?: string
  /**
   * Element racine pour l'observer (defaut : viewport navigateur).
   * Utile si le scroll est dans un container avec overflow.
   */
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
  rootMargin = '600px',
  root = null,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  // On stocke la node dans un ref callback (pattern callback ref) pour
  // pouvoir reagir aux changements de DOM et re-observer si necessaire.
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null)

  // Effet : (re)cree l'observer quand les flags d'etat changent.
  // L'observer se ré-attache au sentinel courant.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    // Nettoie l'ancien observer si existant.
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        root,
        rootMargin,
        threshold: 0,
      },
    )

    if (sentinelNodeRef.current) {
      observer.observe(sentinelNodeRef.current)
    }
    observerRef.current = observer

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, root])

  // Callback ref : appelee a chaque changement du node DOM. On (re)observe
  // si on a deja un observer et un nouveau node.
  const sentinelRef = (node: HTMLDivElement | null) => {
    sentinelNodeRef.current = node
    if (node && observerRef.current) {
      observerRef.current.observe(node)
    }
  }

  return { sentinelRef }
}
