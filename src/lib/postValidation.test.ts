/**
 * Tests postValidation — regles de contenu d'un post (retour testeur 2026-06-11).
 * Couvre : borne titre/description, regle « non vide », et le flag enforceNonEmpty
 * utilise cote service (qui ne connait pas les photos).
 */
import { describe, it, expect } from 'vitest'
import {
  validatePostContent,
  PostValidationError,
  POST_LIMITS,
  type PostContentFlags,
} from './postValidation'

describe('validatePostContent', () => {
  it('accepte un post avec une description normale', () => {
    expect(() => validatePostContent({ description: 'Une belle mesange bleue.' })).not.toThrow()
  })

  it('accepte un post avec seulement une photo', () => {
    expect(() => validatePostContent({ hasMedia: true })).not.toThrow()
  })

  it('accepte un post avec seulement une espece', () => {
    expect(() => validatePostContent({ hasSpecies: true })).not.toThrow()
  })

  it('rejette un titre trop long avec un code et un message sur (pas SQL)', () => {
    const longTitle = 'a'.repeat(POST_LIMITS.TITLE_MAX + 1)
    try {
      validatePostContent({ title: longTitle, description: 'x' })
      throw new Error('aurait du lever')
    } catch (err) {
      expect(err).toBeInstanceOf(PostValidationError)
      expect((err as PostValidationError).code).toBe('TITLE_TOO_LONG')
      // Message FR maison, jamais le « value too long for type character varying »
      expect((err as PostValidationError).message).not.toMatch(
        /character varying|varchar|value too long/i,
      )
    }
  })

  it('accepte un titre pile a la limite', () => {
    const maxTitle = 'a'.repeat(POST_LIMITS.TITLE_MAX)
    expect(() => validatePostContent({ title: maxTitle, description: 'x' })).not.toThrow()
  })

  it('rejette une description trop longue', () => {
    const longDesc = 'a'.repeat(POST_LIMITS.DESCRIPTION_MAX + 1)
    expect(() => validatePostContent({ description: longDesc })).toThrow(PostValidationError)
  })

  it('rejette un post strictement vide (EMPTY_POST)', () => {
    const flags: PostContentFlags = { title: '   ', description: '' }
    try {
      validatePostContent(flags)
      throw new Error('aurait du lever')
    } catch (err) {
      expect(err).toBeInstanceOf(PostValidationError)
      expect((err as PostValidationError).code).toBe('EMPTY_POST')
    }
  })

  it('NE rejette PAS le vide quand enforceNonEmpty=false (cas service)', () => {
    // Le service createPost ne connait pas les photos -> il ne juge que la
    // longueur, jamais le vide.
    expect(() =>
      validatePostContent({ title: '', description: '', enforceNonEmpty: false }),
    ).not.toThrow()
  })

  it('applique quand meme la borne titre meme avec enforceNonEmpty=false', () => {
    const longTitle = 'a'.repeat(POST_LIMITS.TITLE_MAX + 5)
    expect(() => validatePostContent({ title: longTitle, enforceNonEmpty: false })).toThrow(
      PostValidationError,
    )
  })
})
