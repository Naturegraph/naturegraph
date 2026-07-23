/**
 * Tests du groupement par jour du fil d'Echanges
 * =============================================================================
 *
 * Ces regles sont invisibles a l'oeil tant qu'un fil reste court, et se voient
 * seulement le jour ou quelqu'un repond a un vieux message. C'est exactement le
 * genre de logique qui merite un test plutot qu'une verification manuelle.
 *
 * L'horloge est FIGEE dans chaque test (`maintenant` passe en argument) : un
 * test qui depend de l'heure reelle echoue un jour a minuit, et personne ne
 * comprend pourquoi.
 */

import { describe, it, expect } from 'vitest'
import { libelleJour, grouperParJour, construireFils } from './grouperParJour'
import type { Echange } from '@/services/echangeService'

const MAINTENANT = new Date('2026-07-22T15:00:00')

/** Echange minimal : seuls `id`, `creeLe` et `parentId` comptent ici. */
function echange(id: string, creeLe: string, parentId: string | null = null): Echange {
  return {
    id,
    postId: 'p1',
    auteurId: 'u1',
    contenu: 'texte',
    intention: 'reaction',
    utile: false,
    creeLe,
    auteurPseudo: 'Pseudo',
    auteurAvatar: null,
    parentId,
    reactions: { coeur: 0, accord: 0, confirme: 0 },
    maReaction: null,
    suggestion: null,
  }
}

describe('libelleJour', () => {
  it('nomme le jour courant, la veille et les jours proches', () => {
    expect(libelleJour('2026-07-22T09:00:00', MAINTENANT)).toBe("Aujourd'hui")
    expect(libelleJour('2026-07-21T23:59:00', MAINTENANT)).toBe('Hier')
    expect(libelleJour('2026-07-19T12:00:00', MAINTENANT)).toBe('Il y a 3 jours')
  })

  it('compare des JOURS civils, pas des ecarts de 24 heures', () => {
    // 23h hier et 1h ce matin sont separes de deux heures seulement, mais ne
    // sont pas le meme jour : c'est ce que le lecteur attend.
    const nuit = new Date('2026-07-22T01:00:00')
    expect(libelleJour('2026-07-21T23:00:00', nuit)).toBe('Hier')
    expect(libelleJour('2026-07-22T00:30:00', nuit)).toBe("Aujourd'hui")
  })

  it('bascule sur une date absolue au-dela d’une semaine', () => {
    // "il y a 34 jours" ne dit rien a personne, une date se situe tout de suite.
    expect(libelleJour('2026-06-18T12:00:00', MAINTENANT)).toBe('18 juin 2026')
  })

  it('ne renvoie jamais de libelle negatif pour une date future', () => {
    expect(libelleJour('2026-07-25T12:00:00', MAINTENANT)).toBe("Aujourd'hui")
  })
})

describe('grouperParJour', () => {
  it('regroupe les messages consecutifs du meme jour', () => {
    const groupes = grouperParJour(
      [
        echange('a', '2026-07-22T10:00:00'),
        echange('b', '2026-07-22T11:00:00'),
        echange('c', '2026-07-21T10:00:00'),
      ],
      MAINTENANT,
    )

    expect(groupes.map((g) => g.libelle)).toEqual(["Aujourd'hui", 'Hier'])
    expect(groupes[0].echanges.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('conserve l’ordre d’entree et ne fusionne pas deux groupes a distance', () => {
    // Un fil desordonne doit se voir plutot que d'etre recompose en silence.
    const groupes = grouperParJour(
      [
        echange('a', '2026-07-22T10:00:00'),
        echange('b', '2026-07-21T10:00:00'),
        echange('c', '2026-07-22T12:00:00'),
      ],
      MAINTENANT,
    )

    expect(groupes.map((g) => g.libelle)).toEqual(["Aujourd'hui", 'Hier', "Aujourd'hui"])
  })

  it('renvoie une liste vide sans echange', () => {
    expect(grouperParJour([], MAINTENANT)).toEqual([])
  })
})

describe('construireFils', () => {
  // Entree telle que la renvoie le service : du plus ancien au plus recent.
  const fil = [
    echange('vieux', '2026-07-19T09:00:00'),
    echange('hier', '2026-07-21T11:00:00'),
    echange('recent', '2026-07-22T10:00:00'),
    echange('rep1', '2026-07-22T10:30:00', 'recent'),
    echange('rep2', '2026-07-22T11:00:00', 'recent'),
  ]

  it('presente les messages de premier niveau du plus recent au plus ancien', () => {
    const groupes = construireFils(fil, MAINTENANT)
    expect(groupes.map((g) => g.libelle)).toEqual(["Aujourd'hui", 'Hier', 'Il y a 3 jours'])
    expect(groupes[0].fils.map((f) => f.parent.id)).toEqual(['recent'])
  })

  it('garde les reponses dans l’ordre ou la conversation s’est tenue', () => {
    const groupes = construireFils(fil, MAINTENANT)
    expect(groupes[0].fils[0].reponses.map((e) => e.id)).toEqual(['rep1', 'rep2'])
  })

  it('n’affiche jamais une reponse comme message de premier niveau', () => {
    const groupes = construireFils(fil, MAINTENANT)
    const racines = groupes.flatMap((g) => g.fils.map((f) => f.parent.id))
    expect(racines).not.toContain('rep1')
    expect(racines).not.toContain('rep2')
  })

  it('ne modifie pas le tableau recu', () => {
    // `reverse()` mute en place : la copie doit etre faite en amont.
    const entree = [...fil]
    construireFils(entree, MAINTENANT)
    expect(entree.map((e) => e.id)).toEqual(fil.map((e) => e.id))
  })
})
