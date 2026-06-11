/**
 * identificationService, Propositions d'identification collaborative (NG-039)
 * ============================================================================
 *
 * Cycle (V1.3.0) : un auteur demande de l'aide -> la communaute PROPOSE des
 * especes et VOTE -> classement par votes. (La validation par l'auteur =
 * NG-039C, version ulterieure.)
 *
 * Tables :
 *   - identification_proposals : 1 ligne par espece proposee sur un post
 *     (id, post_id, author_id, species_name, scientific_name, taxref_id,
 *      confidence, notes, is_undetermined, votes_up [compteur denormalise], ...)
 *   - identification_votes : 1 vote par (proposal_id, user_id) [UNIQUE].
 *     Un trigger maintient identification_proposals.votes_up.
 *
 * Securite : aucune erreur SQL brute n'est exposee (cf [[feedback-security-from-start]],
 * lib/sanitizeError). Le detail technique est loggue en console, l'appelant
 * recoit un message generique.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { GENERIC_ERROR_MESSAGE } from '@/lib/sanitizeError'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IdentificationProposal {
  id: string
  post_id: string
  author_id: string
  species_name: string
  scientific_name: string | null
  taxref_id: string | null
  confidence: string | null
  notes: string | null
  /** NG-039 : proposition speciale "Impossible a identifier". */
  is_undetermined: boolean
  /** Compteur denormalise (= nb de lignes identification_votes), maintenu par trigger. */
  votes_up: number
  votes_down: number
  created_at: string
}

/** Proposition enrichie de l'etat de vote de l'utilisateur courant (UI). */
export interface ProposalWithVote extends IdentificationProposal {
  /** true si l'utilisateur courant a vote pour cette proposition. */
  hasVoted: boolean
}

export interface CreateProposalPayload {
  post_id: string
  species_name: string
  scientific_name?: string
  taxref_id?: string
  confidence?: number
  notes?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré, identificationService indisponible')
  }
  return supabase
}

/**
 * Log le detail technique + leve une erreur au message generique (jamais de
 * message Postgres/PostgREST brut a l'ecran). [[feedback-security-from-start]]
 */
function failClean(context: string, error: unknown): never {
  console.error(`[identificationService] ${context}`, error)
  throw new Error(GENERIC_ERROR_MESSAGE)
}

// ─── Lecture ────────────────────────────────────────────────────────────────

/**
 * Liste les propositions d'un post, classees par votes decroissants puis par
 * anciennete (la plus ancienne d'abord a egalite). Enrichit chaque proposition
 * d'un flag `hasVoted` pour l'utilisateur courant (si fourni).
 */
export async function listProposalsWithVotes(
  postId: string,
  currentUserId?: string,
): Promise<ProposalWithVote[]> {
  const c = ensureClient()
  const { data, error } = await c
    .from('identification_proposals')
    .select('*')
    .eq('post_id', postId)
    .order('votes_up', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) failClean('listProposalsWithVotes', error)

  const proposals = (data ?? []) as IdentificationProposal[]
  if (proposals.length === 0) return []

  // Etat de vote de l'utilisateur courant (1 requete groupee).
  let votedIds = new Set<string>()
  if (currentUserId) {
    const ids = proposals.map((p) => p.id)
    const { data: votes, error: vErr } = await c
      .from('identification_votes')
      .select('proposal_id')
      .eq('user_id', currentUserId)
      .in('proposal_id', ids)
    if (vErr) {
      // Non bloquant : on affiche les propositions meme si l'etat de vote echoue.
      console.warn('[identificationService] etat de vote indisponible', vErr)
    } else {
      votedIds = new Set((votes ?? []).map((v) => v.proposal_id as string))
    }
  }

  return proposals.map((p) => ({ ...p, hasVoted: votedIds.has(p.id) }))
}

// ─── Ecriture : proposer / voter ─────────────────────────────────────────────

/**
 * Proposer une espece OU voter pour une proposition existante.
 *
 * Regle NG-039 : si une proposition existe deja pour la meme espece (meme
 * taxref_id, ou meme nom a defaut), on ajoute simplement un vote (+1) au lieu de
 * creer un doublon. Sinon on cree la proposition ET on vote automatiquement
 * pour elle (proposer = soutenir). Idempotent sur le vote (UNIQUE en DB).
 *
 * @returns l'id de la proposition concernee.
 */
