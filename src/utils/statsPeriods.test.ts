/**
 * Tests de statsPeriods : bornes de periodes calendaires + glissante.
 *
 * On verifie la borne `current` en la relisant en heure murale America/Toronto
 * (robuste au DST et aux annees bissextiles, sans coder d'offset en dur). Chaque
 * `now` est fixe a midi UTC pour lever toute ambiguite de date cote Toronto.
 */
import { describe, it, expect } from 'vitest'
import { getPeriodStartISO, getStatsPeriodBounds } from './statsPeriods'

/** Relit un instant ISO en heure murale Toronto -> "YYYY-MM-DD HH:MM:SS". */
function torontoWall(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const g = (t: string) => parts.find((p) => p.type === t)!.value
  const hour = g('hour') === '24' ? '00' : g('hour') // certains runtimes rendent 24 a minuit
  return `${g('year')}-${g('month')}-${g('day')} ${hour}:${g('minute')}:${g('second')}`
}

/** Raccourci : borne de debut d'une periode, relue en heure murale Toronto. */
function startWall(period: Parameters<typeof getPeriodStartISO>[0], nowUTC: string): string {
  return torontoWall(getPeriodStartISO(period, new Date(nowUTC)))
}

describe('statsPeriods : bornes calendaires (fuseau America/Toronto)', () => {
  it('20 aout 2026 : 7 jours / mois / trimestre / annee', () => {
    const now = '2026-08-20T16:00:00Z' // midi Toronto (EDT)
    expect(startWall('last7Days', now)).toBe('2026-08-14 00:00:00') // today-6
    expect(startWall('currentMonth', now)).toBe('2026-08-01 00:00:00')
    expect(startWall('currentQuarter', now)).toBe('2026-07-01 00:00:00') // T3
    expect(startWall('currentYear', now)).toBe('2026-01-01 00:00:00')
  })

  it('31 aout : le mois reste aout', () => {
    expect(startWall('currentMonth', '2026-08-31T16:00:00Z')).toBe('2026-08-01 00:00:00')
  })

  it('1er septembre : le mois repart, le trimestre reste T3', () => {
    const now = '2026-09-01T16:00:00Z'
    expect(startWall('currentMonth', now)).toBe('2026-09-01 00:00:00')
    expect(startWall('currentQuarter', now)).toBe('2026-07-01 00:00:00')
  })

  it('30 septembre : encore T3', () => {
    expect(startWall('currentQuarter', '2026-09-30T16:00:00Z')).toBe('2026-07-01 00:00:00')
  })

  it('1er octobre : bascule en T4', () => {
    expect(startWall('currentQuarter', '2026-10-01T16:00:00Z')).toBe('2026-10-01 00:00:00')
  })

  it('31 decembre : mois=dec, trimestre=T4, annee=2026', () => {
    const now = '2026-12-31T16:00:00Z'
    expect(startWall('currentMonth', now)).toBe('2026-12-01 00:00:00')
    expect(startWall('currentQuarter', now)).toBe('2026-10-01 00:00:00')
    expect(startWall('currentYear', now)).toBe('2026-01-01 00:00:00')
  })

  it('1er janvier 2027 : tout repart sur la nouvelle annee (T1)', () => {
    const now = '2027-01-01T16:00:00Z'
    expect(startWall('currentMonth', now)).toBe('2027-01-01 00:00:00')
    expect(startWall('currentQuarter', now)).toBe('2027-01-01 00:00:00') // T1
    expect(startWall('currentYear', now)).toBe('2027-01-01 00:00:00')
  })

  it('mapping des 4 trimestres calendaires', () => {
    expect(startWall('currentQuarter', '2026-02-15T16:00:00Z')).toBe('2026-01-01 00:00:00') // T1
    expect(startWall('currentQuarter', '2026-05-15T16:00:00Z')).toBe('2026-04-01 00:00:00') // T2
    expect(startWall('currentQuarter', '2026-08-15T16:00:00Z')).toBe('2026-07-01 00:00:00') // T3
    expect(startWall('currentQuarter', '2026-11-15T16:00:00Z')).toBe('2026-10-01 00:00:00') // T4
  })
})

describe('statsPeriods : last7Days glissant (passages de mois/annee)', () => {
  it('debut de mois : recule sur le mois precedent', () => {
    // 3 septembre - 6 jours = 28 aout
    expect(startWall('last7Days', '2026-09-03T16:00:00Z')).toBe('2026-08-28 00:00:00')
  })
  it('debut d annee : recule sur decembre precedent', () => {
    // 2 janvier 2027 - 6 jours = 27 decembre 2026
    expect(startWall('last7Days', '2027-01-02T16:00:00Z')).toBe('2026-12-27 00:00:00')
  })
})

describe('statsPeriods : annee bissextile (2028)', () => {
  it('29 fevrier 2028 : mois de fevrier, 7 jours = 23 fevrier', () => {
    const now = '2028-02-29T16:00:00Z'
    expect(startWall('currentMonth', now)).toBe('2028-02-01 00:00:00')
    expect(startWall('last7Days', now)).toBe('2028-02-23 00:00:00')
  })
  it('2 mars 2028 : la fenetre 7 jours traverse le 29 fevrier (-> 25 fevrier)', () => {
    expect(startWall('last7Days', '2028-03-02T16:00:00Z')).toBe('2028-02-25 00:00:00')
  })
})

describe('statsPeriods : passage a l heure d hiver (DST)', () => {
  it('novembre (EST -5h) : minuit du 1er novembre bien ancre', () => {
    // Apres la fin du DST (~1er nov). Le mois commence a 00:00 heure locale.
    expect(startWall('currentMonth', '2026-11-15T17:00:00Z')).toBe('2026-11-01 00:00:00')
  })
})

describe('statsPeriods : periode precedente (trend)', () => {
  it('previous < current, et fenetre precedente de meme duree que l ecoule', () => {
    const now = new Date('2026-08-20T16:00:00Z')
    const { current, previous } = getStatsPeriodBounds('currentMonth', now)
    const cur = new Date(current).getTime()
    const prev = new Date(previous).getTime()
    expect(prev).toBeLessThan(cur)
    // duree ecoulee de la periode courante == duree de la periode precedente
    expect(cur - prev).toBe(now.getTime() - cur)
  })
})
