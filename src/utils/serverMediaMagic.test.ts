/**
 * Test unitaire de la detection magic-bytes serveur (NG-001).
 *
 * La logique testee vit dans supabase/functions/validate-media/mediaMagic.ts
 * (module pur importe aussi par l'Edge Function validate-media). On la teste ici, cote
 * vitest, de facon deterministe et hors prod : c'est la garantie que le coeur
 * de securite du ticket (detecter un format spoofe) est correct avant tout
 * deploiement.
 */

import { describe, it, expect } from 'vitest'
import { detectFormat, parseStorageUrl } from '../../supabase/functions/validate-media/mediaMagic'

/** Construit un Uint8Array a partir d'octets, complete a 16 par des zeros. */
function bytes(...vals: number[]): Uint8Array {
  const arr = new Uint8Array(16)
  vals.forEach((v, i) => (arr[i] = v))
  return arr
}

/** Encode 4 caracteres ASCII en octets (pour les brands ftyp). */
function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0))
}

/** Conteneur ISOBMFF : header ftyp + brand a l'offset 8. */
function ftyp(brand: string): Uint8Array {
  return bytes(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, ...ascii(brand))
}

describe('detectFormat : formats autorises par le bucket post-media', () => {
  it('JPEG (FF D8 FF) -> valid', () => {
    expect(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({
      kind: 'valid',
      detected: 'image/jpeg',
    })
  })

  it('PNG (89 50 4E 47 0D 0A 1A 0A) -> valid', () => {
    expect(detectFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      kind: 'valid',
      detected: 'image/png',
    })
  })

  it('WebP (RIFF....WEBP) -> valid', () => {
    const webp = bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50)
    expect(detectFormat(webp)).toEqual({ kind: 'valid', detected: 'image/webp' })
  })

  it('MP4 (ftyp isom) -> valid video/mp4', () => {
    expect(detectFormat(ftyp('isom'))).toEqual({ kind: 'valid', detected: 'video/mp4' })
  })

  it('MP4 (ftyp mp42) -> valid video/mp4', () => {
    expect(detectFormat(ftyp('mp42'))).toEqual({ kind: 'valid', detected: 'video/mp4' })
  })
})

describe('detectFormat : formats interdits (suppression attendue)', () => {
  it('TIFF little-endian (II*\\0) -> invalid, coeur de NG-001', () => {
    expect(detectFormat(bytes(0x49, 0x49, 0x2a, 0x00))).toEqual({
      kind: 'invalid',
      detected: 'image/tiff',
    })
  })

  it('TIFF big-endian (MM\\0*) -> invalid', () => {
    expect(detectFormat(bytes(0x4d, 0x4d, 0x00, 0x2a))).toEqual({
      kind: 'invalid',
      detected: 'image/tiff',
    })
  })

  it('GIF (GIF8) -> invalid', () => {
    expect(detectFormat(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toEqual({
      kind: 'invalid',
      detected: 'image/gif',
    })
  })

  it('BMP (BM) -> invalid', () => {
    expect(detectFormat(bytes(0x42, 0x4d))).toEqual({ kind: 'invalid', detected: 'image/bmp' })
  })

  it('HEIC (ftyp heic) -> invalid (interdit pour post-media)', () => {
    expect(detectFormat(ftyp('heic'))).toEqual({ kind: 'invalid', detected: 'image/heic' })
  })

  it('AVIF (ftyp avif) -> invalid', () => {
    expect(detectFormat(ftyp('avif'))).toEqual({ kind: 'invalid', detected: 'image/avif' })
  })
})

describe('detectFormat : fail-open sur incertitude', () => {
  it('octets aleatoires non reconnus -> unknown (fichier conserve)', () => {
    expect(detectFormat(bytes(0x00, 0x01, 0x02, 0x03, 0x04))).toEqual({
      kind: 'unknown',
      detected: 'unknown',
    })
  })

  it('ftyp avec brand inconnu -> unknown (pas de suppression sur doute)', () => {
    expect(detectFormat(ftyp('zzzz'))).toEqual({ kind: 'unknown', detected: 'unknown' })
  })

  it('buffer vide -> unknown', () => {
    expect(detectFormat(new Uint8Array(0))).toEqual({ kind: 'unknown', detected: 'unknown' })
  })
})

describe("detectFormat : scenario d'attaque NG-001", () => {
  it('un TIFF avec un Content-Type image/jpeg menteur reste detecte TIFF', () => {
    // Le Content-Type declare (image/jpeg) n'a aucune influence : on ne lit que
    // les octets reels. Un vrai TIFF est donc toujours rejete, meme deguise.
    const spoofedTiff = bytes(0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00)
    expect(detectFormat(spoofedTiff).kind).toBe('invalid')
  })
})

describe('parseStorageUrl', () => {
  it('URL publique post-media -> bucket + path', () => {
    const url =
      'https://ref.supabase.co/storage/v1/object/public/post-media/user-id/post-id/file.webp'
    expect(parseStorageUrl(url)).toEqual({
      bucket: 'post-media',
      path: 'user-id/post-id/file.webp',
    })
  })

  it('ignore les query params (ex: token de cache)', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/public/post-media/a/b.jpg?token=x'
    expect(parseStorageUrl(url)?.path).toBe('a/b.jpg')
  })

  it('URL hors schema storage -> null', () => {
    expect(parseStorageUrl('https://example.com/foo/bar.jpg')).toBeNull()
  })
})
