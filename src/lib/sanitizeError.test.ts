/**
 * Tests sanitizeError — jamais de fuite technique a l'utilisateur (retour
 * testeur 2026-06-11). On verifie que les messages SQL/PostgREST bruts sont
 * remplaces par un message generique, et que nos libelles FR maison passent.
 */
import { describe, it, expect } from 'vitest'
import { isTechnicalMessage, toSafeMessage, GENERIC_ERROR_MESSAGE } from './sanitizeError'

describe('isTechnicalMessage', () => {
  it('detecte les messages SQL / PostgREST bruts', () => {
    const technical = [
      'value too long for type character varying(160)',
      'duplicate key value violates unique constraint "profiles_username_key"',
      'null value in column "user_id" violates not-null constraint',
      'new row violates row-level security policy',
      'PGRST204: column not found',
      'JWT expired',
      'permission denied for table posts',
    ]
    for (const msg of technical) {
      expect(isTechnicalMessage(msg)).toBe(true)
    }
  })

  it('laisse passer nos libelles FR maison', () => {
    const clean = [
      'Le titre ne peut pas depasser 160 caracteres.',
      'Ajoute au moins une photo, une espece ou une description avant de publier.',
      'Session expiree, reconnecte-toi.',
      'Coupure reseau pendant le partage.',
    ]
    for (const msg of clean) {
      expect(isTechnicalMessage(msg)).toBe(false)
    }
  })

  it('retourne false pour vide/null', () => {
    expect(isTechnicalMessage('')).toBe(false)
    expect(isTechnicalMessage(null)).toBe(false)
    expect(isTechnicalMessage(undefined)).toBe(false)
  })
})

describe('toSafeMessage', () => {
  it('remplace une Error technique par le fallback', () => {
    const err = new Error('value too long for type character varying(160)')
    expect(toSafeMessage(err, 'Oups')).toBe('Oups')
  })

  it('conserve un message FR maison', () => {
    const err = new Error('Le titre ne peut pas depasser 160 caracteres.')
    expect(toSafeMessage(err)).toBe('Le titre ne peut pas depasser 160 caracteres.')
  })

  it('utilise le fallback par defaut sur une valeur vide', () => {
    expect(toSafeMessage(null)).toBe(GENERIC_ERROR_MESSAGE)
    expect(toSafeMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE)
  })

  it('gere une string brute', () => {
    expect(toSafeMessage('relation "posts" does not exist', 'Oups')).toBe('Oups')
    expect(toSafeMessage('Tout va bien')).toBe('Tout va bien')
  })
})
