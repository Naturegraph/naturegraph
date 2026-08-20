/**
 * Verrouille la logique des chips catégorie + espèce (extraite de FeedPost au Lot 4).
 * Ces tests garantissent que la factorisation n'a pas changé le comportement : les
 * 3 cas produit + les règles de cliquabilité doivent rester identiques.
 */

import { describe, it, expect } from 'vitest'
import { computeSpeciesChips } from './feedPostSpeciesChipsLogic'

describe('computeSpeciesChips, cas produit', () => {
  it('cas 1 : catégorie connue + espèce identifiée -> 2 chips, cliquables', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'birds',
      species: 'Canard colvert',
      scientificName: 'Anas platyrhynchos',
      taxrefId: '1234',
      hasCategoryHandler: true,
    })
    expect(d.category).toEqual({ label: 'Oiseaux', clickable: true })
    expect(d.species).toEqual({ kind: 'named', text: 'Canard colvert', clickable: true })
  })

  it('cas 2 : catégorie connue + espèce non identifiée -> catégorie + inconnu', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'mammals',
      species: null,
      scientificName: null,
      taxrefId: null,
      hasCategoryHandler: true,
    })
    expect(d.category).toEqual({ label: 'Mammifères', clickable: true })
    expect(d.species).toEqual({ kind: 'unknown' })
  })

  it('cas 3 : rien d’identifié -> un seul chip inconnu (pas de catégorie)', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: null,
      species: null,
      scientificName: null,
      taxrefId: null,
      hasCategoryHandler: true,
    })
    expect(d.category).toBeNull()
    expect(d.species).toEqual({ kind: 'unknown' })
  })
})

describe('computeSpeciesChips, cliquabilité', () => {
  it('espèce non cliquable sans taxref_id (ancien post) mais nom affiché', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'birds',
      species: 'Merle d’Amérique',
      taxrefId: null,
      hasCategoryHandler: true,
    })
    expect(d.species).toEqual({ kind: 'named', text: 'Merle d’Amérique', clickable: false })
  })

  it('disableChipFilters rend catégorie ET espèce passives (PostDetail)', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'birds',
      species: 'Canard colvert',
      taxrefId: '1234',
      disableChipFilters: true,
      hasCategoryHandler: true,
    })
    expect(d.category?.clickable).toBe(false)
    expect(d.species).toEqual({ kind: 'named', text: 'Canard colvert', clickable: false })
  })

  it('catégorie non cliquable sans handler de filtre (Profile)', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'birds',
      species: 'Canard colvert',
      taxrefId: '1234',
      hasCategoryHandler: false,
    })
    expect(d.category?.clickable).toBe(false)
    // l'espèce reste cliquable (dépend du taxref_id, pas du handler catégorie)
    expect(d.species).toEqual({ kind: 'named', text: 'Canard colvert', clickable: true })
  })
})

describe('computeSpeciesChips, groupe inconnu et suffixe de compte', () => {
  it('groupe taxonomique inconnu -> pas de chip catégorie', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'inexistant',
      species: 'Truc',
      taxrefId: '1',
      hasCategoryHandler: true,
    })
    expect(d.category).toBeNull()
  })

  it('scientific_name sert de repli quand le nom commun manque', () => {
    const d = computeSpeciesChips({
      taxonomicGroup: 'birds',
      species: null,
      scientificName: 'Anas platyrhynchos',
      taxrefId: '1',
      hasCategoryHandler: true,
    })
    expect(d.species).toEqual({ kind: 'named', text: 'Anas platyrhynchos', clickable: true })
  })

  it('suffixe "(N)" seulement si plusieurs individus (> 1)', () => {
    expect(computeSpeciesChips({ individualsCount: 3, hasCategoryHandler: true }).countSuffix).toBe(
      ' (3)',
    )
    expect(computeSpeciesChips({ individualsCount: 1, hasCategoryHandler: true }).countSuffix).toBe(
      '',
    )
    expect(computeSpeciesChips({ hasCategoryHandler: true }).countSuffix).toBe('')
  })
})
