/**
 * identificationService — Propositions d'identification collaborative
 *
 * Table : identification_proposals
 *   (id, post_id, author_id, species_name, scientific_name, taxref_id,
 *    confidence, notes, votes_up, votes_down, created_at)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface IdentificationProposal {
  id: string
  post_id: string
  author_id: string
  species_name: string
  scientific_name: string | null
  taxref_id: string | null
  confidence: number | null
  notes: string | null
  votes_up: number
  votes_down: number
  created_at: string
}

export interface CreateProposalPayload {
  post_id: string
  species_name: string
  scientific_name?: string
  taxref_id?: string
  confidence?: number
  notes?: string
}

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré — identificationService indisponible')
  }
  return supabase
}

/** Liste des propositions d'identification d'un post (triées par votes décroissants). */
export async function listProposals(postId: string): Promise<IdentificationProposal[]> {
  const c = ensureClient()
  const { data, error } = await c
    .from('identification_proposals')
    .select('*')
    .eq('post_id', postId)
    .order('votes_up', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as IdentificationProposal[]
}

/** Crée une proposition d'identification. */
export async function createProposal(
  authorId: string,
  payload: CreateProposalPayload,
): Promise<IdentificationProposal> {
  const c = ensureClient()
  const { data, error } = await c
    .from('identification_proposals')
    .insert({ author_id: authorId, ...payload })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as IdentificationProposal
}

/** Supprime une proposition. */
export async function deleteProposal(proposalId: string): Promise<void> {
  const c = ensureClient()
  const { error } = await c.from('identification_proposals').delete().eq('id', proposalId)
  if (error) throw new Error(error.message)
}
