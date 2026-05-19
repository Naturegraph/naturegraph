/**
 * Tests unitaires — searchService
 *
 * On ne teste pas l'intégration Supabase ici (cf. tests E2E Playwright pour
 * species_master), seulement le fallback mock COMMON_SPECIES qui couvre
 * le scénario "Supabase indisponible" (dev/offline ou DB down).
 *
 * Phase 1 (Nicolas 2026-05-19) : species_master = source de production
 * (~200 espèces FR+QC seed initial). Le fallback mock garantit que la
 * recherche fonctionne même sans backend.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase pour forcer le fallback (isSupabaseConfigured = false).
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}))

import { searchSpecies, type SpeciesHit } from './searchService'

describe('searchSpecies — fallback mock COMMON_SPECIES', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne tableau vide si query < 2 caractères', async () => {
    expect(await searchSpecies('')).toEqual([])
    expect(await searchSpecies('a')).toEqual([])
  })

  it('trouve une espèce par nom commun français', async () => {
    const hits = await searchSpecies('mésange')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h: SpeciesHit) => h.common_name?.toLowerCase().includes('mésange'))).toBe(
      true,
    )
  })

  it('trouve une espèce par nom scientifique latin', async () => {
    const hits = await searchSpecies('parus')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h: SpeciesHit) => h.scientific_name.toLowerCase().includes('parus'))).toBe(
      true,
    )
  })

  it('respecte la limite de résultats', async () => {
    const hits = await searchSpecies('e', 3) // "e" est dans beaucoup de noms — mais < 2 chars
    expect(hits).toEqual([]) // query length < 2 → vide
    const hits2 = await searchSpecies('er', 3)
    expect(hits2.length).toBeLessThanOrEqual(3)
  })

  it('retourne tableau vide pour une espèce inconnue', async () => {
    const hits = await searchSpecies('zzzqxqx')
    expect(hits).toEqual([])
  })

  it('chaque SpeciesHit a les champs attendus', async () => {
    const hits = await searchSpecies('renard')
    expect(hits.length).toBeGreaterThan(0)
    const first = hits[0]
    expect(first).toHaveProperty('taxref_id')
    expect(first).toHaveProperty('scientific_name')
    expect(first).toHaveProperty('common_name')
    expect(first).toHaveProperty('group_label')
  })
})
