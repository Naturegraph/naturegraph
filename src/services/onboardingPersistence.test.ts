/**
 * Tests unitaires : mapping fréquence onboarding -> notif_frequency / weekly_goal
 *
 * Couvre la table de correspondance officielle NG-045 (brief fondateur) :
 *   daily        -> realtime / 7
 *   weekly       -> daily    / 3
 *   monthly      -> weekly   / 1
 *   occasionally -> realtime / 1
 */

import { describe, it, expect } from 'vitest'
import {
  mapFrequencyOptionToNotifFrequency,
  mapFrequencyOptionToWeeklyGoal,
  type FrequencyOption,
} from './onboardingPersistence'

describe('mapFrequencyOptionToNotifFrequency', () => {
  const cases: Array<[FrequencyOption, string]> = [
    ['daily', 'realtime'],
    ['weekly', 'daily'],
    ['monthly', 'weekly'],
    ['occasionally', 'realtime'],
  ]

  it.each(cases)('%s -> %s', (option, expected) => {
    expect(mapFrequencyOptionToNotifFrequency(option)).toBe(expected)
  })
})

describe('mapFrequencyOptionToWeeklyGoal', () => {
  const cases: Array<[FrequencyOption, number]> = [
    ['daily', 7],
    ['weekly', 3],
    ['monthly', 1],
    ['occasionally', 1],
  ]

  it.each(cases)('%s -> %i', (option, expected) => {
    expect(mapFrequencyOptionToWeeklyGoal(option)).toBe(expected)
  })
})
