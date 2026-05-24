/**
 * notebookService, Carnets d'observations partagés
 *
 * Tables :
 *  - notebooks (id, author_id, title, description, visibility, cover_image_url, ...)
 *  - notebook_observations (notebook_id, observation_id, added_at), table de jointure
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Notebook {
  id: string
  author_id: string
  title: string
  description: string | null
  visibility: 'public' | 'followers' | 'private'
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateNotebookPayload {
  title: string
  description?: string
  visibility?: Notebook['visibility']
  cover_image_url?: string
}

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré, notebookService indisponible')
  }
  return supabase
}

/** Liste des carnets d'un auteur. */
export async function listNotebooks(authorId: string): Promise<Notebook[]> {
  const c = ensureClient()
  const { data, error } = await c
    .from('notebooks')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Notebook[]
}

/** Récupère un carnet par ID. */
export async function getNotebook(notebookId: string): Promise<Notebook | null> {
  const c = ensureClient()
  const { data, error } = await c.from('notebooks').select('*').eq('id', notebookId).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Notebook | null
}

/** Crée un nouveau carnet. */
export async function createNotebook(
  authorId: string,
  payload: CreateNotebookPayload,
): Promise<Notebook> {
  const c = ensureClient()
  const { data, error } = await c
    .from('notebooks')
    .insert({ author_id: authorId, ...payload })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Notebook
}

/** Met à jour un carnet. */
export async function updateNotebook(
  notebookId: string,
  patch: Partial<CreateNotebookPayload>,
): Promise<Notebook> {
  const c = ensureClient()
  const { data, error } = await c
    .from('notebooks')
    .update(patch)
    .eq('id', notebookId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Notebook
}

/** Supprime un carnet (cascade supprime les observations liées). */
export async function deleteNotebook(notebookId: string): Promise<void> {
  const c = ensureClient()
  const { error } = await c.from('notebooks').delete().eq('id', notebookId)
  if (error) throw new Error(error.message)
}

/** Ajoute une observation (post) à un carnet. */
export async function addObservationToNotebook(
  notebookId: string,
  observationId: string,
): Promise<void> {
  const c = ensureClient()
  const { error } = await c
    .from('notebook_observations')
    .insert({ notebook_id: notebookId, observation_id: observationId })
  if (error) throw new Error(error.message)
}

/** Retire une observation d'un carnet. */
export async function removeObservationFromNotebook(
  notebookId: string,
  observationId: string,
): Promise<void> {
  const c = ensureClient()
  const { error } = await c
    .from('notebook_observations')
    .delete()
    .eq('notebook_id', notebookId)
    .eq('observation_id', observationId)
  if (error) throw new Error(error.message)
}

/** Liste les IDs d'observations d'un carnet. */
export async function listNotebookObservationIds(notebookId: string): Promise<string[]> {
  const c = ensureClient()
  const { data, error } = await c
    .from('notebook_observations')
    .select('observation_id')
    .eq('notebook_id', notebookId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.observation_id as string)
}
