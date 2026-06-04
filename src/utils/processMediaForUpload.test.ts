/**
 * Tests unitaires processMediaForUpload
 * ======================================
 *
 * Couvre :
 *  - isProcessMediaError (type guard)
 *  - Detection des erreurs structurees (codes + messages)
 *  - Validation cap entree
 *  - Validation format RAW (extension)
 *  - Validation format inconnu
 *
 * Limites : on ne peut pas tester le pipeline canvas complet en jsdom
 * (pas de canvas vrai, pas de createImageBitmap, pas de heic2any decode).
 * Les cas end-to-end sont valides en QA manuelle (cf MEDIA_QA_MATRIX.md).
 */

import { describe, it, expect } from 'vitest'
import {
  processMediaForUpload,
  isProcessMediaError,
  type ProcessMediaError,
  type ProcessMediaResult,
} from './processMediaForUpload'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Cree un File factice de taille N (sans contenu valide). */
function makeFile(name: string, type: string, sizeBytes: number): File {
  const data = new Uint8Array(sizeBytes)
  return new File([data], name, { type })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('isProcessMediaError', () => {
  it('returns true for error objects with code + message', () => {
    const err: ProcessMediaError = {
      code: 'too_large',
      message: 'test',
    }
    expect(isProcessMediaError(err)).toBe(true)
  })

  it('returns false for valid result objects', () => {
    const result = {
      file: new File([], 'test.jpg', { type: 'image/jpeg' }),
      originalDimensions: { width: 100, height: 100 },
      finalDimensions: { width: 100, height: 100 },
      quality: 0.85,
      exifOrientation: 1,
      outputMime: 'image/jpeg' as const,
    } satisfies ProcessMediaResult
    expect(isProcessMediaError(result)).toBe(false)
  })
})

describe('processMediaForUpload — validation entree', () => {
  it('rejette les fichiers > 40 Mo avec code too_large + message clair', async () => {
    // 41 Mo
    const huge = makeFile('huge.jpg', 'image/jpeg', 41 * 1024 * 1024)
    const result = await processMediaForUpload(huge)

    expect(isProcessMediaError(result)).toBe(true)
    if (isProcessMediaError(result)) {
      expect(result.code).toBe('too_large')
      expect(result.message).toContain('volumineuse')
      expect(result.message).toContain('40')
    }
  })

  it('rejette les fichiers RAW par extension avec message specifique au format', async () => {
    const cases = [
      { ext: 'CR2', name: 'photo.cr2' },
      { ext: 'CR3', name: 'photo.cr3' },
      { ext: 'NEF', name: 'photo.NEF' },
      { ext: 'ARW', name: 'photo.arw' },
      { ext: 'RAF', name: 'photo.raf' },
      { ext: 'DNG', name: 'photo.dng' },
      { ext: 'ORF', name: 'photo.orf' },
    ]
    for (const { ext, name } of cases) {
      const f = makeFile(name, 'application/octet-stream', 1024)
      const result = await processMediaForUpload(f)
      expect(isProcessMediaError(result)).toBe(true)
      if (isProcessMediaError(result)) {
        expect(result.code).toBe('unsupported_format')
        expect(result.message).toContain(ext)
        expect(result.message).toContain('JPEG')
      }
    }
  })

  it('rejette les formats non reconnus avec message clair', async () => {
    const tiff = makeFile('photo.tiff', 'image/tiff', 1024)
    const result = await processMediaForUpload(tiff)

    expect(isProcessMediaError(result)).toBe(true)
    if (isProcessMediaError(result)) {
      expect(result.code).toBe('unsupported_format')
      expect(result.message).toContain('image/tiff')
    }
  })

  it('rejette les GIF avec message clair', async () => {
    // GIF magic bytes : 47 49 46 38 39 61 (GIF89a)
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    const gif = new File([gifBytes], 'animated.gif', { type: 'image/gif' })
    const result = await processMediaForUpload(gif)

    expect(isProcessMediaError(result)).toBe(true)
    if (isProcessMediaError(result)) {
      expect(result.code).toBe('unsupported_format')
    }
  })
})

describe('processMediaForUpload — messages user-friendly', () => {
  it('le message too_large inclut la taille reelle en Mo', async () => {
    // 42.5 Mo
    const huge = makeFile('photo.jpg', 'image/jpeg', Math.round(42.5 * 1024 * 1024))
    const result = await processMediaForUpload(huge)
    if (isProcessMediaError(result)) {
      // doit contenir une valeur proche de 42.5
      expect(result.message).toMatch(/4[0-9](\.[0-9])? Mo/)
    }
  })

  it('le message RAW utilise le format detecte (case insensitive normalisee)', async () => {
    const f = makeFile('IMG_1234.CR2', 'application/octet-stream', 1024)
    const result = await processMediaForUpload(f)
    if (isProcessMediaError(result)) {
      expect(result.message).toContain('CR2')
      expect(result.message).not.toContain('cr2')
    }
  })
})
