/**
 * betaService — Client pour le systeme de cles d'acces beta
 *
 * Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + BATCH 30
 *
 * Centralise les interactions avec :
 *   - Edge Function `validate-beta-key`
 *   - Table `beta_quota_config` (lecture publique)
 *   - Table `beta_waitlist` (INSERT public)
 */

import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export type BetaKeyReason =
  | 'invalid_format'
  | 'invalid_or_used'
  | 'expired'
  | 'quota_full'
  | 'rate_limited'
  | 'server_error'

export interface BetaKeyValidation {
  valid: boolean
  reason?: BetaKeyReason
  key_id?: string
}

export interface BetaQuotaStatus {
  current_phase: number
  max_users_total: number
  current_user_count: number
  accepting_new_signups: boolean
  is_full: boolean
}

// ─── Validation d'une cle (Edge Function) ─────────────────────────────────────

/**
 * Valide une cle d'acces beta via l'Edge Function `validate-beta-key`.
 *
 * Effets de bord cote serveur :
 *   - Claim atomique de la cle (current_uses++)
 *   - Log dans beta_signup_log
 *   - Verification quota global
 *
 * Si valid=true, le caller DOIT enchainer immediatement avec `signUp(email)`.
 * Si signup echoue ensuite, la cle reste "claimee" (perdue). Acceptable
 * pour MVP — Phase 2 pourra ajouter un timeout de claim.
 */
export async function validateBetaKey(code: string): Promise<BetaKeyValidation> {
  if (!supabase) {
    return { valid: false, reason: 'server_error' }
  }

  try {
    const { data, error } = await supabase.functions.invoke<BetaKeyValidation>(
      'validate-beta-key',
      { body: { code } },
    )

    if (error) {
      // Edge Function 4xx/5xx — erreur reseau ou serveur
      return { valid: false, reason: 'server_error' }
    }

    return data ?? { valid: false, reason: 'server_error' }
  } catch {
    return { valid: false, reason: 'server_error' }
  }
}

// ─── Statut quota (public read) ────────────────────────────────────────────

/**
 * Recupere l'etat actuel du quota beta (singleton row id=1).
 * Lecture publique (RLS policy "public_read_quota").
 *
 * Utilise par la landing pour afficher un banner si beta complete.
 */
export async function getBetaQuotaStatus(): Promise<BetaQuotaStatus | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('beta_quota_config')
    .select('current_phase, max_users_total, current_user_count, accepting_new_signups')
    .eq('id', 1)
    .single()

  if (error || !data) return null

  return {
    ...data,
    is_full: !data.accepting_new_signups || data.current_user_count >= data.max_users_total,
  }
}

// ─── Waitlist (INSERT public) ────────────────────────────────────────────

export interface WaitlistEntry {
  email: string
  motivation?: string
}

/**
 * Inscrit un email a la waitlist (quota beta plein).
 * Lecture publique INSERT (RLS policy "public_insert_waitlist").
 *
 * Doublon (email deja inscrit) -> retourne success quand meme (UX-friendly).
 */
export async function joinWaitlist(
  entry: WaitlistEntry,
): Promise<{ success: boolean; alreadyOnWaitlist?: boolean }> {
  if (!supabase) return { success: false }

  const { error } = await supabase.from('beta_waitlist').insert({
    email: entry.email.trim().toLowerCase(),
    motivation: entry.motivation?.trim() || null,
  })

  if (error) {
    // Doublon UNIQUE constraint -> on considere ca comme succes (deja inscrit)
    if (error.code === '23505') {
      return { success: true, alreadyOnWaitlist: true }
    }
    return { success: false }
  }

  return { success: true }
}
