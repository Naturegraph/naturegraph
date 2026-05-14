/**
 * useEscapeKey — Listener clavier pour la touche Escape (fermeture modal/panel)
 *
 * Refs : audit Phase 3 (BATCH 41) — pattern duplique dans 22 composants
 * (modals, panels, popovers, menus contextuels).
 *
 * Comportement :
 *   - Listener `keydown` sur document
 *   - Si la touche Escape est pressee, appelle `handler`
 *   - Cleanup automatique au unmount
 *   - Peut etre desactive via `enabled = false` (utile pour modal multi-niveaux)
 *
 * Usage :
 *   ```ts
 *   function MyModal({ onClose }: { onClose: () => void }) {
 *     useEscapeKey(onClose)
 *     // ou avec enabled conditionnel :
 *     useEscapeKey(onClose, { enabled: !nestedModalOpen })
 *   }
 *   ```
 */

import { useEffect } from 'react'

export interface UseEscapeKeyOptions {
  /** Active ou desactive le listener (defaut: true). */
  enabled?: boolean
}

export function useEscapeKey(handler: () => void, options: UseEscapeKeyOptions = {}): void {
  const { enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handler()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, handler])
}
