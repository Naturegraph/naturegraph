/**
 * Tests unit — badgeHelpers
 *
 * Couvre `getBadgeEmoji` (lookup par ID ou texte FR + fallback plants).
 *
 * Refs : T-010 (MASTER_TODO) + BATCH 21
 */

import { describe, it, expect } from 'vitest'
import {
  getBadgeEmoji,
  CATEGORY_EMOJIS,
  WEATHER_EMOJIS,
  FRENCH_TO_CATEGORY_ID,
} from './badgeHelpers'

describe('getBadgeEmoji', () => {
  it('retourne l emoji pour un ID de categorie valide', () => {
    expect(getBadgeEmoji('birds')).toBe('🦉')
    expect(getBadgeEmoji('mammals')).toBe('🐿️')
    expect(getBadgeEmoji('insects')).toBe('🐝')
    expect(getBadgeEmoji('plants')).toBe('🌿')
  })

  it('retourne l emoji pour un texte francais valide', () => {
    expect(getBadgeEmoji('Oiseaux')).toBe('🦉')
    expect(getBadgeEmoji('Mammifères')).toBe('🐿️')
    expect(getBadgeEmoji('Insectes')).toBe('🐝')
  })

  it('retourne le fallback plants pour un input inconnu', () => {
    expect(getBadgeEmoji('unknown')).toBe('🌿')
    expect(getBadgeEmoji('')).toBe('🌿')
    expect(getBadgeEmoji('Inconnu')).toBe('🌿')
  })

  it('respecte la casse stricte du francais', () => {
    // 'oiseaux' (minuscule) n'est pas dans le map → fallback
    expect(getBadgeEmoji('oiseaux')).toBe('🌿')
    expect(getBadgeEmoji('OISEAUX')).toBe('🌿')
  })
})

describe('CATEGORY_EMOJIS', () => {
  it('a 9 categories', () => {
    expect(Object.keys(CATEGORY_EMOJIS)).toHaveLength(9)
  })

  it('toutes les categories ont un emoji non-vide', () => {
    for (const [key, value] of Object.entries(CATEGORY_EMOJIS)) {
      expect(value.length).toBeGreaterThan(0)
      expect(key.length).toBeGreaterThan(0)
    }
  })
})

describe('WEATHER_EMOJIS', () => {
  it('a 5 conditions meteo', () => {
    expect(Object.keys(WEATHER_EMOJIS)).toHaveLength(5)
  })

  it('contient sunny/cloudy/rainy/windy/snowy', () => {
    expect(WEATHER_EMOJIS).toHaveProperty('sunny')
    expect(WEATHER_EMOJIS).toHaveProperty('cloudy')
    expect(WEATHER_EMOJIS).toHaveProperty('rainy')
    expect(WEATHER_EMOJIS).toHaveProperty('windy')
    expect(WEATHER_EMOJIS).toHaveProperty('snowy')
  })
})

describe('FRENCH_TO_CATEGORY_ID', () => {
  it('mappe toutes les 9 categories CATEGORY_EMOJIS', () => {
    const mappedIds = new Set(Object.values(FRENCH_TO_CATEGORY_ID))
    for (const key of Object.keys(CATEGORY_EMOJIS)) {
      expect(mappedIds.has(key as keyof typeof CATEGORY_EMOJIS)).toBe(true)
    }
  })
})
