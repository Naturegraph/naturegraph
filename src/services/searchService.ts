/**
 * searchService : Recherche globale espèces + profils
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
 * 2026-05-19 (Nicolas) : suppression du mock local COMMON_SPECIES : on
 * teste en condition réelle uniquement. Si Supabase est indisponible, on
 * retourne un tableau vide (l'UI EncounterStep2 propose alors le fallback
 * "Ajouter à valider par la communauté").
 *
 * Règle de sécurité : aucune API externe (GBIF, Wikidata, iNat) n'est
 * appelée directement depuis le front : toujours via une table Supabase
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
 * TaxonomyHit : V1.1.0 (BDD taxonomy_nodes).
 *
 * Etend SpeciesHit avec :
 *   - rank : 'species' | 'family' | 'genus' | 'order' (permet fallback famille
 *     quand l'espece n'est pas trouvee, demande Nicolas 2026-05-26)
 *   - taxonomy_node_id : UUID stable pour FK posts.taxonomy_node_id
 *   - available_in_fr / available_in_ca : drapeaux territoire pour UI
 *   - class : pour afficher la categorie (Aves, Insecta, etc.)
 */
export interface TaxonomyHit {
  /** UUID de taxonomy_nodes.id : utilise comme FK pour posts.taxonomy_node_id */
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

// ─── Recherche espèces ────────────────────────────────────────────────────────

/**
 * searchSpecies : Recherche dans species_master (GBIF + Wikidata, Phase 1).
 *
 * Stratégie :
 *   1. Supabase + species_master + ILIKE % multi-colonnes
 *      (les 3 indexes gin_trgm_ops sur common_name_fr / scientific_name /
 *      common_name_en accélèrent les ILIKE).
 *   2. Tri par popularity DESC pour mettre les espèces communes en haut.
 *   3. Si Supabase indisponible : retourne [] (l'UI propose alors le fallback
 *      "Ajouter à valider par la communauté" : cf. EncounterStep2).
 *
 * @param query  Terme saisi (minimum 2 caractères)
 * @param limit  Nombre max de résultats (défaut 10)
 * @param group  Filtrer par groupe taxonomique (optionnel)
 */
/**
 * Mapping iNat class -> taxonomic_group legacy (cohérent avec ancien filtre UI).
 * Permet de garder le filtre par classe sans casser l'interface SpeciesHit.
 */
const CLASS_TO_GROUP_LABEL: Record<string, string> = {
  Aves: 'birds',
  Mammalia: 'mammals',
  Insecta: 'insects',
  Amphibia: 'amphibians',
  Reptilia: 'reptiles',
  Actinopterygii: 'fish',
  Arachnida: 'arachnids',
  Mollusca: 'mollusks',
}
const GROUP_TO_CLASS_FILTER: Record<string, string> = Object.fromEntries(
  Object.entries(CLASS_TO_GROUP_LABEL).map(([k, v]) => [v, k]),
)

/**
 * Pre-chauffe la connexion Supabase + le plan RPC en faisant une requete
 * factice ASAP apres login. Evite que la 1ere recherche utilisateur subisse
 * le cold start serverless.
 *
 * A appeler depuis AuthContext / App boot apres que l user est authentifie.
 * Best-effort : pas de gestion d erreur, on log juste.
 */
export async function warmupTaxonomySearch(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  try {
    await supabase.rpc('search_taxonomy', {
      p_query: 'a',
      p_ranks: ['species'],
      p_max_results: 1,
    })
  } catch {
    // Best-effort, on ignore
  }
}

/**
 * Helper interne : appel RPC avec retry automatique sur timeout (V1.1.1+).
 * Le cold start Supabase serverless peut prendre 3-5s pour la 1ere requete
 * d une session. On retry 1 fois si la 1ere echoue par timeout, ce qui
 * laisse 30s total pour eviter qu un user voie un "loader infini".
 */
/**
 * NG-006B : detecte une erreur de token expire / non authentifie.
 * Apres une mise en veille mobile, l'access token expire et la requete part
 * avec ce token -> PostgREST renvoie 401 / PGRST301 (JWT expired). On veut
 * alors forcer un refresh de session puis rejouer (fix "recherche cassee apres
 * veille en sortie terrain").
 */
function isAuthExpiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; status?: number }
  if (e.code === 'PGRST301') return true
  if (e.status === 401) return true
  return /jwt (expired|invalid)|invalid token|not authenticated|401/i.test(String(e.message ?? ''))
}

