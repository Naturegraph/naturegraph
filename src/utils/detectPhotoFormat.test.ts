/**
 * Tests unit — detectPhotoFormat
 *
 * Couvre uniquement la fonction pure `inferFormat()` car `detectPhotoFormat`
 * et `detectBatchPhotoFormat` dependent de l'API Image/createImageBitmap
 * (a tester en E2E si necessaire).
 *
 * Refs : T-010 (MASTER_TODO) + BATCH 21
 */

import { describe, it, expect } from 'vitest'
import { inferFormat } from './detectPhotoFormat'

describe('inferFormat', () => {
  it('detecte landscape pour ratio >= 1.05', () => {
    expect(inferFormat(1920, 1080)).toBe('landscape') // 16:9
    expect(inferFormat(1200, 800)).toBe('landscape') // 3:2
    expect(inferFormat(105, 100)).toBe('landscape') // pile au seuil
  })

  it('detecte portrait pour ratio <= 0.95', () => {
    expect(inferFormat(1080, 1920)).toBe('portrait') // 9:16
    expect(inferFormat(800, 1200)).toBe('portrait') // 2:3
    expect(inferFormat(95, 100)).toBe('portrait') // pile au seuil
  })

  it('detecte square pour ratio entre 0.95 et 1.05', () => {
    expect(inferFormat(1000, 1000)).toBe('square') // ratio = 1
    expect(inferFormat(1000, 1010)).toBe('square') // ratio ~0.99
    expect(inferFormat(1010, 1000)).toBe('square') // ratio ~1.01
  })

  it('gere height=0 sans throw (garde-fou)', () => {
    expect(inferFormat(1920, 0)).toBe('square')
    expect(inferFormat(0, 0)).toBe('square')
  })

  it('detecte 4:3 comme landscape', () => {
    expect(inferFormat(1024, 768)).toBe('landscape')
  })

  it('detecte 3:4 comme portrait', () => {
    expect(inferFormat(768, 1024)).toBe('portrait')
  })
})
