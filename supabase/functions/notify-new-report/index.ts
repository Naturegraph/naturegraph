/**
 * notify-new-report : alerte email a chaque nouveau signalement (NG-036)
 * =============================================================================
 *
 * En acces ouvert, la file de signalements doit etre traitee vite. Cette
 * fonction envoie un email immediat a l'equipe (support@naturegraph.ca) des
 * qu'un signalement est cree, avec un lien vers le panel admin.
 *
 * Declenchement : trigger DB notify_new_report sur moderation_reports AFTER
 * INSERT (cf migration 20260717_report_alerts.sql). Le trigger compte aussi les
 * signalements sur le MEME contenu dans la derniere heure et passe urgent=true
 * au-dela de 3 (Task 3 : signal d'un contenu problematique a traiter en
 * urgence).
 *
 * Securite : interne, authentifiee par x-cron-secret. verify_jwt = false.
 * Sentry : pas de DSN serveur (cf NG-001), on logge en console.error pour les
 * cas urgents ; a brancher sur Sentry plus tard.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <support@naturegraph.ca>'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') ?? 'support@naturegraph.ca'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://naturegraph.ca'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface Payload {
  report_id?: string
  target_type?: string
  target_id?: string
  reason?: string
  reporter_id?: string
  same_content_count?: number
  urgent?: boolean
}

/** Echappe le HTML pour eviter toute injection dans l'email (contenu user). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: JSON_HEADERS })
  }

  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: JSON_HEADERS,
    })
  }

  let p: Payload
  try {
    p = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const targetType = p.target_type ?? 'contenu'
  const targetId = p.target_id ?? '?'
  const reason = p.reason ?? '?'
  const sameCount = p.same_content_count ?? 1
  const urgent = p.urgent === true

  // Cas urgent (>3 signalements sur le meme contenu en 1h) : trace serveur en
  // attendant un vrai canal Sentry. Task 3.
  if (urgent) {
    console.error(
      `[notify-new-report] URGENT : ${sameCount} signalements sur ${targetType} ${targetId} en <1h`,
    )
  }

  if (!RESEND_API_KEY) {
    console.error(
      `[notify-new-report] (no RESEND_API_KEY) Signalement ${targetType} ${targetId} (${reason})`,
    )
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: 'resend_not_configured' }),
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    )
  }

  const subject = urgent
    ? `[URGENT] ${sameCount} signalements sur un ${esc(targetType)} en 1h`
    : `[Naturegraph] Nouveau signalement : ${esc(targetType)}`

  const adminUrl = `${APP_BASE_URL}/admin/moderation`
  const html = `<!doctype html>
<html lang="fr"><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2a2a3a;line-height:1.5;">
  <h2 style="color:${urgent ? '#c0392b' : '#5f5dd8'};margin:0 0 12px;">${urgent ? 'Signalements repetes a traiter en urgence' : 'Nouveau signalement'}</h2>
  <table style="border-collapse:collapse;margin:12px 0;font-size:15px;">
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Type de contenu</td><td style="font-weight:700;">${esc(targetType)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Cible</td><td>${esc(targetId)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Motif</td><td>${esc(reason)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Signalements (1h)</td><td>${sameCount}</td></tr>
  </table>
  <p style="margin:16px 0;"><a href="${adminUrl}" style="background:#5f5dd8;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;">Ouvrir la file de moderation</a></p>
  <p style="margin:16px 0 0;font-size:12px;color:#8a8898;">Alerte automatique Naturegraph (NG-036).</p>
</body></html>`

  try {
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: ALERT_EMAIL, subject, html }),
    })

    if (!resendResp.ok) {
      const errText = await resendResp.text()
      console.error('[notify-new-report] Resend error:', errText)
      return new Response(JSON.stringify({ ok: false, reason: 'resend_error', detail: errText }), {
        status: 502,
        headers: JSON_HEADERS,
      })
    }

    return new Response(
      JSON.stringify({ ok: true, sent: true, urgent, same_content_count: sameCount }),
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    )
  } catch (err) {
    console.error('[notify-new-report] unexpected error:', err)
    return new Response(JSON.stringify({ ok: false, reason: 'server_error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})
