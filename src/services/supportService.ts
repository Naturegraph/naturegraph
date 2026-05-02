/**
 * supportService — Submission des tickets de support
 * ====================================================
 *
 * Wrapper autour de la table `support_tickets` (cf. migration
 * `20260502_settings_phase2_complete.sql`).
 *
 * Flux :
 *   1. UI (SettingsHelpView) appelle `submitHelpRequest(payload)`
 *   2. INSERT dans `support_tickets` (RLS : user own only)
 *   3. (Phase 2 optionnel) Edge Function relaye sur Discord webhook pour
 *      notification temps-réel à l'équipe
 *   4. Email transactionnel staff via Resend (Phase 3)
 *
 * Anti-spam :
 *   - Limit 3 tickets / 24h / user (vérification DB côté serveur via trigger
 *     ou RPC dédiée — pas en client). Le compte est aussi rate-limité côté
 *     useSubmitHelpRequest pour donner un feedback immédiat.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * Cast d'échappement vers le client Supabase non typé.
 *
 * `support_tickets` est une table créée par la migration
 * `20260502_settings_phase2_complete.sql` qui n'est pas encore reflétée dans
 * `src/types/supabase.ts` (les types sont régénérés à l'application de la
 * migration via `npx supabase gen types typescript`). En attendant, on passe
 * par un client typé en `any` uniquement pour les opérations sur cette table.
 *
 * À RETIRER dès que les types Supabase sont regénérés avec la table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

/** Sujets autorisés (cf. CHECK constraint SQL). */
export type SupportSubject = 'technical' | 'help' | 'suggestion' | 'report' | 'other'

export interface SubmitHelpRequestPayload {
  subject: SupportSubject
  /** Message de l'utilisateur. Min 20 chars enforced par CHECK constraint SQL. */
  message: string
}

export interface SupportTicket {
  id: string
  user_id: string | null
  subject: SupportSubject
  message: string
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  email_sent: boolean
  created_at: string
  resolved_at: string | null
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Soumet un ticket de support. RLS impose `user_id = auth.uid()`.
 * Retourne le ticket créé (avec son `id` UUID).
 *
 * @throws Error si Supabase non configuré ou si l'INSERT échoue (RLS,
 * validation longueur, rate limit DB).
 */
export async function submitHelpRequest(payload: SubmitHelpRequestPayload): Promise<SupportTicket> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré')
  }

  // L'utilisateur doit être authentifié (RLS bloque sinon).
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Authentification requise pour envoyer un message')
  }

  const trimmedMessage = payload.message.trim()
  if (trimmedMessage.length < 20) {
    throw new Error('Le message doit contenir au moins 20 caractères')
  }

  const { data, error } = await sb
    .from('support_tickets')
    .insert({
      user_id: user.id,
      subject: payload.subject,
      message: trimmedMessage,
    })
    .select('*')
    .single()

  if (error) {
    // Code 23514 = check_violation (longueur message). 42501 = RLS deny.
    throw new Error(error.message)
  }

  return data as unknown as SupportTicket
}

/**
 * Liste les tickets de l'utilisateur connecté (transparence RGPD).
 * Optionnel — pas utilisé par SettingsHelpView mais pratique pour une page
 * "Mes demandes" plus tard.
 */
export async function listMyTickets(): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await sb
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupportTicket[]
}
