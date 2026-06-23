/**
 * Tests : useAppBadge (pastille icône PWA via Badging API)
 *
 * Couvre :
 *   - No-op gracieux quand l'API est absente (cas navigateur non installé)
 *   - setAppBadge(count) quand count > 0
 *   - clearAppBadge() quand count = 0
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppBadge } from './useAppBadge'

type BadgingNav = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'setAppBadge')
  Reflect.deleteProperty(navigator, 'clearAppBadge')
})

describe('useAppBadge', () => {
  it('no-op (ne jette pas) si la Badging API est absente', () => {
    // jsdom n'implémente pas setAppBadge -> le hook doit être un no-op gracieux.
    expect(() => renderHook(() => useAppBadge(3))).not.toThrow()
  })

  it('appelle setAppBadge avec le compteur quand > 0', () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined)
    ;(navigator as BadgingNav).setAppBadge = setAppBadge
    renderHook(() => useAppBadge(5))
    expect(setAppBadge).toHaveBeenCalledWith(5)
  })

  it('efface la pastille quand le compteur = 0', () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined)
    const clearAppBadge = vi.fn().mockResolvedValue(undefined)
    ;(navigator as BadgingNav).setAppBadge = setAppBadge
    ;(navigator as BadgingNav).clearAppBadge = clearAppBadge
    renderHook(() => useAppBadge(0))
    expect(clearAppBadge).toHaveBeenCalled()
    expect(setAppBadge).not.toHaveBeenCalled()
  })
})
