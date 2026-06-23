/**
 * Tests unitaires : groupNotifications
 *
 * Couvre :
 *   - Regroupement identiques < 24h
 *   - Pas de regroupement si fenêtre dépassée
 *   - Regroupement des "nouveau post" par AUTEUR (anti-spam), pas par reference
 *   - Pas de regroupement entre auteurs différents ni pour species_digest
 *   - Déduplication par actor_id
 *   - `read` global du groupe = ET logique
 *   - formatGroupedActors selon arité
 */

import { describe, it, expect } from 'vitest'
import { groupNotifications, formatGroupedActors } from './groupNotifications'
import type { Notification } from '@/services/notificationService'

function mk(over: Partial<Notification>): Notification {
  return {
    id: Math.random().toString(36),
    user_id: 'me',
    type: 'reaction',
    title: null,
    body: null,
    reference_id: 'post-1',
    reference_type: 'post',
    read: false,
    created_at: new Date().toISOString(),
    actor_id: 'u1',
    actor_username: 'alice',
    actor_avatar_url: null,
    ...over,
  }
}

describe('groupNotifications', () => {
  it('groupe deux réactions sur le même post en < 24h', () => {
    const now = Date.now()
    const input: Notification[] = [
      mk({
        id: 'n1',
        actor_id: 'u1',
        actor_username: 'alice',
        created_at: new Date(now).toISOString(),
      }),
      mk({
        id: 'n2',
        actor_id: 'u2',
        actor_username: 'bob',
        created_at: new Date(now - 3_600_000).toISOString(),
      }),
    ]
    const out = groupNotifications(input)
    expect(out).toHaveLength(1)
    expect(out[0].group_count).toBe(2)
    expect(out[0].grouped_actors.map((a) => a.username)).toEqual(['alice', 'bob'])
  })

  it('ne groupe pas au-delà de 24h', () => {
    const now = Date.now()
    const input: Notification[] = [
      mk({ id: 'n1', created_at: new Date(now).toISOString() }),
      mk({ id: 'n2', actor_id: 'u2', created_at: new Date(now - 25 * 3600_000).toISOString() }),
    ]
    const out = groupNotifications(input)
    expect(out).toHaveLength(2)
  })

  it('groupe les "nouveau post" du MÊME auteur en < 24h (anti-spam)', () => {
    const now = Date.now()
    // 3 posts du meme auteur (reference_id differents) -> 1 ligne "a publie 3 publications"
    const input: Notification[] = [
      mk({
        id: 'n1',
        type: 'post',
        reference_id: 'p1',
        actor_id: 'u1',
        actor_username: 'patosz',
        created_at: new Date(now).toISOString(),
      }),
      mk({
        id: 'n2',
        type: 'post',
        reference_id: 'p2',
        actor_id: 'u1',
        actor_username: 'patosz',
        created_at: new Date(now - 3_600_000).toISOString(),
      }),
      mk({
        id: 'n3',
        type: 'post',
        reference_id: 'p3',
        actor_id: 'u1',
        actor_username: 'patosz',
        created_at: new Date(now - 7_200_000).toISOString(),
      }),
    ]
    const out = groupNotifications(input)
    expect(out).toHaveLength(1)
    expect(out[0].group_count).toBe(3)
  })

  it('ne groupe pas les "nouveau post" d\'auteurs différents', () => {
    const input: Notification[] = [
      mk({ id: 'n1', type: 'post', reference_id: 'p1', actor_id: 'u1' }),
      mk({ id: 'n2', type: 'post', reference_id: 'p2', actor_id: 'u2' }),
    ]
    const out = groupNotifications(input)
    expect(out).toHaveLength(2)
  })

  it('ne groupe pas species_digest', () => {
    const input: Notification[] = [
      mk({ id: 'n1', type: 'species_digest', reference_id: null, reference_type: null }),
      mk({
        id: 'n2',
        type: 'species_digest',
        reference_id: null,
        reference_type: null,
        actor_id: 'u2',
      }),
    ]
    const out = groupNotifications(input)
    expect(out).toHaveLength(2)
  })

  it('déduplique par actor_id', () => {
    const input: Notification[] = [
      mk({ id: 'n1', actor_id: 'u1', actor_username: 'alice' }),
      mk({ id: 'n2', actor_id: 'u1', actor_username: 'alice' }),
    ]
    const out = groupNotifications(input)
    expect(out[0].group_count).toBe(2)
    expect(out[0].grouped_actors).toHaveLength(1)
  })

  it('`read` du groupe = ET logique', () => {
    const input: Notification[] = [
      mk({ id: 'n1', read: true }),
      mk({ id: 'n2', actor_id: 'u2', read: false }),
    ]
    const out = groupNotifications(input)
    expect(out[0].read).toBe(false)

    const input2: Notification[] = [
      mk({ id: 'n1', read: true }),
      mk({ id: 'n2', actor_id: 'u2', read: true }),
    ]
    const out2 = groupNotifications(input2)
    expect(out2[0].read).toBe(true)
  })
})

describe('formatGroupedActors', () => {
  function group(usernames: string[]) {
    return {
      ...mk({}),
      group_count: usernames.length,
      // BATCH 107 : group_ids requis sur GroupedNotification
      group_ids: usernames.map((_u, i) => `n${i}`),
      grouped_actors: usernames.map((u, i) => ({
        id: `u${i}`,
        username: u,
        avatar_url: null,
      })),
    }
  }

  const others = (n: number) => (n === 1 ? '+ 1 autre' : `+ ${n} autres`)

  it('retourne null pour un seul acteur', () => {
    expect(formatGroupedActors(group(['alice']), others)).toBeNull()
  })

  it('formatte "A & B" pour 2 acteurs', () => {
    expect(formatGroupedActors(group(['alice', 'bob']), others)).toBe('alice & bob')
  })

  it('formatte "A, B + N autres" pour 3+', () => {
    expect(formatGroupedActors(group(['alice', 'bob', 'charlie']), others)).toBe(
      'alice, bob + 1 autre',
    )
    expect(formatGroupedActors(group(['alice', 'bob', 'charlie', 'dave', 'eve']), others)).toBe(
      'alice, bob + 3 autres',
    )
  })
})
