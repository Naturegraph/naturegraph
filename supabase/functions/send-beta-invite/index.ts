/**
 * send-beta-invite — Invitation beta via Supabase Auth
 *
 * Demande Nicolas 2026-05-20 : l'invitation doit partir par le MÊME canal que
 * les emails d'authentification (le code de login). On utilise donc
 * `auth.admin.inviteUserByEmail` : Supabase Auth crée le compte invité et
 * envoie lui-même l'email d'invitation via son SMTP configuré. Aucune
 * dépendance Resend / SMTP côté Edge Function — zéro config email à part.
 *
 * Flow :
 *   1. Vérifie que l'appelant est un admin actif (JWT → admin_users)
 *   2. Charge l'entrée waitlist (email)
 *   3. Clé beta personnelle (batch 99, max_uses=1, exp 365j) passée via
 *      data.beta_code pour affichage dans le template ({{ .Data.beta_code }}).
 *      RENVOI (Nicolas 2026-06-06) : si une clé non consommée existe déjà pour
 *      cet email, on la RÉUTILISE (même code à chaque relance) ; sinon on en
 *      génère/INSERT une nouvelle (1er envoi, comportement inchangé).
 *   4. inviteUserByEmail → crée le compte + envoie l'email d'invitation
 *      (template Supabase « Invite user », lien d'activation cliquable)
 *      Rollback de la clé si l'envoi échoue ou si le user est déjà membre.
 *   5. Met à jour beta_waitlist (invited_at, invite_count, email_status, email_error)
 *   6. Retourne { ok, sent, reason? }
 *
 * Renvoi : si l'invité n'a pas encore activé son compte, on supprime le compte
 * en attente puis on ré-invite — garantit un lien d'invitation frais.
 *
 * L'invité clique le lien de l'email → session créée → arrive sur /onboarding.
 *
 * verify_jwt : true — action admin authentifiée.
 *
 * Variables d'env (injectées par Supabase) :
 *   - SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *   - PUBLIC_APP_URL : optionnel, URL de repli si app_origin est invalide.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteRequest {
  /** UUID de l'entrée beta_waitlist à inviter. */
  waitlist_id?: string
  /** Origine de l'app appelante (window.location.origin) — base du lien de retour. */
  app_origin?: string
}

/** Réponse renvoyée au front. `reason` précise l'échec pour l'affichage admin. */
interface InviteResponse {
  ok: boolean
  sent: boolean
  reason?:
    | 'not_admin'
    | 'bad_request'
    | 'waitlist_not_found'
    | 'already_member'
    | 'rate_limited'
    | 'invite_error'
    | 'server_error'
  /** Nombre total d'invitations envoyées après cette tentative. */
  invite_count?: number
}

function json(body: InviteResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * URL de base publique pour le lien de retour de l'invitation.
 * Un lien localhost serait inutile pour le testeur → repli sur PUBLIC_APP_URL.
 */
function resolveAppOrigin(origin: string | undefined): string {
  const isPublicHttps =
    !!origin &&
    origin.startsWith('https://') &&
    !origin.includes('localhost') &&
    !origin.includes('127.0.0.1')
  if (isPublicHttps) return origin.replace(/\/$/, '')
  if (PUBLIC_APP_URL) return PUBLIC_APP_URL.replace(/\/$/, '')
  return (origin ?? '').replace(/\/$/, '')
}

/** Message court et lisible persisté dans beta_waitlist.email_error. */
function reasonToMessage(reason: InviteResponse['reason']): string {
  switch (reason) {
    case 'rate_limited':
      return "Trop d'envois en peu de temps — réessaie dans quelques minutes."
    case 'invite_error':
      return "Supabase n'a pas pu envoyer l'email d'invitation."
    default:
      return "L'invitation n'a pas pu être envoyée."
  }
}

/**
 * Génère un code beta de la forme NG-XXXX-XXXX (8 chars alphanumériques,
 * majuscules + chiffres, séparés par un tiret). Format aligné sur les codes
 * générés par la RPC `generate_beta_keys` côté SQL.
 *
 * Note : la collision sur `beta_access_keys.code` (UNIQUE) est extrêmement
 * improbable (~36^8 = 2,8e12 combinaisons). L'INSERT remontera l'erreur si
 * collision et le caller peut retry — non géré ici pour la simplicité.
 */
function generateBetaCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = (len: number): string => {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => chars[b % chars.length]).join('')
  }
  return `NG-${random(4)}-${random(4)}`
}

