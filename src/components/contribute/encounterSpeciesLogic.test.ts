/**
 * Verrouille la logique du carnet d'espèces (extraite d'EncounterStep2 au Lot 4) :
 * groupement des observations par groupe taxonomique (ordre + repli "Autre") et
 * résolution emoji/libellé. Garantit que la factorisation n'a rien changé.
 */

import { describe, it, expect } from 'vitest'
import type { ObservationEntry } from './EncounterStep2'
import { groupConfig, groupObservations } from './encounterSpeciesLogic'

/** Fabrique une observation, surchargeable. */
function makeEntry(overrides: Partial<ObservationEntry> = {}): ObservationEntry {
  return {
    id: Math.random().toString(36),
    isUnknown: false,
    count: 1,
    species: {
      id: 's1',
      commonName: 'Canard colvert',
      scientificName: 'Anas platyrhynchos',
      group: 'birds',
    },
    ...overrides,
  } as ObservationEntry
}

describe('groupConfig', () => {
  it('groupe connu -> emoji + libellé FR', () => {
    expect(groupConfig('birds').label).toBe('Oiseaux')
  })

  it('insensible à la casse', () => {
    expect(groupConfig('BIRDS').label).toBe('Oiseaux')
  })

  it('groupe null ou inconnu -> "Autre" (✨)', () => {
    expect(groupConfig(null)).toEqual({ emoji: '✨', label: 'Autre' })
    expect(groupConfig('inexistant')).toEqual({ emoji: '✨', label: 'Autre' })
  })
})

describe('groupObservations', () => {
  it('regroupe par groupe taxonomique et conserve l’ordre d’apparition', () => {
    const entries = [
      makeEntry({ species: { id: 'a', commonName: 'A', scientificName: 'A', group: 'birds' } }),
      makeEntry({ species: { id: 'b', commonName: 'B', scientificName: 'B', group: 'mammals' } }),
      makeEntry({ species: { id: 'c', commonName: 'C', scientificName: 'C', group: 'birds' } }),
    ]
    const groups = groupObservations(entries)
    expect(groups.map((g) => g.key)).toEqual(['birds', 'mammals'])
    expect(groups[0].items).toHaveLength(2) // les 2 oiseaux
    expect(groups[1].items).toHaveLength(1)
  })

  it('espèce non déterminée -> groupe "Autre"', () => {
    const groups = groupObservations([makeEntry({ isUnknown: true, species: null })])
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('other')
    expect(groups[0].label).toBe('Autre')
  })

  it('espèce absente (species null) -> groupe "Autre" aussi', () => {
    const groups = groupObservations([makeEntry({ isUnknown: false, species: null })])
    expect(groups[0].key).toBe('other')
  })

  it('liste vide -> aucun groupe', () => {
    expect(groupObservations([])).toEqual([])
  })
})
