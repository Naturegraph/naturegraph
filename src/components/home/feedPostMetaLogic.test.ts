/**
 * Verrouille la logique de la rangée méta (extraite de FeedPost au Lot 4) :
 * ordre d'affichage, présence conditionnelle, emojis et clés i18n. Garantit que
 * la factorisation n'a pas changé le comportement.
 */

import { describe, it, expect } from 'vitest'
import { computeMetaItems } from './feedPostMetaLogic'

describe('computeMetaItems, ordre et présence', () => {
  it('respecte l’ordre : phénomène, habitat, météo, nuages, moment', () => {
    const items = computeMetaItems({
      phenomenon: 'Arc-en-ciel',
      habitat: 'forest',
      weather: 'sunny',
      clouds: 'Cumulus',
      timeOfDay: 'morning',
    })
    expect(items.map((i) => i.key)).toEqual(['phenomenon', 'habitat', 'weather', 'clouds', 'time'])
  })

  it('omet les champs absents', () => {
    const items = computeMetaItems({ weather: 'sunny' })
    expect(items.map((i) => i.key)).toEqual(['weather'])
  })

  it('retourne un tableau vide si rien n’est renseigné', () => {
    expect(computeMetaItems({})).toEqual([])
  })
})

describe('computeMetaItems, emojis et libellés', () => {
  it('habitat : emoji depuis la map + clé i18n + fallback = valeur brute', () => {
    const [item] = computeMetaItems({ habitat: 'forest' })
    expect(item).toEqual({
      key: 'habitat',
      emoji: '🌳',
      labelKey: 'contribute.habitat.forest',
      labelFallback: 'forest',
    })
  })

  it('météo : emoji depuis la map + clé i18n', () => {
    const [item] = computeMetaItems({ weather: 'rainy' })
    expect(item.emoji).toBe('🌧️')
    expect(item.labelKey).toBe('contribute.weather.rainy')
  })

  it('phénomène : libellé brut (pas de clé i18n), emoji depuis la map', () => {
    const [item] = computeMetaItems({ phenomenon: 'Pleine lune' })
    expect(item).toEqual({
      key: 'phenomenon',
      emoji: '🌕',
      labelKey: null,
      labelFallback: 'Pleine lune',
    })
  })

  it('phénomène inconnu : pas d’emoji mais libellé conservé', () => {
    const [item] = computeMetaItems({ phenomenon: 'Truc rare' })
    expect(item.emoji).toBeNull()
    expect(item.labelFallback).toBe('Truc rare')
  })

  it('nuages et moment : nuages en libellé brut, moment avec clé i18n date', () => {
    const items = computeMetaItems({ clouds: 'Cumulus', timeOfDay: 'evening' })
    expect(items.find((i) => i.key === 'clouds')).toEqual({
      key: 'clouds',
      emoji: null,
      labelKey: null,
      labelFallback: 'Cumulus',
    })
    expect(items.find((i) => i.key === 'time')?.labelKey).toBe('contribute.date.evening')
  })

  it('habitat inconnu de la map : emoji null, clé et fallback conservés', () => {
    const [item] = computeMetaItems({ habitat: 'inexistant' })
    expect(item.emoji).toBeNull()
    expect(item.labelKey).toBe('contribute.habitat.inexistant')
  })
})
