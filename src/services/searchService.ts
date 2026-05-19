/**
 * searchService — Recherche globale espèces + profils
 * ====================================================
 * Stratégie de recherche espèces Phase 1 (Nicolas 2026-05-19) :
 *
 *   Supabase species_master + ILIKE multi-colonnes (FR + scientific + EN),
 *   accéléré par indexes GIN gin_trgm_ops. Tri par popularity DESC pour
 *   faire remonter les espèces communes.
 *
 * Sources des données (cf. PRD_SPECIES_DATABASE.md) :
 *   - species_master : ~200 espèces FR+QC seed initial (migration v2)
 *   - Expansion ~5 000 via scripts/seed-species-from-gbif.ts (Phase 2)
 *
 * 2026-05-19 (Nicolas) : suppression du mock local COMMON_SPECIES — on
 * teste en condition réelle uniquement. Si Supabase est indisponible, on
 * retourne un tableau vide (l'UI EncounterStep2 propose alors le fallback
 * "Ajouter à valider par la communauté").
 *
 * Règle de sécurité : aucune API externe (GBIF, Wikidata, iNat) n'est
 * appelée directement depuis le front — toujours via une table Supabase
 * (species_master Phase 1, ou cache rate-limit-friendly Phase 2).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface ProfileHit {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface SpeciesHit {
  /** Identifiant taxonomique (cd_nom legacy ou GBIF taxonKey Phase 2). */
  taxref_id: string
  scientific_name: string
  /** Nom commun français (peut être null pour taxons sans nom vernaculaire) */
  common_name: string | null
  /** Groupe taxonomique : birds / mammals / insects / amphibians / reptiles */
  group_label: string | null
}

// ─── Colonnes SELECT minimales pour les performances ─────────────────────────

const SPECIES_MASTER_SELECT =
  'id, gbif_id, scientific_name, common_name_fr, common_name_en, taxonomic_group, popularity, image_url' as const

/**
 * Mappe une ligne species_master vers SpeciesHit (interface stable utilisée
 * par SearchPanel + EncounterStep2). On expose gbif_id en priorité pour le
 * champ legacy `taxref_id` (qui sert d'identifiant taxonomique opaque côté
 * client) et on retombe sur l'UUID interne si pas de gbif_id.
 */
function toSpeciesHit(row: Record<string, unknown>): SpeciesHit {
  const gbifId = row['gbif_id']
  const uuid = row['id']
  return {
    taxref_id: String(gbifId ?? uuid ?? ''),
    scientific_name: String(row['scientific_name'] ?? ''),
    common_name: row['common_name_fr'] ? String(row['common_name_fr']) : null,
    group_label: row['taxonomic_group'] ? String(row['taxonomic_group']) : null,
  }
}

// ─── Recherche espèces ────────────────────────────────────────────────────────

/**
 * searchSpecies — Recherche dans species_master (GBIF + Wikidata, Phase 1).
 *
 * Stratégie :
 *   1. Supabase + species_master + ILIKE % multi-colonnes
 *      (les 3 indexes gin_trgm_ops sur common_name_fr / scientific_name /
 *      common_name_en accélèrent les ILIKE).
 *   2. Tri par popularity DESC pour mettre les espèces communes en haut.
 *   3. Si Supabase indisponible : retourne [] (l'UI propose alors le fallback
 *      "Ajouter à valider par la communauté" — cf. EncounterStep2).
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
  // Si Supabase non configuré : recherche vide (pas de mock fallback,
  // Nicolas 2026-05-19 — test 100% réel sur species_master).
  if (!isSupabaseConfigured || !supabase) return []

  const db = supabase!
  const q = query.trim()
  if (q.length < 2) return []

  const pattern = `%${q}%`

  try {
    // pg_trgm accélère les ILIKE % grâce aux indexes GIN. La recherche
    // est tolérante aux fautes de frappe légères et insensible à la casse.
    let qb = db
      .from('species_master')
      .select(SPECIES_MASTER_SELECT)
      .eq('is_active', true)
      .or(
        `common_name_fr.ilike.${pattern},` +
          `scientific_name.ilike.${pattern},` +
          `common_name_en.ilike.${pattern}`,
      )
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (group) {
      qb = qb.eq('taxonomic_group', group)
    }

    const { data, error } = await qb

    if (error) {
      console.warn('[searchService] species_master search failed:', error.message)
      return []
    }

    return ((data ?? []) as Record<string, unknown>[]).map(toSpeciesHit)
  } catch {
    // Supabase totalement indisponible : on retourne vide (l'UI propose
    // le fallback "Ajouter à valider par la communauté").
    return []
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
