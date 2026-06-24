/**
 * betaService : Client pour le systeme de cles d'acces beta
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

// ─── Import cohorte prelancement (admin) ───────────────────────────────────

/** Bilan d'un import d'emails dans la cohorte prelancement. */
export interface PrelaunchImportResult {
  /** Emails reellement ajoutes (source='prelaunch'). */
  added: number
  /** Ignores car deja presents dans la waitlist (doublon). */
  skippedDuplicate: number
  /** Ignores car un compte existe deja pour cet email (adresse non "vide"). */
  skippedHasAccount: number
  /** Ignores car format d'email invalide. */
  invalid: number
  /** Total de lignes fournies en entree. */
  total: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Importe une liste d'emails dans la cohorte de prelancement (source='prelaunch').
 *
 * Garde-fous (demande Nicolas 2026-06-24) :
 *   - dedup intra-liste + contre la waitlist existante (aucun doublon),
 *   - exclusion des emails ayant deja un compte (on ne garde que les adresses
 *     "vides", c.-a-d. sans profil),
 *   - validation basique du format.
 *
 * N'envoie aucune invitation : l'envoi se fait ensuite par vagues via l'admin.
 *
 * @param rawEmails - emails colles par l'admin (un par ligne, virgules ou espaces).
 */
export async function importPrelaunchEmails(rawEmails: string[]): Promise<PrelaunchImportResult> {
  const empty: PrelaunchImportResult = {
    added: 0,
    skippedDuplicate: 0,
    skippedHasAccount: 0,
    invalid: 0,
    total: 0,
  }
  if (!supabase) return empty

  // 1. Normalisation + dedup intra-liste + validation format.
  const seen = new Set<string>()
  let invalid = 0
  const candidates: string[] = []
  for (const raw of rawEmails) {
    const email = raw.trim().toLowerCase()
    if (!email) continue
    if (!EMAIL_RE.test(email)) {
      invalid++
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)
    candidates.push(email)
  }
  const total = invalid + candidates.length
  if (candidates.length === 0) return { ...empty, invalid, total }

  // 2. Emails deja dans la waitlist (doublon) et emails ayant deja un compte.
  const [{ data: existingWl }, { data: existingProfiles }] = await Promise.all([
    supabase.from('beta_waitlist').select('email').in('email', candidates),
    supabase.from('profiles').select('email').in('email', candidates),
  ])
  const inWaitlist = new Set((existingWl ?? []).map((r) => (r.email ?? '').toLowerCase()))
  const hasAccount = new Set(
    (existingProfiles ?? []).map((r) => (r.email ?? '').toLowerCase()).filter(Boolean),
  )

  let skippedDuplicate = 0
  let skippedHasAccount = 0
  const toInsert: { email: string; source: string }[] = []
  for (const email of candidates) {
    if (hasAccount.has(email)) {
      skippedHasAccount++
      continue
    }
    if (inWaitlist.has(email)) {
      skippedDuplicate++
      continue
    }
    toInsert.push({ email, source: 'prelaunch' })
  }

  // 3. Insertion en masse. ignoreDuplicates couvre une eventuelle course
  //    (insertion concurrente entre le check et l'insert).
  let added = 0
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('beta_waitlist')
      .upsert(toInsert, { onConflict: 'email', ignoreDuplicates: true })
      .select('id')
    if (error) {
      // Echec global : on remonte 0 ajout, le reste du bilan reste informatif.
      return { added: 0, skippedDuplicate, skippedHasAccount, invalid, total }
    }
    added = data?.length ?? 0
  }

  return { added, skippedDuplicate, skippedHasAccount, invalid, total }
}

// ─── Invitation beta depuis la waitlist (admin) ────────────────────────────

/** Raison d'échec renvoyée par l'Edge Function `send-beta-invite`. */
export type BetaInviteReason =
  | 'not_admin'
  | 'bad_request'
  | 'waitlist_not_found'
  | 'already_member'
  | 'rate_limited'
  | 'invite_error'
  | 'server_error'

/** Résultat d'un envoi (ou renvoi) d'invitation beta. */
export interface BetaInviteResult {
  /** true si l'invitation a été envoyée. */
  ok: boolean
  /** true uniquement si l'email d'invitation est réellement parti. */
  sent: boolean
  /** Précise l'échec pour l'affichage admin (statut + toast). */
  reason?: BetaInviteReason
  /** Nombre total d'invitations envoyées après cette tentative. */
  invite_count?: number
}

/**
 * Envoie (ou renvoie) l'invitation beta à une entrée de la waitlist.
 *
 * Invoque l'Edge Function `send-beta-invite` qui, côté serveur :
 *   - vérifie que l'appelant est un admin actif,
 *   - appelle `auth.admin.inviteUserByEmail` : Supabase Auth envoie lui-même
 *     l'email d'invitation, par le même canal que les emails de login,
 *   - met à jour le suivi sur `beta_waitlist` (invited_at, email_status…).
 *
 * @param waitlistId - UUID de l'entrée `beta_waitlist`.
 */
export async function sendBetaInvite(waitlistId: string): Promise<BetaInviteResult> {
  if (!supabase) return { ok: false, sent: false, reason: 'server_error' }

  try {
    const { data, error } = await supabase.functions.invoke<BetaInviteResult>('send-beta-invite', {
      body: {
        waitlist_id: waitlistId,
        // Base du lien de retour : l'environnement d'où l'admin invite
        // (dev/staging/prod) → le testeur revient sur le bon site.
        app_origin: window.location.origin,
      },
    })

    if (data) return data

    // Sur statut HTTP non-2xx, supabase-js renvoie une FunctionsHttpError dont
    // le body JSON détaillé est porté par `error.context` (objet Response).
    // On le parse pour conserver la `reason` précise (not_admin, rate_limited…).
    if (error) {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          return (await ctx.json()) as BetaInviteResult
        } catch {
          /* body non-JSON : on retombe sur server_error ci-dessous */
        }
      }
    }

    return { ok: false, sent: false, reason: 'server_error' }
  } catch {
    return { ok: false, sent: false, reason: 'server_error' }
  }
}
