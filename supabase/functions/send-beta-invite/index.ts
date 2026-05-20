/**
 * send-beta-invite — Envoi de l'email d'invitation beta (clé d'accès)
 *
 * Demande Nicolas 2026-05-20 : remplace le `mailto:` de l'admin (qui ouvrait le
 * client mail local, sans aucun suivi) par un VRAI envoi transactionnel. C'est
 * la seule façon de savoir si le mail est parti — et de prévenir l'admin quand
 * il ne part pas.
 *
 * Flow :
 *   1. Vérifie que l'appelant est un admin actif (JWT → admin_users)
 *   2. Charge l'entrée waitlist + la clé d'accès choisie
 *   3. Vérifie la clé (active, non expirée, place disponible)
 *   4. Envoie un email HTML brandé via Resend : code + lien /welcome?code=...
 *   5. Met à jour beta_waitlist (invited_at, invited_with_key_id, invite_count,
 *      email_status, email_error) — y compris en cas d'échec, pour que l'admin
 *      voie le statut "Échec d'envoi"
 *   6. Retourne { ok, sent, reason? } au front
 *
 * verify_jwt : true — action admin authentifiée.
 *
 * Variables d'env (Supabase Dashboard → Edge Functions → Secrets) :
 *   - RESEND_API_KEY : requis pour l'envoi réel. Absent → sent:false /
 *     reason 'resend_not_configured' (l'admin le voit dans le statut).
 *   - RESEND_FROM    : optionnel, expéditeur (défaut Naturegraph <...>).
 *   - PUBLIC_APP_URL : optionnel, URL de repli si app_origin est invalide
 *     (ex. l'admin teste depuis localhost — le lien email doit rester public).
 *   - SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY : injectés.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <naturegraph.fr@gmail.com>'
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteRequest {
  /** UUID de l'entrée beta_waitlist à inviter. */
  waitlist_id?: string
  /** UUID de la clé beta à attribuer / réutiliser (resend). */
  key_id?: string
  /** Origine de l'app appelante (window.location.origin) — base du lien email. */
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
    | 'key_not_found'
    | 'key_invalid'
    | 'resend_not_configured'
    | 'resend_error'
    | 'server_error'
  detail?: string
  /** Nombre total d'envois après cette tentative (resend inclus). */
  invite_count?: number
}

function json(body: InviteResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Détermine l'URL de base publique pour le lien email.
 * Un lien localhost serait inutile pour le testeur → on retombe sur
 * PUBLIC_APP_URL si l'origine fournie n'est pas une URL https publique.
 */
function resolveAppOrigin(origin: string | undefined): string {
  const isPublicHttps =
    !!origin &&
    origin.startsWith('https://') &&
    !origin.includes('localhost') &&
    !origin.includes('127.0.0.1')
  if (isPublicHttps) return origin.replace(/\/$/, '')
  if (PUBLIC_APP_URL) return PUBLIC_APP_URL.replace(/\/$/, '')
  // Dernier repli : on renvoie quand même l'origine fournie (mieux que rien).
  return (origin ?? '').replace(/\/$/, '')
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

  // Client service_role : bypass RLS pour lire admin_users + écrire la waitlist.
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
  const { waitlist_id, key_id } = body
  if (!waitlist_id || !key_id) {
    return json({ ok: false, sent: false, reason: 'bad_request' }, 400)
  }

  try {
    // ── 3. Charger l'entrée waitlist + la clé ────────────────────────────────
    const { data: entry } = await admin
      .from('beta_waitlist')
      .select('id, email, invite_count')
      .eq('id', waitlist_id)
      .maybeSingle()
    if (!entry) {
      return json({ ok: false, sent: false, reason: 'waitlist_not_found' }, 404)
    }

    const { data: key } = await admin
      .from('beta_access_keys')
      .select('id, code, is_active, expires_at, current_uses, max_uses')
      .eq('id', key_id)
      .maybeSingle()
    if (!key) {
      return json({ ok: false, sent: false, reason: 'key_not_found' }, 404)
    }

    // La clé doit être utilisable : active, non expirée, place dispo.
    const keyUsable =
      key.is_active &&
      key.current_uses < key.max_uses &&
      new Date(key.expires_at).getTime() > Date.now()
    if (!keyUsable) {
      return json({ ok: false, sent: false, reason: 'key_invalid' }, 200)
    }

    const appOrigin = resolveAppOrigin(body.app_origin)
    const inviteLink = `${appOrigin}/welcome?code=${encodeURIComponent(key.code)}`

    // ── 4. Envoi de l'email via Resend ───────────────────────────────────────
    let sent = false
    let emailStatus: 'sent' | 'failed' = 'failed'
    let emailError: string | null = null
    let failReason: InviteResponse['reason']

    if (!RESEND_API_KEY) {
      // Mode dégradé : pas de clé Resend → l'admin doit la configurer.
      emailError = 'RESEND_API_KEY non configurée dans les secrets Supabase'
      failReason = 'resend_not_configured'
    } else {
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: entry.email,
          subject: 'Ton accès Naturegraph est prêt 🌿',
          html: buildInviteHtml({ code: key.code, inviteLink }),
        }),
      })
      if (resendResp.ok) {
        sent = true
        emailStatus = 'sent'
      } else {
        emailError = `Resend ${resendResp.status} : ${(await resendResp.text()).slice(0, 300)}`
        failReason = 'resend_error'
      }
    }

    // ── 5. Mise à jour de l'entrée waitlist (succès OU échec) ─────────────────
    // invite_count ne s'incrémente que sur un envoi réellement réussi.
    const nextCount = (entry.invite_count ?? 0) + (sent ? 1 : 0)
    await admin
      .from('beta_waitlist')
      .update({
        invited_at: new Date().toISOString(),
        invited_with_key_id: key.id,
        invite_count: nextCount,
        email_status: emailStatus,
        email_error: emailError,
      })
      .eq('id', entry.id)

    // ── 6. Réponse ───────────────────────────────────────────────────────────
    if (sent) {
      return json({ ok: true, sent: true, invite_count: nextCount })
    }
    return json(
      { ok: false, sent: false, reason: failReason, detail: emailError ?? undefined },
      failReason === 'resend_error' ? 502 : 200,
    )
  } catch (err) {
    // L'erreur détaillée est journalisée côté serveur UNIQUEMENT. On ne renvoie
    // pas son message au client : une stack trace / message brut exposerait des
    // détails internes (table, requête, chemin) — cf. CodeQL « information
    // exposure through a stack trace ». Le front affiche un message générique.
    console.error('[send-beta-invite] unexpected error:', err)
    return json({ ok: false, sent: false, reason: 'server_error' }, 500)
  }
})

