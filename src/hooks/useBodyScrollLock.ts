/**
 * useBodyScrollLock — Verrouille le scroll du body pendant qu'un modal/panel est ouvert
 *
 * Refs : audit Phase 3 (BATCH 41) — pattern duplique dans 11 composants
 * (SettingsPanel, EditProfilePanel, ContributeEncounterForm, ShareProfileSheet,
 *  OnboardingExitModal, ReportModal, ForYouDiscoveryModal, LocationPermissionModal,
 *  SharePopover, etc.)
 *
 * Comportement :
 *   - Quand `locked === true` : ajoute `overflow: hidden` sur body
 *   - Quand `locked === false` ou unmount : restaure le scroll
 *   - Conserve le style original du body (au cas ou un autre code l'ait modifie)
 *
 * Usage :
 *   ```ts
 *   function MyModal({ isOpen }: { isOpen: boolean }) {
 *     useBodyScrollLock(isOpen)
 *     // ...
 *   }
 *   ```
 */

import { useEffect } from 'react'

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [locked])
}
