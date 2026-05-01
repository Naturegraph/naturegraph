/**
 * Tests unitaires — notificationPreferencesService
 *
 * On ne teste pas l'intégration Supabase ici (cf. tests E2E Playwright),
 * seulement le helper `defaultEnabled` qui encode la règle RGPD.
 */

import { describe, it, expect } from 'vitest'
import { defaultEnabled } from './notificationPreferencesService'

describe('defaultEnabled', () => {
  it('species_digest est opt-in (FALSE par défaut) — RGPD', () => {
    expect(defaultEnabled('species_digest')).toBe(false)
  })

  it.each([
    'reaction',
    'follow',
    'post',
    'comment',
    'mention',
    'identification',
    'system',
  ] as const)('%s est TRUE par défaut', (type) => {
    expect(defaultEnabled(type)).toBe(true)
  })
})
