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
 *   3. inviteUserByEmail → crée le compte + envoie l'email d'invitation
 *      (template Supabase « Invite user », lien d'activation cliquable)
 *   4. Met à jour beta_waitlist (invited_at, invite_count, email_status, email_error)
 *   5. Retourne { ok, sent, reason? }
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
    const inviteOptions = { redirectTo, data: { invited_via: 'beta_waitlist' } }

    // ── 4. Invitation via Supabase Auth ──────────────────────────────────────
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

    // ── 5. Suivi sur beta_waitlist (succès OU échec) ─────────────────────────
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

    // ── 6. Réponse ───────────────────────────────────────────────────────────
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
