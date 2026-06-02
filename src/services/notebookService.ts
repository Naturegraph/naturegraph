/**
 * notebookService, V1.2.0 Carnets d observations (NG-005 + NG-006)
 *
 * Source de verite pour les carnets d observations. Un carnet est une sortie
 * terrain qui regroupe plusieurs especes (avec count individus + classe
 * taxonomique pour categorisation auto). A la publication, 1 carnet produit
 * 1 post unique dans le feed (posts.notebook_id non null).
 *
 * Statuts (cf NG-006) :
 *   - draft     : brouillon en cours de saisie
 *   - active    : sortie en cours (mode terrain, timer demarre)
 *   - finished  : sortie finalisee, en attente de publication
 *   - published : publie en feed (lien post_id)
 *   - archived  : conservation historique, masque du feed
 *
 * Tables :
 *   - notebooks (1 ligne par carnet)
 *   - notebook_observations (1 ligne par espece dans le carnet)
 *
 * Cf migration : supabase/migrations/20260602_v1_2_0_notebooks_schema.sql
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotebookStatus = 'draft' | 'active' | 'finished' | 'published' | 'archived'

export interface Notebook {
  id: string
  user_id: string
  title: string | null
  description: string | null
  status: NotebookStatus
  started_at: string | null
  finished_at: string | null
  latitude: number | null
  longitude: number | null
  location_name: string | null
  city: string | null
  region: string | null
  country: string | null
  post_id: string | null
  species_count: number
  observations_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NotebookObservation {
  id: string
  notebook_id: string
  taxref_id: string
  species_name: string
  scientific_name: string | null
  /** Classe vernaculaire pour categorisation auto (ex : "Mammiferes", "Oiseaux"). */
  vernacular_class: string | null
  individuals_count: number
  observed_at: string
  notes: string | null
  rank: number
  created_at: string
}

/** Carnet enrichi avec sa liste d observations (utilise par les vues detail / publication / feed). */
export interface NotebookWithObservations extends Notebook {
  observations: NotebookObservation[]
}

export interface CreateNotebookPayload {
  title?: string | null
  description?: string | null
  status?: NotebookStatus
  started_at?: string | null
  latitude?: number | null
  longitude?: number | null
  location_name?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateNotebookPayload extends Partial<CreateNotebookPayload> {
  finished_at?: string | null
  post_id?: string | null
  status?: NotebookStatus
}

export interface AddObservationPayload {
  taxref_id: string
  species_name: string
  scientific_name?: string | null
  vernacular_class?: string | null
  individuals_count?: number
  notes?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function client() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configure, notebookService indisponible')
  }
  return supabase
}

// ─── Carnets : CRUD ───────────────────────────────────────────────────────────

/**
 * Cree un nouveau carnet (par defaut en status='draft').
 * Pour demarrer une "sortie terrain" : passer status='active' + started_at.
 */
