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

/**
 * TaxonomyHit — V1.1.0 (BDD taxonomy_nodes).
 *
 * Etend SpeciesHit avec :
 *   - rank : 'species' | 'family' | 'genus' | 'order' (permet fallback famille
 *     quand l'espece n'est pas trouvee, demande Nicolas 2026-05-26)
 *   - taxonomy_node_id : UUID stable pour FK posts.taxonomy_node_id
 *   - available_in_fr / available_in_ca : drapeaux territoire pour UI
 *   - class : pour afficher la categorie (Aves, Insecta, etc.)
 */
export interface TaxonomyHit {
  /** UUID de taxonomy_nodes.id — utilise comme FK pour posts.taxonomy_node_id */
  taxonomy_node_id: string
  /** Rang : 'species' (precis), 'genus', 'family' (fallback), 'order' */
  rank: 'species' | 'genus' | 'family' | 'order' | 'class'
  scientific_name: string
  common_name_fr: string | null
  common_name_en: string | null
  /** Classe taxonomique (Aves, Mammalia, Insecta...). Utilise pour les filtres. */
  class: string | null
  family: string | null
  available_in_fr: boolean
  available_in_ca: boolean
  /** ID iNaturalist (pour eventuel lien vers la fiche source). */
  inaturalist_id: number | null
  photo_url: string | null
  popularity: number
  match_score: number
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

  // Timeout client 6s — Nicolas 2026-05-24 : sans ce timeout, sur réseau
  // mobile lent la requête restait pending indéfiniment et l'user voyait
  // l'icône tourner sans fin. 6s est large pour un ILIKE sur 5k espèces.
  const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
    setTimeout(() => resolve({ data: null, error: new Error('species search timeout 6s') }), 6000),
  )

  try {
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

    const result = await Promise.race([qb, timeoutPromise])
    const { data, error } = result as { data: unknown; error: unknown }

    if (error) {
      console.warn(
        '[searchService] species_master search failed:',
        (error as Error).message ?? error,
      )
      return []
    }

    return ((data ?? []) as Record<string, unknown>[]).map(toSpeciesHit)
  } catch (err) {
    console.warn('[searchService] species search exception:', err)
    return []
  }
}

// ─── Recherche taxonomie V1.1.0 (BDD taxonomy_nodes) ────────────────────────

/**
 * searchTaxonomy — Recherche dans la nouvelle BDD taxonomy_nodes (V1.1.0).
 *
 * Remplace progressivement searchSpecies(). Avantages :
 *   - Retourne especes + familles + ordres dans une seule recherche
 *   - Permet le fallback "tagguer une famille" quand l'espece n'est pas
 *     trouvee (demande Nicolas 2026-05-26)
 *   - Filtre par territoire (FR / CA) via available_in_fr / available_in_ca
 *   - Filtre par classe (Aves, Insecta, etc.)
 *   - Tri intelligent : species > genus > family > order, puis match_score,
 *     puis popularity (nb d'observations iNat)
 *
 * @param query           Terme saisi (min 1 caractere)
 * @param territory       'fr' | 'ca' | null (les 2)
 * @param ranks           Filtre rang. Defaut : species + family + genus + order
 * @param classFilter     'Aves' | 'Mammalia' | 'Insecta'... (optionnel)
 * @param limit           Nombre max de resultats (defaut 20)
 */
export async function searchTaxonomy(
  query: string,
  options: {
    territory?: 'fr' | 'ca' | null
    ranks?: Array<'species' | 'genus' | 'family' | 'order' | 'class'>
    classFilter?: string | null
    limit?: number
  } = {},
): Promise<TaxonomyHit[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const q = query.trim()
  if (q.length < 1) return []

  const {
    territory = null,
    ranks = ['species', 'genus', 'family', 'order'],
    classFilter = null,
    limit = 20,
  } = options

  // Timeout client 6s (meme strategie que searchSpecies)
  const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
    setTimeout(() => resolve({ data: null, error: new Error('taxonomy search timeout 6s') }), 6000),
  )

  try {
    const rpcCall = supabase.rpc('search_taxonomy', {
      p_query: q,
      p_territory: territory,
      p_ranks: ranks,
      p_class_filter: classFilter,
      p_max_results: limit,
    })

    const result = await Promise.race([rpcCall, timeoutPromise])
    const { data, error } = result as { data: unknown; error: unknown }

    if (error) {
      console.warn('[searchService] taxonomy search failed:', (error as Error).message ?? error)
      return []
    }

    return ((data ?? []) as Record<string, unknown>[]).map(
      (row) =>
        ({
          taxonomy_node_id: String(row['id'] ?? ''),
          rank: String(row['rank'] ?? 'species') as TaxonomyHit['rank'],
          scientific_name: String(row['scientific_name'] ?? ''),
          common_name_fr: row['common_name_fr'] ? String(row['common_name_fr']) : null,
          common_name_en: row['common_name_en'] ? String(row['common_name_en']) : null,
          class: row['class'] ? String(row['class']) : null,
          family: row['family'] ? String(row['family']) : null,
          available_in_fr: Boolean(row['available_in_fr']),
          available_in_ca: Boolean(row['available_in_ca']),
          inaturalist_id: row['inaturalist_id'] ? Number(row['inaturalist_id']) : null,
          photo_url: row['photo_url'] ? String(row['photo_url']) : null,
          popularity: Number(row['popularity'] ?? 0),
          match_score: Number(row['match_score'] ?? 0),
        }) satisfies TaxonomyHit,
    )
  } catch (err) {
    console.warn('[searchService] taxonomy search exception:', err)
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
