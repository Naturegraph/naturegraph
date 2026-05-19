/**
 * Tests unitaires — searchService
 *
 * Phase 1 (Nicolas 2026-05-19) : la source de production est species_master
 * (~200 espèces FR+QC seed initial via GBIF + Wikidata CC0). Plus de mock
 * fallback — on teste 100% sur Supabase via tests E2E Playwright.
 *
 * Ces tests vérifient uniquement les comportements défensifs côté front :
 *   - Validation de la requête (longueur min)
 *   - Comportement quand Supabase n'est pas configuré (dev sans .env)
 *   - Forme du retour (toujours un tableau, jamais null/undefined)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase pour simuler "non configuré" (cas dev/offline ou .env absent).
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}))

import { searchSpecies, searchProfiles } from './searchService'

describe('searchSpecies — comportements défensifs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne tableau vide si query < 2 caractères', async () => {
    expect(await searchSpecies('')).toEqual([])
    expect(await searchSpecies('a')).toEqual([])
    expect(await searchSpecies(' ')).toEqual([])
  })

  it('retourne tableau vide si Supabase non configuré', async () => {
    // Avec isSupabaseConfigured = false (mock ci-dessus), toutes les requêtes
    // sortent tôt sur le early return.
    const hits = await searchSpecies('mésange')
    expect(hits).toEqual([])
  })

  it('retourne un tableau (jamais null/undefined) même pour requête vide', async () => {
    const hits = await searchSpecies('renard')
    expect(Array.isArray(hits)).toBe(true)
  })

  it("respecte la signature de l'API (limit + group optionnels)", async () => {
    // Vérification statique : ces appels doivent compiler et renvoyer un tableau.
    const a = await searchSpecies('test')
    const b = await searchSpecies('test', 5)
    const c = await searchSpecies('test', 5, 'birds')
    expect(Array.isArray(a)).toBe(true)
    expect(Array.isArray(b)).toBe(true)
    expect(Array.isArray(c)).toBe(true)
  })
})

describe('searchProfiles — comportements défensifs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne tableau vide si query < 2 caractères', async () => {
    expect(await searchProfiles('')).toEqual([])
    expect(await searchProfiles('x')).toEqual([])
  })

  it('retourne tableau vide si Supabase non configuré', async () => {
    const hits = await searchProfiles('alice')
    expect(hits).toEqual([])
  })
})
