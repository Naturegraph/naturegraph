/**
 * Tests de feedTimeline : separateurs temporels + frontiere "deja vu".
 * On teste surtout la STRUCTURE (placement des separateurs), independante du
 * fuseau ; les libelles today/hier sont deterministes et testes a part.
 */
import { describe, it, expect } from 'vitest'
import { feedDayLabel, buildFeedTimeline, type TimelineItem } from './feedTimeline'

const NOW = new Date('2026-08-21T12:00:00Z')

/** Petit post de test : seule la date compte. */
function p(created_at: string): TimelineItem & { id: string } {
  return { id: created_at, created_at }
}

/** Suite des types de lignes, pour asserter la structure. */
function kinds(rows: { kind: string }[]): string[] {
  return rows.map((r) => r.kind)
}

describe('feedDayLabel', () => {
  it('aujourd hui / hier', () => {
    expect(feedDayLabel('2026-08-21T09:00:00Z', NOW)).toBe("Aujourd'hui")
    expect(feedDayLabel('2026-08-20T09:00:00Z', NOW)).toBe('Hier')
  })
  it('date absolue au-dela d hier (ni aujourd hui ni hier)', () => {
    const label = feedDayLabel('2026-08-10T09:00:00Z', NOW)
    expect(label).not.toBe("Aujourd'hui")
    expect(label).not.toBe('Hier')
    expect(label.length).toBeGreaterThan(0)
  })
})

describe('buildFeedTimeline : separateurs temporels', () => {
  const posts = [
    p('2026-08-21T10:00:00Z'), // aujourd hui
    p('2026-08-21T08:00:00Z'), // aujourd hui (meme jour)
    p('2026-08-20T18:00:00Z'), // hier
    p('2026-08-19T12:00:00Z'), // 19 aout
  ]

  it('un seul separateur par jour, pas entre chaque post', () => {
    const rows = buildFeedTimeline(posts, null, NOW)
    // 3 jours distincts -> 3 separateurs "day"
    expect(rows.filter((r) => r.kind === 'day')).toHaveLength(3)
    // structure : day, post, post, day, post, day, post
    expect(kinds(rows)).toEqual(['day', 'post', 'post', 'day', 'post', 'day', 'post'])
  })

  it('ordre des posts preserve', () => {
    const rows = buildFeedTimeline(posts, null, NOW)
    const postDates = rows
      .filter((r) => r.kind === 'post')
      .map((r) => (r as { post: TimelineItem }).post.created_at)
    expect(postDates).toEqual(posts.map((x) => x.created_at))
  })

  it('premiere visite (lastVisit null) : aucune frontiere deja vu', () => {
    const rows = buildFeedTimeline(posts, null, NOW)
    expect(rows.some((r) => r.kind === 'seen-divider')).toBe(false)
  })
})

describe('buildFeedTimeline : frontiere "deja vu"', () => {
  const posts = [
    p('2026-08-21T10:00:00Z'), // nouveau
    p('2026-08-21T08:00:00Z'), // nouveau
    p('2026-08-20T18:00:00Z'), // nouveau
    p('2026-08-19T12:00:00Z'), // deja vu
    p('2026-08-18T09:00:00Z'), // deja vu
  ]
  const lastVisit = '2026-08-20T12:00:00Z'

  it('un unique separateur, juste avant le 1er post deja vu', () => {
    const rows = buildFeedTimeline(posts, lastVisit, NOW)
    const seen = rows.filter((r) => r.kind === 'seen-divider')
    expect(seen).toHaveLength(1)
    // structure attendue : les 3 nouveaux (avec leurs jours), puis seen-divider,
    // puis la section deja vu avec son propre entete de jour.
    expect(kinds(rows)).toEqual([
      'day',
      'post',
      'post', // aujourd hui (2 posts)
      'day',
      'post', // hier (1 post nouveau)
      'seen-divider',
      'day',
      'post', // 19 aout (deja vu)
      'day',
      'post', // 18 aout (deja vu)
    ])
  })

  it('aucune nouveaute (derniere visite posterieure a tout) : pas de frontiere', () => {
    const rows = buildFeedTimeline(posts, '2026-08-22T00:00:00Z', NOW)
    expect(rows.some((r) => r.kind === 'seen-divider')).toBe(false)
  })

  it('tout est nouveau (derniere visite tres ancienne) : pas de frontiere non plus', () => {
    const rows = buildFeedTimeline(posts, '2026-01-01T00:00:00Z', NOW)
    // tous les posts sont > lastVisit -> aucun "deja vu" -> pas de separateur
    expect(rows.some((r) => r.kind === 'seen-divider')).toBe(false)
  })
})

describe('buildFeedTimeline : mes propres posts ne comptent pas comme "nouveaux"', () => {
  const lastVisit = '2026-08-20T12:00:00Z'

  it('mon propre post recent ne declenche NI bandeau NI frontiere', () => {
    const posts = [
      { id: 'a', created_at: '2026-08-21T10:00:00Z', authorId: 'me' }, // mien, plus recent que la visite
      { id: 'b', created_at: '2026-08-19T12:00:00Z', authorId: 'other' }, // deja vu
    ]
    const rows = buildFeedTimeline(posts, lastVisit, NOW, undefined, 'me')
    // Seul "nouveau" est le mien -> aucune frontiere "deja vu".
    expect(rows.some((r) => r.kind === 'seen-divider')).toBe(false)
  })

  it('un nouveau post d un AUTRE declenche bien la frontiere, meme si j ai aussi publie', () => {
    const posts = [
      { id: 'a', created_at: '2026-08-21T10:00:00Z', authorId: 'me' }, // mien, nouveau
      { id: 'b', created_at: '2026-08-21T09:00:00Z', authorId: 'other' }, // autre, nouveau
      { id: 'c', created_at: '2026-08-19T12:00:00Z', authorId: 'other' }, // deja vu
    ]
    const rows = buildFeedTimeline(posts, lastVisit, NOW, undefined, 'me')
    expect(rows.some((r) => r.kind === 'seen-divider')).toBe(true)
  })
})