async function rpcWithRetry(
  rpcFn: () => PromiseLike<{ data: unknown; error: unknown }>,
  timeoutMs: number,
  label: string,
): Promise<{ data: unknown; error: unknown }> {
  const tryOnce = async (): Promise<{ data: unknown; error: unknown }> => {
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error(`${label} timeout ${timeoutMs / 1000}s`) }),
        timeoutMs,
      ),
    )
    return Promise.race([rpcFn() as Promise<{ data: unknown; error: unknown }>, timeoutPromise])
  }
  let result = await tryOnce()
  // Retry 1 : cold start serverless (timeout).
  if (result.error && /timeout/i.test((result.error as Error).message ?? '')) {
    console.info(`[searchService] ${label} retry after timeout (cold start ?)`)
    result = await tryOnce()
  }
  // Retry 2 (NG-006B) : token expire apres veille -> refresh session + rejoue.
  // Corrige "recherche espece morte apres veille" sans refresh manuel.
  if (result.error && isAuthExpiredError(result.error)) {
    console.info(`[searchService] ${label} token expire -> refresh session + retry`)
    try {
      await supabase?.auth.refreshSession()
    } catch {
      /* best-effort */
    }
    result = await tryOnce()
  }
  return result
}

export async function searchSpecies(
  query: string,
  limit = 10,
  group?: string,
): Promise<SpeciesHit[]> {
  // V1.1.0+ : delegue a search_taxonomy() (45 764 nodes vs 4 835 species_master legacy).
  // Garde l'interface SpeciesHit stable pour ne pas casser les composants existants.
  if (!isSupabaseConfigured || !supabase) return []

  const q = query.trim()
  if (q.length < 2) return []

  const classFilter = group ? (GROUP_TO_CLASS_FILTER[group] ?? null) : null

  try {
    const result = await rpcWithRetry(
      () =>
        supabase!.rpc('search_taxonomy', {
          p_query: q,
          p_territory: undefined,
          p_ranks: ['species'],
          p_class_filter: classFilter ?? undefined,
          p_max_results: limit,
        }),
      8000,
      'species search',
    )
    const { data, error } = result

    if (error) {
      console.warn('[searchService] search_taxonomy failed:', (error as Error).message ?? error)
      return []
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const cls = row['class'] ? String(row['class']) : null
      return {
        taxref_id: String(row['id'] ?? ''),
        scientific_name: String(row['scientific_name'] ?? ''),
        common_name: row['common_name_fr'] ? String(row['common_name_fr']) : null,
        group_label: cls ? (CLASS_TO_GROUP_LABEL[cls] ?? 'other') : null,
      } satisfies SpeciesHit
    })
  } catch (err) {
    console.warn('[searchService] species search exception:', err)
    return []
  }
}

// ─── Recherche taxonomie V1.1.0 (BDD taxonomy_nodes) ────────────────────────

/**
 * searchTaxonomy : Recherche dans la nouvelle BDD taxonomy_nodes (V1.1.0).
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

  try {
    // V1.1.1 : retry automatique sur timeout pour absorber le cold start
    const result = await rpcWithRetry(
      () =>
        supabase!.rpc('search_taxonomy', {
          p_query: q,
          p_territory: territory ?? undefined,
          p_ranks: ranks,
          p_class_filter: classFilter ?? undefined,
          p_max_results: limit,
        }),
      8000,
      'taxonomy search',
    )
    const { data, error } = result

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
    // V1.1.4 NG-027 (Nicolas 2026-06-03) : on log en error (vs warn) et
    // on RE-THROW pour permettre aux consommateurs (EncounterStep2,
    // SearchPanel via React Query) de distinguer "zero resultat" de
    // "panne reseau" et afficher un message specifique au user.
    console.error('[searchService] taxonomy search network/exception failure:', err)
    throw err instanceof Error ? err : new Error('Taxonomy search failed')
  }
}

// ─── Recherche profils ────────────────────────────────────────────────────────

/**
 * searchProfiles : Recherche profils par username, prénom, nom.
 * ILIKE simple : MVP. Full-text en Phase 2.
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