export async function proposeOrVote(
  userId: string,
  payload: CreateProposalPayload,
): Promise<string> {
  const c = ensureClient()

  // 1. Cherche une proposition equivalente deja presente sur ce post.
  const { data: existing, error: findErr } = await c
    .from('identification_proposals')
    .select('id, taxref_id, species_name')
    .eq('post_id', payload.post_id)
  if (findErr) failClean('proposeOrVote.find', findErr)

  const match = (existing ?? []).find((p) =>
    payload.taxref_id
      ? p.taxref_id === payload.taxref_id
      : p.species_name?.toLowerCase().trim() === payload.species_name.toLowerCase().trim(),
  )

  // 2a. Existe deja -> on vote pour elle.
  if (match) {
    await voteProposal(userId, match.id as string)
    return match.id as string
  }

  // 2b. Sinon -> creation + auto-vote.
  const { data: created, error: insErr } = await c
    .from('identification_proposals')
    .insert({
      author_id: userId,
      post_id: payload.post_id,
      species_name: payload.species_name,
      scientific_name: payload.scientific_name ?? null,
      taxref_id: payload.taxref_id ?? null,
      confidence: payload.confidence != null ? String(payload.confidence) : null,
      notes: payload.notes ?? null,
    })
    .select('id')
    .single()
  if (insErr) failClean('proposeOrVote.insert', insErr)

  const proposalId = (created as { id: string }).id
  await voteProposal(userId, proposalId)
  return proposalId
}

/**
 * Proposer / voter "Impossible a identifier avec les elements disponibles".
 * Une seule proposition `is_undetermined` par post ; les suivants votent dessus.
 */
export async function proposeUndetermined(userId: string, postId: string): Promise<string> {
  const c = ensureClient()
  const { data: existing, error: findErr } = await c
    .from('identification_proposals')
    .select('id')
    .eq('post_id', postId)
    .eq('is_undetermined', true)
    .maybeSingle()
  if (findErr) failClean('proposeUndetermined.find', findErr)

  if (existing) {
    await voteProposal(userId, (existing as { id: string }).id)
    return (existing as { id: string }).id
  }

  const { data: created, error: insErr } = await c
    .from('identification_proposals')
    .insert({
      author_id: userId,
      post_id: postId,
      species_name: 'Impossible à identifier',
      is_undetermined: true,
    })
    .select('id')
    .single()
  if (insErr) failClean('proposeUndetermined.insert', insErr)

  const proposalId = (created as { id: string }).id
  await voteProposal(userId, proposalId)
  return proposalId
}

/** Ajoute le vote de l'utilisateur a une proposition (idempotent). */
export async function voteProposal(userId: string, proposalId: string): Promise<void> {
  const c = ensureClient()
  const { error } = await c
    .from('identification_votes')
    .insert({ user_id: userId, proposal_id: proposalId })
  // 23505 = doublon (UNIQUE) : l'user a deja vote -> succes silencieux.
  if (error && (error as { code?: string }).code !== '23505') {
    failClean('voteProposal', error)
  }
}

/** Retire le vote de l'utilisateur d'une proposition. */
export async function removeVote(userId: string, proposalId: string): Promise<void> {
  const c = ensureClient()
  const { error } = await c
    .from('identification_votes')
    .delete()
    .eq('user_id', userId)
    .eq('proposal_id', proposalId)
  if (error) failClean('removeVote', error)
}

/**
 * Bascule le vote : vote si l'user n'a pas vote, retire sinon. Pratique pour un
 * bouton unique cote UI. Renvoie le nouvel etat (true = a vote).
 */
export async function toggleVote(
  userId: string,
  proposalId: string,
  currentlyVoted: boolean,
): Promise<boolean> {
  if (currentlyVoted) {
    await removeVote(userId, proposalId)
    return false
  }
  await voteProposal(userId, proposalId)
  return true
}

/** Supprime une proposition (auteur de la proposition uniquement, via RLS). */
export async function deleteProposal(proposalId: string): Promise<void> {
  const c = ensureClient()
  const { error } = await c.from('identification_proposals').delete().eq('id', proposalId)
  if (error) failClean('deleteProposal', error)
}
