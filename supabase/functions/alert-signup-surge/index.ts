/**
 * alert-signup-surge : alerte email en cas de pic d'inscriptions (NG-041)
 * =============================================================================
 *
 * Objectif : prevenir le fondateur si le volume d'inscriptions depasse un seuil
 * (defaut 50 en 1 heure), signe possible d'un afflux anormal (bot, campagne
 * inattendue, incident). En acces ouvert, c'est un garde-fou operationnel.
 *
 * Declenchement : appelee par le trigger DB notify_signup_surge sur
 * auth.users (cf migration 20260717_signup_surge_alert.sql). Le trigger fait le
 * COMPTAGE et le anti-spam (au plus 1 alerte / heure) cote SQL, pour ne PAS
 * invoquer cette fonction a chaque inscription (eco-conception : appel seulement
 * quand le seuil est franchi). Cette fonction ne fait que formater + envoyer
 * l'email d'alerte via Resend.
 *
 * Securite : interne, authentifiee par x-cron-secret (meme secret que les
 * crons NG-045). verify_jwt = false.
 *
 * Sentry : pas de DSN serveur pour l'instant (cf NG-001), on logge en
 * console.error. A brancher sur Sentry quand un SENTRY_DSN existera.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <support@naturegraph.ca>'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
// Destinataire de l'alerte. Defaut : l'adresse ops monitoree. Peut etre
// surchargee par un secret ALERT_EMAIL (ex: email perso du fondateur).
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') ?? 'support@naturegraph.ca'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface Payload {
  count?: number
  window_hours?: number
  threshold?: number
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

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const count = typeof payload.count === 'number' ? payload.count : null
  const windowHours = payload.window_hours ?? 1
  const threshold = payload.threshold ?? 50

  if (count === null) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_count' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  // Mode degrade : sans cle Resend, on logge et on repond OK (l'alerte n'est pas
  // bloquante ; le log reste visible dans les logs Supabase).
  if (!RESEND_API_KEY) {
    console.error(
      `[alert-signup-surge] (no RESEND_API_KEY) Pic inscriptions : ${count} en ${windowHours}h (seuil ${threshold})`,
    )
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: 'resend_not_configured' }),
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    )
  }

  const subject = `[Naturegraph] Pic d'inscriptions : ${count} en ${windowHours}h`
  const html = `<!doctype html>
<html lang="fr"><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2a2a3a;line-height:1.5;">
  <h2 style="color:#5f5dd8;margin:0 0 12px;">Pic d'inscriptions detecte</h2>
  <p style="margin:0 0 8px;">Le volume d'inscriptions vient de depasser le seuil de surveillance.</p>
  <table style="border-collapse:collapse;margin:12px 0;font-size:15px;">
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Inscriptions</td><td style="font-weight:700;">${count}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Fenetre</td><td>${windowHours} heure(s)</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b6981;">Seuil</td><td>${threshold}</td></tr>
  </table>
  <p style="margin:0 0 8px;">Verifie le panel admin et les logs si ce pic n'est pas attendu (bot, afflux anormal).</p>
  <p style="margin:16px 0 0;font-size:12px;color:#8a8898;">Alerte automatique Naturegraph (NG-041). Au plus une alerte par heure.</p>
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
      console.error('[alert-signup-surge] Resend error:', errText)
      return new Response(JSON.stringify({ ok: false, reason: 'resend_error', detail: errText }), {
        status: 502,
        headers: JSON_HEADERS,
      })
    }

    return new Response(JSON.stringify({ ok: true, sent: true, to: ALERT_EMAIL, count }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (err) {
    console.error('[alert-signup-surge] unexpected error:', err)
    return new Response(JSON.stringify({ ok: false, reason: 'server_error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})