export async function createNotebook(
  userId: string,
  payload: CreateNotebookPayload = {},
): Promise<Notebook> {
  const c = client()
  const { data, error } = await c
    .from('notebooks')
    .insert({
      user_id: userId,
      title: payload.title ?? null,
      description: payload.description ?? null,
      status: payload.status ?? 'draft',
      started_at: payload.started_at ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      location_name: payload.location_name ?? null,
      city: payload.city ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      metadata: payload.metadata ?? {},
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Notebook
}

export async function getNotebook(notebookId: string): Promise<Notebook | null> {
  const c = client()
  const { data, error } = await c.from('notebooks').select('*').eq('id', notebookId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Notebook) ?? null
}

export async function getNotebookWithObservations(
  notebookId: string,
): Promise<NotebookWithObservations | null> {
  const c = client()
  const { data, error } = await c
    .from('notebooks')
    .select('*, observations:notebook_observations(*)')
    .eq('id', notebookId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const notebook = data as unknown as Notebook & { observations: NotebookObservation[] }
  // Tri par rank pour conserver ordre d ajout / regroupement UI
  notebook.observations = [...(notebook.observations ?? [])].sort((a, b) => a.rank - b.rank)
  return notebook as NotebookWithObservations
}

export async function updateNotebook(
  notebookId: string,
  patch: UpdateNotebookPayload,
): Promise<Notebook> {
  const c = client()
  const { data, error } = await c
    .from('notebooks')
    .update(patch)
    .eq('id', notebookId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Notebook
}

export async function deleteNotebook(notebookId: string): Promise<void> {
  const c = client()
  const { error } = await c.from('notebooks').delete().eq('id', notebookId)
  if (error) throw new Error(error.message)
}

// ─── Carnets : Listes ─────────────────────────────────────────────────────────

/**
 * Liste les carnets d un user, filtrable par statut.
 * Sans filtre = tous statuts confondus (recents en haut).
 */
export async function listUserNotebooks(
  userId: string,
  opts: { statuses?: NotebookStatus[]; limit?: number } = {},
): Promise<Notebook[]> {
  const c = client()
  let q = c
    .from('notebooks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? 20)
  if (opts.statuses && opts.statuses.length > 0) {
    q = q.in('status', opts.statuses)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Notebook[]
}

/**
 * Carnet actif (status draft ou active) de l user.
 * Utilise au boot pour recovery (cf NG-006 "ferme l app et revient le lendemain").
 * Si plusieurs (ne devrait pas arriver avec UI "1 actif a la fois"), retourne le plus recent.
 */
export async function getActiveNotebookForUser(userId: string): Promise<Notebook | null> {
  const c = client()
  const { data, error } = await c
    .from('notebooks')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['draft', 'active'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Notebook) ?? null
}

// ─── Observations : CRUD ──────────────────────────────────────────────────────

export async function listNotebookObservations(notebookId: string): Promise<NotebookObservation[]> {
  const c = client()
  const { data, error } = await c
    .from('notebook_observations')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('rank', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as NotebookObservation[]
}

/**
 * Ajoute une espece au carnet. Si l espece existe deja (meme taxref_id),
 * on incremente individuals_count au lieu de creer une 2eme ligne
 * (regle UNIQUE (notebook_id, taxref_id)).
 */
export async function addObservation(
  notebookId: string,
  payload: AddObservationPayload,
): Promise<NotebookObservation> {
  const c = client()

  // Verifie si l espece existe deja dans le carnet
  const { data: existing, error: lookupError } = await c
    .from('notebook_observations')
    .select('*')
    .eq('notebook_id', notebookId)
    .eq('taxref_id', payload.taxref_id)
    .maybeSingle()
  if (lookupError) throw new Error(lookupError.message)

  if (existing) {
    const newCount = (existing.individuals_count ?? 1) + (payload.individuals_count ?? 1)
    return updateObservation(existing.id, { individuals_count: newCount })
  }

  // Sinon : insert avec rank = max + 1 du carnet
  const { data: maxRow } = await c
    .from('notebook_observations')
    .select('rank')
    .eq('notebook_id', notebookId)
    .order('rank', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextRank = ((maxRow?.rank as number | undefined) ?? -1) + 1

  const { data, error } = await c
    .from('notebook_observations')
    .insert({
      notebook_id: notebookId,
      taxref_id: payload.taxref_id,
      species_name: payload.species_name,
      scientific_name: payload.scientific_name ?? null,
      vernacular_class: payload.vernacular_class ?? null,
      individuals_count: payload.individuals_count ?? 1,
      notes: payload.notes ?? null,
      rank: nextRank,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as NotebookObservation
}

export async function updateObservation(
  observationId: string,
  patch: Partial<{
    individuals_count: number
    notes: string | null
    species_name: string
    scientific_name: string | null
    vernacular_class: string | null
    rank: number
    observed_at: string
  }>,
): Promise<NotebookObservation> {
  const c = client()
  const { data, error } = await c
    .from('notebook_observations')
    .update(patch)
    .eq('id', observationId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as NotebookObservation
}

export async function removeObservation(observationId: string): Promise<void> {
  const c = client()
  const { error } = await c.from('notebook_observations').delete().eq('id', observationId)
  if (error) throw new Error(error.message)
}

/** Pratique : remove par (notebookId, taxref_id) sans connaitre l id. */
export async function removeObservationByTaxref(
  notebookId: string,
  taxrefId: string,
): Promise<void> {
  const c = client()
  const { error } = await c
    .from('notebook_observations')
    .delete()
    .eq('notebook_id', notebookId)
    .eq('taxref_id', taxrefId)
  if (error) throw new Error(error.message)
}

// ─── Helpers utilitaires UI ───────────────────────────────────────────────────

/**
 * Regroupe les observations par classe vernaculaire pour l affichage NG-005.
 * Retourne un tableau [{ class: "Mammiferes", items: [...] }, ...] trie par
 * ordre d apparition de la premiere observation de chaque classe (preserve
 * l ordre chronologique d ajout dans le carnet).
 */
export function groupObservationsByClass(
  observations: NotebookObservation[],
): Array<{ vernacularClass: string; items: NotebookObservation[] }> {
  const groups = new Map<string, NotebookObservation[]>()
  const order: string[] = []
  for (const obs of observations) {
    const key = obs.vernacular_class ?? 'Autres'
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(obs)
  }
  return order.map((vernacularClass) => ({
    vernacularClass,
    items: groups.get(vernacularClass)!,
  }))
}

/**
 * Resout l emoji + ordre canonique pour une classe vernaculaire.
 * Fallback "Autres" (sparkles) si inconnu. Aligne avec TAXONOMIC_GROUP_CONFIG
 * existant cote front pour coherence visuelle.
 */
export function classDisplayConfig(vernacularClass: string | null): {
  emoji: string
  label: string
} {
  const key = (vernacularClass ?? '').toLowerCase()
  // Mapping FR + EN courants (taxonomy_nodes peut retourner les deux)
  const map: Record<string, { emoji: string; label: string }> = {
    mammifères: { emoji: '🐿️', label: 'Mammifères' },
    mammiferes: { emoji: '🐿️', label: 'Mammifères' },
    mammalia: { emoji: '🐿️', label: 'Mammifères' },
    mammals: { emoji: '🐿️', label: 'Mammifères' },
    oiseaux: { emoji: '🦉', label: 'Oiseaux' },
    aves: { emoji: '🦉', label: 'Oiseaux' },
    birds: { emoji: '🦉', label: 'Oiseaux' },
    insectes: { emoji: '🦋', label: 'Insectes' },
    insecta: { emoji: '🦋', label: 'Insectes' },
    insects: { emoji: '🦋', label: 'Insectes' },
    amphibiens: { emoji: '🐸', label: 'Amphibiens' },
    amphibia: { emoji: '🐸', label: 'Amphibiens' },
    amphibians: { emoji: '🐸', label: 'Amphibiens' },
    reptiles: { emoji: '🦎', label: 'Reptiles' },
    reptilia: { emoji: '🦎', label: 'Reptiles' },
    poissons: { emoji: '🐟', label: 'Poissons' },
    actinopterygii: { emoji: '🐟', label: 'Poissons' },
    fish: { emoji: '🐟', label: 'Poissons' },
    arachnides: { emoji: '🕷️', label: 'Arachnides' },
    arachnida: { emoji: '🕷️', label: 'Arachnides' },
    arachnids: { emoji: '🕷️', label: 'Arachnides' },
    mollusques: { emoji: '🐌', label: 'Mollusques' },
    mollusca: { emoji: '🐌', label: 'Mollusques' },
    mollusks: { emoji: '🐌', label: 'Mollusques' },
    plantes: { emoji: '🌿', label: 'Plantes' },
    plantae: { emoji: '🌿', label: 'Plantes' },
    plants: { emoji: '🌿', label: 'Plantes' },
  }
  return map[key] ?? { emoji: '✨', label: vernacularClass ?? 'Autres' }
}

/**
 * Cree un carnet "instantane" lors de la publication d une Rencontre nature
 * multi-especes. L user n a pas explicitement demarre un mode terrain : on
 * cree le carnet directement en status='published', lie au post.
 *
 * Permet de NE PAS PERDRE les especes additionnelles qui etaient saisies dans
 * EncounterStep2 mais jamais persistees avant V1.2.0 (cf bug "seule la 1ere
 * espece sauvegardee" dans ContributeEncounterForm.tsx).
 *
 * Retourne le carnet cree avec ses observations.
 */
export async function createPublishedNotebookFromEncounter(
  userId: string,
  payload: {
    postId: string
    title?: string | null
    location_name?: string | null
    city?: string | null
    region?: string | null
    country?: string | null
    latitude?: number | null
    longitude?: number | null
    started_at?: string | null
  },
  species: Array<AddObservationPayload>,
): Promise<Notebook> {
  const c = client()
  const now = new Date().toISOString()

  // 1. Insert notebook
  const { data: notebook, error: nbErr } = await c
    .from('notebooks')
    .insert({
      user_id: userId,
      title: payload.title ?? null,
      status: 'published',
      started_at: payload.started_at ?? now,
      finished_at: now,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      location_name: payload.location_name ?? null,
      city: payload.city ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      post_id: payload.postId,
    })
    .select()
    .single()
  if (nbErr) throw new Error(nbErr.message)
  const nb = notebook as unknown as Notebook

  // 2. Insert observations en batch (les triggers maintiennent species_count)
  if (species.length > 0) {
    const rows = species.map((s, idx) => ({
      notebook_id: nb.id,
      taxref_id: s.taxref_id,
      species_name: s.species_name,
      scientific_name: s.scientific_name ?? null,
      vernacular_class: s.vernacular_class ?? null,
      individuals_count: s.individuals_count ?? 1,
      notes: s.notes ?? null,
      rank: idx,
    }))
    const { error: obsErr } = await c.from('notebook_observations').insert(rows)
    if (obsErr) throw new Error(obsErr.message)
  }

  return nb
}

/**
 * Finalise un carnet existant (status=published) et le lie a un post.
 * Utilise quand l user a "repris un carnet en cours" depuis Rencontre nature
 * puis publie.
 */
export async function publishExistingNotebookForPost(
  notebookId: string,
  postId: string,
  patch: Partial<UpdateNotebookPayload> = {},
): Promise<Notebook> {
  return updateNotebook(notebookId, {
    ...patch,
    status: 'published',
    post_id: postId,
    finished_at: new Date().toISOString(),
  })
}

/**
 * Calcule "il y a X minutes" pour le bandeau mode actif (NG-006 "Debut: 08h14").
 * Format compact pour bandeau sticky : "12 min", "1 h 24", "3 h 02".
 */
export function formatElapsedSinceStart(startedAt: string | null): string {
  if (!startedAt) return ''
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const minutes = Math.max(0, Math.floor((now - start) / 60000))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h ${m.toString().padStart(2, '0')}`
}
