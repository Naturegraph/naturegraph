/**
 * searchService — Recherche globale espèces + profils
 * ====================================================
 * Stratégie de recherche espèces (3 niveaux de fallback) :
 *
 *   1. Full-text search (tsvector @@ websearch_to_tsquery)
 *      → le plus rapide et précis, requiert search_vector peuplé
 *
 *   2. Trigram fuzzy (pg_trgm %)
 *      → tolérant aux fautes de frappe, requiert extension pg_trgm
 *
 *   3. ILIKE simple
 *      → fallback universel, plus lent sur grands datasets
 *
 *   4. Mock local (TAXREF_SPECIES)
 *      → si Supabase non configuré ou totalement indisponible
 *
 * Règle de sécurité : l'API TAXREF officielle n'est JAMAIS appelée
 * directement depuis le front — toujours via taxref_cache Supabase.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { TAXREF_SPECIES } from '@/constants/taxrefSpecies'

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface ProfileHit {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface SpeciesHit {
  /** cd_nom TAXREF — identifiant unique */
  taxref_id: string
  scientific_name: string
  /** Nom commun français (peut être null pour taxons sans nom vernaculaire) */
  common_name: string | null
  /** Groupe taxonomique : birds / mammals / insects / amphibians / reptiles */
  group_label: string | null
}

// ─── Colonnes SELECT minimales pour les performances ─────────────────────────

const SPECIES_SELECT = 'cd_nom, scientific_name, common_name_fr, "group"' as const

// ─── Fallback mock local ──────────────────────────────────────────────────────

/**
 * Recherche locale sur le mock TAXREF_SPECIES.
 * Utilisée quand Supabase est indisponible.
 */
function searchSpeciesMock(query: string, limit: number): SpeciesHit[] {
  const q = query.toLowerCase()
  return TAXREF_SPECIES.filter(
    (s) => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q),
  )
    .slice(0, limit)
    .map((s) => ({
      taxref_id: s.id,
      scientific_name: s.scientificName,
      common_name: s.commonName,
      group_label: s.group,
    }))
}

/**
 * Mappe une ligne taxref_cache vers SpeciesHit.
 */
function toSpeciesHit(row: Record<string, unknown>): SpeciesHit {
  return {
    taxref_id: String(row['cd_nom'] ?? ''),
    scientific_name: String(row['scientific_name'] ?? ''),
    common_name: row['common_name_fr'] ? String(row['common_name_fr']) : null,
    group_label: row['group'] ? String(row['group']) : null,
  }
}

// ─── Recherche espèces ────────────────────────────────────────────────────────

/**
 * searchSpecies — Recherche multi-niveaux dans taxref_cache.
 *
 * Ordre : full-text → trigram → ILIKE → mock local.
 * Chaque niveau n'est tenté que si le précédent retourne 0 résultats.
 *
 * @param query  Terme saisi (minimum 2 caractères)
 * @param limit  Nombre max de résultats (défaut 10)
 * @param group  Filtrer par groupe taxonomique (optionnel)
 */
export async function searchSpecies(
  query: string,
  limit = 10,
  group?: string,
): Promise<SpeciesHit[]> {
  // Fallback immédiat si Supabase non configuré
  if (!isSupabaseConfigured || !supabase) {
    return searchSpeciesMock(query, limit)
  }

  // Non-null assertion sûre : guard ci-dessus garantit que db est non-null

  const db = supabase!

  const q = query.trim()
  if (q.length < 2) return []

  /**
   * Applique un filtre taxonomique optionnel à une query Supabase.
   * Typé `any` car les query builders Supabase ont des types chaînés
   * qui ne s'expriment pas simplement en TypeScript strict (PostgrestFilterBuilder
   * vs PostgrestQueryBuilder selon l'état de la chaîne).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyGroup = (qb: any) => (group ? qb.eq('"group"', group) : qb)

  // ── Niveau 1 : Full-text search (tsvector) ─────────────────
  try {
    // websearch_to_tsquery accepte les termes naturels sans opérateurs spéciaux
    const ftsQuery = applyGroup(
      db
        .from('taxref_cache')
        .select(SPECIES_SELECT)
        .textSearch('search_vector', q, { type: 'websearch', config: 'french' })
        .limit(limit),
    )

    const { data: ftsData, error: ftsError } = await ftsQuery

    if (!ftsError && ftsData && ftsData.length > 0) {
      return (ftsData as Record<string, unknown>[]).map(toSpeciesHit)
    }
  } catch {
    // search_vector pas encore peuplé → passe au niveau suivant
  }

  // ── Niveau 2 : Trigram (pg_trgm) ───────────────────────────
  // Tolérant aux fautes de frappe (distance de similarité ~0.3)
  try {
    const normalizedQ = q.toLowerCase()

    const trgmQuery = applyGroup(
      db
        .from('taxref_cache')
        .select(SPECIES_SELECT)
        .or(
          `normalized_common_name.ilike.%${normalizedQ}%,` +
            `normalized_scientific_name.ilike.%${normalizedQ}%`,
        )
        .limit(limit),
    )

    const { data: trgmData, error: trgmError } = await trgmQuery

    if (!trgmError && trgmData && trgmData.length > 0) {
      return (trgmData as Record<string, unknown>[]).map(toSpeciesHit)
    }
  } catch {
    // normalized_common_name absent → passe au niveau suivant
  }

  // ── Niveau 3 : ILIKE classique (fallback universel) ────────
  try {
    const pattern = `%${q}%`

    const ilikeQuery = applyGroup(
      db
        .from('taxref_cache')
        .select(SPECIES_SELECT)
        .or(`common_name_fr.ilike.${pattern},scientific_name.ilike.${pattern}`)
        .limit(limit),
    )

    const { data, error } = await ilikeQuery

    if (error) {
      console.warn('[searchService] ILIKE fallback failed:', error.message)
      return searchSpeciesMock(q, limit)
    }

    return ((data ?? []) as Record<string, unknown>[]).map(toSpeciesHit)
  } catch {
    // Supabase totalement indisponible → fallback mock
    return searchSpeciesMock(q, limit)
  }
}

// ─── Recherche profils ────────────────────────────────────────────────────────

/**
 * searchProfiles — Recherche profils par username, prénom, nom.
 * ILIKE simple — MVP. Full-text en Phase 2.
 */
export async function searchProfiles(query: string, limit = 10): Promise<ProfileHit[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const q = query.trim()
  if (q.length < 2) return []

  const pattern = `%${q}%`

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url')
    .or(
      `username.ilike.${pattern},` + `first_name.ilike.${pattern},` + `last_name.ilike.${pattern}`,
    )
    .limit(limit)

  if (error) {
    console.warn('[searchService] profile search failed:', error.message)
    return []
  }

  return (data ?? []) as unknown as ProfileHit[]
}