/** Batch dédié aux invitations individuelles waitlist (vs vagues admin manuelles). */
const WAITLIST_INVITE_BATCH = 99
/** Durée de validité de la clé personnelle d'invitation (1 an — beta longue). */
const INVITE_KEY_EXPIRES_DAYS = 365

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ ok: false, sent: false, reason: 'bad_request' }, 405)
  }

  // ── 1. Authentification : l'appelant doit être un admin actif ──────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return json({ ok: false, sent: false, reason: 'not_admin' }, 401)
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return json({ ok: false, sent: false, reason: 'not_admin' }, 401)
  }

  // Client service_role : bypass RLS + accès à l'admin Auth API.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: adminRow } = await admin
    .from('admin_users')
    .select('id, is_active')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!adminRow) {
    return json({ ok: false, sent: false, reason: 'not_admin' }, 403)
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: InviteRequest
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, sent: false, reason: 'bad_request' }, 400)
  }
  if (!body.waitlist_id) {
    return json({ ok: false, sent: false, reason: 'bad_request' }, 400)
  }

  try {
    // ── 3. Charger l'entrée waitlist ─────────────────────────────────────────
    const { data: entry } = await admin
      .from('beta_waitlist')
      .select('id, email, invite_count')
      .eq('id', body.waitlist_id)
      .maybeSingle()
    if (!entry) {
      return json({ ok: false, sent: false, reason: 'waitlist_not_found' }, 404)
    }

    const appOrigin = resolveAppOrigin(body.app_origin)
    // Au clic du lien de l'email, l'invité est redirigé ici (session créée).
    const redirectTo = `${appOrigin}/onboarding`

    // ── 4. Clé beta personnelle pour cet invité ──────────────────────────────
    // Demande Nicolas 2026-05-20 : chaque invité reçoit SA clé beta dans l'email
    // pour pouvoir re-rentrer dans la beta s'il perd sa session.
    //
    // Nicolas 2026-06-06 (relance) : au RENVOI, on réutilise la clé déjà émise
    // pour cet email si elle n'a jamais été consommée (current_uses = 0). Ainsi
    // un user relancé reçoit le MÊME code qu'à la 1re invitation (cohérence +
    // pas de prolifération de clés orphelines). Premier envoi : aucune clé
    // existante -> on en génère une (comportement inchangé, donc zéro impact
    // sur les nouveaux invités).
    const inviteNote = `Invitation waitlist: ${entry.email}`
    let inviteeBetaCode: string
    let reusedExistingKey = false
    let keyErr: { message: string } | null = null

    const { data: existingKey } = await admin
      .from('beta_access_keys')
      .select('code')
      .eq('notes', inviteNote)
      .eq('current_uses', 0)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingKey?.code) {
      // Relance : on réutilise la clé non consommée déjà associée à cet email.
      inviteeBetaCode = existingKey.code
      reusedExistingKey = true
    } else {
      // Premier envoi (ou clé précédente déjà consommée) : nouvelle clé.
      inviteeBetaCode = generateBetaCode()
      const insertRes = await admin.from('beta_access_keys').insert({
        code: inviteeBetaCode,
        batch_number: WAITLIST_INVITE_BATCH,
        max_uses: 1,
        expires_at: new Date(Date.now() + INVITE_KEY_EXPIRES_DAYS * 86_400_000).toISOString(),
        notes: inviteNote,
      })
      keyErr = insertRes.error
      if (keyErr) {
        // Très improbable (collision UNIQUE sur code) — on log et on bascule
        // l'invitation sans code (l'email partira mais sans {{ .Data.beta_code }}).
        // Le user pourra toujours reentrer via login OTP — fail soft.
        console.error('[send-beta-invite] beta key insert failed:', keyErr.message)
      }
    }

    const inviteOptions = {
      redirectTo,
      data: {
        invited_via: 'beta_waitlist',
        // beta_code consommé par le template Supabase via {{ .Data.beta_code }}
        // (cf. supabase/email-templates/invite-user.html). Vide si keyErr.
        beta_code: keyErr ? '' : inviteeBetaCode,
      },
    }

    // ── 5. Invitation via Supabase Auth ──────────────────────────────────────
    let sent = false
    let reason: InviteResponse['reason']

    const invite = await admin.auth.admin.inviteUserByEmail(entry.email, inviteOptions)
    if (!invite.error) {
      sent = true
    } else {
      const msg = invite.error.message?.toLowerCase() ?? ''
      if (msg.includes('rate') || invite.error.status === 429) {
        reason = 'rate_limited'
      } else if (msg.includes('already') || msg.includes('registered') || msg.includes('exist')) {
        // Le compte existe déjà. Confirmé → déjà membre. Non confirmé → une
        // invitation est en attente : on la régénère (suppression + ré-invite)
        // pour garantir au testeur un lien d'activation frais et valide.
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = list.data?.users.find(
          (u) => u.email?.toLowerCase() === entry.email.toLowerCase(),
        )
        if (existing?.email_confirmed_at) {
          // Déjà membre actif → rien à envoyer, on ne touche pas la waitlist.
          // On supprime la clé qu'on venait de créer (orpheline) — mais JAMAIS
          // une clé réutilisée (pré-existante), qui doit rester valide.
          if (!keyErr && !reusedExistingKey) {
            await admin.from('beta_access_keys').delete().eq('code', inviteeBetaCode)
          }
          return json({ ok: false, sent: false, reason: 'already_member' }, 200)
        }
        if (existing) {
          await admin.auth.admin.deleteUser(existing.id)
          const retry = await admin.auth.admin.inviteUserByEmail(entry.email, inviteOptions)
          if (!retry.error) sent = true
          else reason = 'invite_error'
        } else {
          reason = 'invite_error'
        }
      } else {
        reason = 'invite_error'
      }
    }

    // Si l'envoi a échoué : on supprime la clé créée pour rien — mais jamais
    // une clé réutilisée (pré-existante), qui doit rester valide pour un
    // prochain renvoi.
    if (!sent && !keyErr && !reusedExistingKey) {
      await admin.from('beta_access_keys').delete().eq('code', inviteeBetaCode)
    }

    // ── 6. Suivi sur beta_waitlist (succès OU échec) ─────────────────────────
    const nextCount = (entry.invite_count ?? 0) + (sent ? 1 : 0)
    await admin
      .from('beta_waitlist')
      .update({
        invited_at: new Date().toISOString(),
        invite_count: nextCount,
        email_status: sent ? 'sent' : 'failed',
        email_error: sent ? null : reasonToMessage(reason),
      })
      .eq('id', entry.id)

    // ── 7. Réponse ───────────────────────────────────────────────────────────
    if (sent) {
      return json({ ok: true, sent: true, invite_count: nextCount })
    }
    return json({ ok: false, sent: false, reason }, reason === 'rate_limited' ? 429 : 200)
  } catch (err) {
    // Erreur journalisée côté serveur uniquement — on ne renvoie pas le détail
    // au client (cf. CodeQL « information exposure through a stack trace »).
    console.error('[send-beta-invite] unexpected error:', err)
    return json({ ok: false, sent: false, reason: 'server_error' }, 500)
  }
})
