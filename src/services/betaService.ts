/**
 * betaService : Client pour le systeme de cles d'acces beta
 *
 * Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + BATCH 30
 *
 * Note (Lot 0 chantier qualite, 2026-08-19) : l'app est en acces ouvert
 * (`OPEN_ACCESS_ENABLED`), le gate est donc inerte mais conserve comme
 * interrupteur reversible. Ce service ne garde que la machinerie du gate :
 *   - `checkBetaAccessKey` / `validateBetaKey` (validation d'une cle)
 *   - `joinWaitlist` (INSERT public dans `beta_waitlist`)
 * Les fonctions d'administration (import cohorte, envoi d'invitations, statut
 * quota) ont ete retirees avec l'ecran AdminBeta.
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

// ─── Validation READ-ONLY (BATCH 45 : welcome screen) ──────────────────────

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
 * pour MVP : Phase 2 pourra ajouter un timeout de claim.
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
      // Edge Function 4xx/5xx : erreur reseau ou serveur
      return { valid: false, reason: 'server_error' }
    }

    return data ?? { valid: false, reason: 'server_error' }
  } catch {
    return { valid: false, reason: 'server_error' }
  }
}

// ─── Waitlist (INSERT public) ────────────────────────────────────────────

export interface WaitlistEntry {
  email: string
  motivation?: string
  /**
   * Opt-in explicite pour les communications marketing (RGPD art. 6/7).
   * FALSE par defaut : l'email de cle d'acces reste transactionnel et part
   * independamment de ce consentement. L'horodatage de preuve est pose cote
   * serveur par trigger, jamais transmis par le client.
   */
  marketingConsent?: boolean
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
    marketing_consent: entry.marketingConsent ?? false,
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