/**
 * Construit l'email HTML d'invitation : design brandé Naturegraph (cohérent
 * avec send-waitlist-confirmation), code mis en avant + bouton CTA vers
 * /welcome?code=... qui pré-remplit la clé sur l'écran d'accueil.
 */
function buildInviteHtml({ code, inviteLink }: { code: string; inviteLink: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Ton accès Naturegraph</title></head>
<body style="margin:0;padding:24px 12px;background-color:#f9f6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1d36;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#ffffff;border-radius:24px 24px 0 0;padding:32px 32px 16px;text-align:center;border:1px solid #e9e6dc;border-bottom:none;">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1f1d36;letter-spacing:-0.5px;">Naturegraph</h1>
      <p style="margin:0;font-size:14px;color:#6b6982;font-style:italic;">Partageons nos émotions</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e9e6dc;border-right:1px solid #e9e6dc;text-align:center;">
      <div style="font-size:48px;margin:0 0 16px;">🌿</div>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1f1d36;">Ton accès beta est prêt !</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4869;">Une place s'est libérée pour toi. Voici ta clé d'accès personnelle pour rejoindre la beta privée de Naturegraph.</p>
      <div style="background:#f9f6ef;border:1.5px solid #5f5dd8;border-radius:20px;padding:24px 16px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#5f5dd8;text-transform:uppercase;">Ta clé d'accès</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#1f1d36;font-family:'Courier New',monospace;letter-spacing:2px;">${code}</p>
      </div>
      <a href="${inviteLink}" style="display:inline-block;background:#5f5dd8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:14px;margin:0 0 16px;">Activer mon accès</a>
      <p style="margin:0 0 4px;font-size:13px;color:#6b6982;line-height:1.55;">Le bouton t'amène sur l'écran d'accueil avec ta clé déjà pré-remplie.</p>
      <p style="margin:0;font-size:12px;color:#8a8898;line-height:1.55;">Ou copie ce lien : <br/><span style="color:#5f5dd8;word-break:break-all;">${inviteLink}</span></p>
    </td></tr>
    <tr><td style="background:#f1eee4;padding:20px 32px;border-radius:0 0 24px 24px;text-align:center;border:1px solid #e9e6dc;border-top:none;">
      <p style="margin:0 0 6px;font-size:13px;color:#4a4869;">Une question ? <a href="mailto:naturegraph.fr@gmail.com" style="color:#5f5dd8;text-decoration:none;font-weight:600;">naturegraph.fr@gmail.com</a></p>
      <p style="margin:0;font-size:12px;color:#8a8898;">© 2026 Naturegraph — Plateforme citoyenne biodiversité</p>
    </td></tr>
  </table>
</body></html>`
}
