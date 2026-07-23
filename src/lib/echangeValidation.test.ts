/**
 * Tests des garde-fous sur le texte d'un Echange
 * =============================================================================
 *
 * Ces regles decident si un message part ou non : elles doivent etre couvertes,
 * et surtout couvertes SUR LES CAS LIMITES. Un filtre anti-lien qui refuse
 * "bonjour.merci" est aussi nuisible qu'un filtre qui laisse passer
 * "spam.com" : les deux cassent la confiance, dans un sens ou dans l'autre.
 *
 * Les caracteres invisibles des cas de test sont construits via
 * `String.fromCharCode` et jamais tapes en litteral : un test cense verifier
 * qu'on retire un caractere invisible ne doit pas dependre d'un caractere
 * invisible... invisible dans le fichier de test.
 */

import { describe, it, expect } from 'vitest'
import {
  nettoyerEchange,
  contientUnLien,
  validerEchange,
  EchangeInvalideError,
} from './echangeValidation'

const ZWSP = String.fromCharCode(0x200b) // espace de largeur nulle
const RLO = String.fromCharCode(0x202e) // inversion du sens de lecture

describe('nettoyerEchange', () => {
  it('retire les caracteres de largeur nulle utilises pour couper un mot', () => {
    // "spa[ZWSP]m" se lit "spam" mais echappe a une recherche naive.
    expect(nettoyerEchange(`spa${ZWSP}m`)).toBe('spam')
  })

  it('retire la marque d’inversion du sens de lecture', () => {
    expect(nettoyerEchange(`inoffensif${RLO}`)).toBe('inoffensif')
  })

  it('plafonne les lignes vides consecutives', () => {
    expect(nettoyerEchange('un\n\n\n\n\n\ndeux')).toBe('un\n\ndeux')
  })

  it('conserve les retours a la ligne et accents legitimes', () => {
    expect(nettoyerEchange('Héron cendré\nau bord de l’eau')).toBe('Héron cendré\nau bord de l’eau')
  })
})

describe('contientUnLien', () => {
  it('repere les formes courantes', () => {
    expect(contientUnLien('regarde https://exemple.com')).toBe(true)
    expect(contientUnLien('va sur www.exemple.fr')).toBe(true)
    expect(contientUnLien('exemple.com/promo')).toBe(true)
    expect(contientUnLien('javascript:alert(1)')).toBe(true)
  })

  it('ne prend pas une phrase mal ponctuee pour un lien', () => {
    // Le piege classique du filtre trop large : une phrase sans espace apres
    // le point deviendrait un "lien" et le message serait refuse sans raison.
    expect(contientUnLien('bonjour.merci pour la photo')).toBe(false)
    expect(contientUnLien('Vu au petit matin.Superbe lumiere')).toBe(false)
  })

  it('ne prend pas un nom scientifique pour un lien', () => {
    expect(contientUnLien('Nycticorax nycticorax, adulte')).toBe(false)
    expect(contientUnLien('Ardea cinerea (Linnaeus, 1758)')).toBe(false)
  })
})

describe('validerEchange', () => {
  it('renvoie le texte nettoye quand tout va bien', () => {
    expect(validerEchange('  Superbe observation  ')).toBe('Superbe observation')
  })

  it('refuse un message vide, y compris apres nettoyage', () => {
    // Uniquement des caracteres invisibles : visuellement non vide, reellement
    // vide. Sans nettoyage prealable, ce message passait.
    expect(() => validerEchange(`${ZWSP}${ZWSP}`)).toThrow(EchangeInvalideError)
    expect(() => validerEchange('   ')).toThrow(EchangeInvalideError)
  })

  it('refuse un lien avec un message explicite', () => {
    try {
      validerEchange('Mon site : https://spam.example')
      throw new Error('aurait du lever')
    } catch (e) {
      expect(e).toBeInstanceOf(EchangeInvalideError)
      expect((e as EchangeInvalideError).code).toBe('LIEN_INTERDIT')
      expect((e as EchangeInvalideError).message).toMatch(/liens ne sont pas autorisés/i)
    }
  })

  it('refuse la repetition excessive d’un meme caractere', () => {
    expect(() => validerEchange('a'.repeat(40))).toThrow(EchangeInvalideError)
  })

  it('laisse passer une insistance normale', () => {
    // "Superbeeee" est de l'enthousiasme, pas du remplissage : le seuil doit
    // etre assez haut pour ne pas punir la spontaneite.
    expect(validerEchange('Superbeeee !')).toBe('Superbeeee !')
    expect(validerEchange('Ouiii, c’est bien lui')).toBe('Ouiii, c’est bien lui')
  })
})
