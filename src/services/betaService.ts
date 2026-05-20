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

// ─── Validation READ-ONLY (BATCH 45 — welcome screen) ──────────────────────

/**
 * Verifie la validite d'une cle beta SANS la consommer.
 *
 * Differe de `validateBetaKey()` qui claim la cle.
 *
 * Use case (Nicolas BATCH 45) : welcome screen `/welcome` permet d'entrer
 * un code pour debloquer l'acces au site. La cle n'est consommee qu'au
 * signup final (via `validateBetaKey()` -> claim_beta_access_key).
 *
 * Permet a un user d'ouvrir le site, voir la landing, puis signup quand pret.
 */
export async function checkBetaAccessKey(code: string): Promise<BetaKeyValidation> {
  if (!supabase) {
    return { valid: false, reason: 'server_error' }
  }

  try {
    const { data, error } = await supabase.rpc('check_beta_access_key_validity', {
      p_code: code.trim().toUpperCase(),
    })

    if (error) {
      // Erreur reseau ou RPC
      return { valid: false, reason: 'server_error' }
    }

    // RPC retourne TABLE(valid, reason) -> array avec 1 row
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { valid: false, reason: 'server_error' }

    return {
      valid: row.valid === true,
      reason: row.reason as BetaKeyReason | undefined,
    }
  } catch {
    return { valid: false, reason: 'server_error' }
  }
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

// ─── Invitation beta depuis la waitlist (admin) ────────────────────────────

/** Raison d'échec renvoyée par l'Edge Function `send-beta-invite`. */
export type BetaInviteReason =
  | 'not_admin'
  | 'bad_request'
  | 'waitlist_not_found'
  | 'key_not_found'
  | 'key_invalid'
  | 'resend_not_configured'
  | 'resend_error'
  | 'server_error'

/** Résultat d'un envoi (ou renvoi) d'invitation beta. */
export interface BetaInviteResult {
  /** true si l'opération a abouti ET l'email est parti. */
  ok: boolean
  /** true uniquement si l'email a réellement été envoyé via Resend. */
  sent: boolean
  /** Précise l'échec pour l'affichage admin (statut + toast). */
  reason?: BetaInviteReason
  /** Détail technique de l'échec (message Resend, erreur serveur…). */
  detail?: string
  /** Nombre total d'envois après cette tentative (resend inclus). */
  invite_count?: number
}

/**
 * Envoie (ou renvoie) l'email d'invitation beta à une entrée de la waitlist.
 *
 * Invoque l'Edge Function `send-beta-invite` qui, côté serveur :
 *   - vérifie que l'appelant est un admin actif,
 *   - envoie un email transactionnel via Resend (code + lien /welcome?code=),
 *   - met à jour le suivi sur `beta_waitlist` (invited_at, email_status…).
 *
 * Remplace l'ancien `mailto:` qui n'offrait aucune garantie d'envoi.
 *
 * @param waitlistId - UUID de l'entrée `beta_waitlist`.
 * @param keyId      - UUID de la clé à attribuer (ou à réutiliser au renvoi).
 */
export async function sendBetaInvite(waitlistId: string, keyId: string): Promise<BetaInviteResult> {
  if (!supabase) return { ok: false, sent: false, reason: 'server_error' }

  try {
    const { data, error } = await supabase.functions.invoke<BetaInviteResult>('send-beta-invite', {
      body: {
        waitlist_id: waitlistId,
        key_id: keyId,
        // Base du lien email : l'environnement d'où l'admin invite
        // (dev/staging/prod) → le testeur reçoit un lien cohérent.
        app_origin: window.location.origin,
      },
    })

    if (data) return data

    // Sur statut HTTP non-2xx, supabase-js renvoie une FunctionsHttpError dont
    // le body JSON détaillé est porté par `error.context` (objet Response).
    // On le parse pour conserver la `reason` précise (not_admin, resend_error…).
    if (error) {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          return (await ctx.json()) as BetaInviteResult
        } catch {
          /* body non-JSON — on retombe sur server_error ci-dessous */
        }
      }
      return { ok: false, sent: false, reason: 'server_error', detail: error.message }
    }

    return { ok: false, sent: false, reason: 'server_error' }
  } catch (err) {
    return {
      ok: false,
      sent: false,
      reason: 'server_error',
      detail: err instanceof Error ? err.message : undefined,
    }
  }
}
