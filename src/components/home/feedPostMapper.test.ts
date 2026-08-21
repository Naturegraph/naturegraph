/**
 * Verrouille l'adaptateur PostFeedItem -> MockPost (extrait de FeedSection au Lot 4).
 * Cette transformation est critique (feed, profil, détail post) et était NON testée :
 * ces tests garantissent que la factorisation n'a rien changé et protègent les règles
 * subtiles (fallback de titre, confidentialité du lieu, phénomène, réactions, date obs).
 */

import { describe, it, expect } from 'vitest'
import type { PostFeedItem } from '@/types/database'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import {
  postFeedItemToMockPost,
  derivePostFormat,
  getTaxonomicEmoji,
  getAuthorPreferenceEmoji,
  formatPostDate,
} from './feedPostMapper'

/** Fabrique un PostFeedItem minimal valide, surchargeable pour chaque test. */
function makeItem(overrides: Record<string, unknown> = {}): PostFeedItem {
  return {
    id: 'p1',
    user_id: 'u1',
    type: 'nature_encounter',
    author: { username: 'flore', first_name: 'Flore', last_name: 'Demo', avatar_url: null },
    created_at: '2026-04-10T12:00:00.000Z',
    encounter_date: null,
    title: null,
    description: 'Une belle observation. Deuxième phrase.',
    location_hidden: false,
    city: 'Montréal',
    region: 'Québec',
    country: 'CA',
    weather: null,
    time_of_day: null,
    habitat: null,
    tags: null,
    taxonomic_group: 'birds',
    species_name: 'Canard colvert',
    scientific_name: 'Anas platyrhynchos',
    taxref_id: '1234',
    media: [],
    reactions_breakdown: { love: 2, admire: 0, fire: 1, wow: 0, curious: 0 },
    user_reaction: null,
    likes_count: 3,
    comments_count: 5,
    ...overrides,
  } as unknown as PostFeedItem
}

describe('helpers purs', () => {
  it('derivePostFormat : seuils de ratio', () => {
    expect(derivePostFormat(undefined, undefined)).toBe('16:9')
    expect(derivePostFormat(300, 400)).toBe('portrait') // ratio 0.75 < 0.85
    expect(derivePostFormat(400, 300)).toBe('16:9') // ratio 1.33 > 1.15
    expect(derivePostFormat(400, 400)).toBe('1:1') // ratio 1.0
  })

  it('getTaxonomicEmoji : connu / inconnu / null', () => {
    expect(getTaxonomicEmoji('birds')).toBe(CATEGORY_EMOJIS.birds)
    expect(getTaxonomicEmoji('groupe_inexistant')).toBe('✨')
    expect(getTaxonomicEmoji(null)).toBe('✨')
  })

  it('getAuthorPreferenceEmoji : premier intérêt, sinon undefined', () => {
    expect(getAuthorPreferenceEmoji(['birds', 'insects'])).toBe(CATEGORY_EMOJIS.birds)
    expect(getAuthorPreferenceEmoji([])).toBeUndefined()
    expect(getAuthorPreferenceEmoji(null)).toBeUndefined()
  })

  it('formatPostDate : formate une date ISO valide en jj/mm/aaaa', () => {
    expect(formatPostDate('2026-04-10T12:00:00.000Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    // Entrée invalide : toLocaleDateString ne lève pas -> renvoie une chaîne
    // (le repli try/catch est en pratique inatteignable), on vérifie juste la
    // robustesse (pas de crash).
    expect(typeof formatPostDate('pas-une-date')).toBe('string')
  })
})

describe('postFeedItemToMockPost : titre', () => {
  it('priorise le titre explicite', () => {
    expect(postFeedItemToMockPost(makeItem({ title: 'Mon titre' })).title).toBe('Mon titre')
  })

  it('sinon : première phrase de la description', () => {
    expect(postFeedItemToMockPost(makeItem({ title: null })).title).toBe('Une belle observation')
  })
})

describe('postFeedItemToMockPost : confidentialité du lieu', () => {
  it('lieu masqué -> pays uniquement', () => {
    const p = postFeedItemToMockPost(makeItem({ location_hidden: true }))
    expect(p.location).toBe('CA')
  })

  it('lieu visible -> « Ville, Région » (sans doublon, sans pays)', () => {
    const p = postFeedItemToMockPost(makeItem({ location_hidden: false }))
    expect(p.location).toBe('Montréal, Québec')
  })
})

describe('postFeedItemToMockPost : phénomène et réactions', () => {
  it('phénomène présent seulement pour les posts Instant', () => {
    const encounter = postFeedItemToMockPost(makeItem({ type: 'nature_encounter' }))
    expect(encounter.phenomenon).toBeUndefined()
    const instant = postFeedItemToMockPost(
      makeItem({ type: 'nature_instant', phenomenon: 'Arc-en-ciel' }),
    )
    expect(instant.phenomenon).toBe('Arc-en-ciel')
  })

  it('mappe la répartition réelle des réactions (pas tout dans love)', () => {
    const p = postFeedItemToMockPost(makeItem())
    expect(p.reactions).toEqual({ love: 2, admire: 0, fire: 1, wow: 0, curious: 0 })
    expect(p.totalReactions).toBe(3)
    expect(p.comments).toBe(5)
  })
})

describe('postFeedItemToMockPost : date d’observation', () => {
  it('affichée seulement si elle diffère du jour de publication', () => {
    const meme = postFeedItemToMockPost(
      makeItem({ encounter_date: '2026-04-10', created_at: '2026-04-10T08:00:00.000Z' }),
    )
    expect(meme.encounterDate).toBeUndefined()
    const differente = postFeedItemToMockPost(
      makeItem({ encounter_date: '2026-04-01', created_at: '2026-04-10T08:00:00.000Z' }),
    )
    expect(differente.encounterDate).toBeDefined()
  })
})
