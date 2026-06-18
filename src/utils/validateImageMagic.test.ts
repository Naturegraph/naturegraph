/**
 * Tests unit : validateImageMagicNumber
 *
 * Refs : T-062 + T-010 (MASTER_TODO) + BATCH 24
 */

import { describe, it, expect } from 'vitest'
import { validateImageMagicNumber } from './validateImageMagic'

/** Helper : cree un File avec un magic number specifie + un MIME. */
function makeFile(bytes: number[], mime: string, name = 'test'): File {
  return new File([new Uint8Array(bytes)], name, { type: mime })
}

describe('validateImageMagicNumber', () => {
  it('valide un JPEG legitime (magic FF D8 FF + MIME image/jpeg)', async () => {
    const file = makeFile([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', 'a.jpg')
    expect(await validateImageMagicNumber(file)).toBe('image/jpeg')
  })

  it('valide un PNG legitime (magic 89 50 4E 47 0D 0A 1A 0A + MIME image/png)', async () => {
    const file = makeFile(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
      'image/png',
      'a.png',
    )
    expect(await validateImageMagicNumber(file)).toBe('image/png')
  })

  it('valide un WebP legitime (RIFF...WEBP)', async () => {
    const file = makeFile(
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      'image/webp',
      'a.webp',
    )
    expect(await validateImageMagicNumber(file)).toBe('image/webp')
  })

  it('rejette un fichier .exe renomme en .jpg (MIME spoofe)', async () => {
    // MZ header = 4D 5A (Windows PE executable)
    const file = makeFile([0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', 'malicious.jpg')
    expect(await validateImageMagicNumber(file)).toBe(null)
  })

  it('rejette un JPEG dont le MIME ne matche pas (cas suspect)', async () => {
    // Magic JPEG mais declare image/png → mismatch suspect
    const file = makeFile([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/png', 'a.png')
    expect(await validateImageMagicNumber(file)).toBe(null)
  })

  it('rejette un GIF (pas dans whitelist MVP)', async () => {
    // GIF87a = 47 49 46 38 37 61
    const file = makeFile(
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0],
      'image/gif',
      'a.gif',
    )
    expect(await validateImageMagicNumber(file)).toBe(null)
  })

  it('rejette un fichier vide', async () => {
    const file = makeFile([], 'image/jpeg', 'empty.jpg')
    expect(await validateImageMagicNumber(file)).toBe(null)
  })
})
