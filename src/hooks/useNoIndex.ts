/**
 * useNoIndex : injecte `<meta name="robots" content="noindex, nofollow">` tant que
 * la page est montee, puis le retire au unmount.
 *
 * Pour les pages d'erreur (404, 403, 500) : on ne veut pas que Google indexe ces
 * ecrans. Meme philosophie que usePageTitle : aucune dependance JS (eco-conception),
 * juste une manipulation ciblee du `document.head`.
 *
 * Refs : NG-021 (pages d'erreur).
 */

import { useEffect } from 'react'

export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      meta.remove()
    }
  }, [])
}
