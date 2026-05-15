/**
 * send-waitlist-confirmation — Email de confirmation après INSERT beta_waitlist
 *
 * BATCH 77 (2026-05-15) : déclenchée automatiquement via trigger PostgreSQL
 * + pg_net (cf. migration `20260515_waitlist_send_confirmation_trigger.sql`).
 *
 * Flow :
 *   1. INSERT dans public.beta_waitlist
 *   2. Trigger PostgreSQL `waitlist_send_confirmation` appelle cette function via pg_net
 *   3. La function calcule la position (#X sur Y inscrits)
 *   4. Envoie un email HTML branded via Resend si RESEND_API_KEY configuré
 *   5. Si pas de RESEND_API_KEY : log + return 200 OK (mode degrade gracieux)
 *
 * Variables d'env (à configurer dans Supabase Dashboard → Edge Functions → Secrets) :
 *   - RESEND_API_KEY  : clé API Resend (https://resend.com/api-keys) — requis pour envoyer
 *   - RESEND_FROM     : optionnel, default "Naturegraph <naturegraph.fr@gmail.com>"
 *   - SUPABASE_URL    : injecté automatiquement
 *   - SUPABASE_SERVICE_ROLE_KEY : injecté automatiquement
 *
 * verify_jwt : false (declenché par trigger DB, pas par user client)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <naturegraph.fr@gmail.com>'

interface WaitlistRecord {
  id: string
  email: string
  motivation: string | null
  created_at: string
}

Deno.serve(async (req: Request) => {
  let payload: { record?: WaitlistRecord; type?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const record = payload.record
  if (!record?.email || !record?.id) {
    return new Response('Missing record.email or record.id', { status: 400 })
  }

  // 1. Recuperer la position dans la waitlist (ordre created_at ascendant)
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: rows, error: dbErr } = await supa
    .from('beta_waitlist')
    .select('id, created_at')
    .order('created_at', { ascending: true })

  if (dbErr) {
    console.error('[send-waitlist-confirmation] DB error:', dbErr.message)
    return new Response(JSON.stringify({ ok: false, reason: 'db_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const total = rows?.length ?? 0
  const rank = (rows?.findIndex((r) => r.id === record.id) ?? -1) + 1

  // 2. Si pas de RESEND_API_KEY -> mode degrade (log + return OK)
  if (!RESEND_API_KEY) {
    console.log(
      `[send-waitlist-confirmation] Pas de RESEND_API_KEY — skip envoi. Position #${rank}/${total} pour ${record.email}`,
    )
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: 'resend_not_configured', rank, total }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // 3. Construire le HTML email
  const html = buildWaitlistHtml({ rank, total })

  // 4. Envoyer via Resend API
  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: record.email,
      subject: `Tu es sur la waitlist Naturegraph (#${rank}) 🌿`,
      html,
    }),
  })

  if (!resendResp.ok) {
    const errText = await resendResp.text()
    console.error('[send-waitlist-confirmation] Resend error:', errText)
    return new Response(
      JSON.stringify({ ok: false, reason: 'resend_error', detail: errText, rank, total }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ ok: true, sent: true, rank, total }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function buildWaitlistHtml({ rank, total }: { rank: number; total: number }): string {
  const totalLabel = total > 1 ? `${total} inscrits` : `${total} inscrit`
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Bienvenue sur la waitlist Naturegraph</title></head>
<body style="margin:0;padding:24px 12px;background-color:#f9f6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1d36;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#ffffff;border-radius:24px 24px 0 0;padding:32px 32px 16px;text-align:center;border:1px solid #e9e6dc;border-bottom:none;">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1f1d36;letter-spacing:-0.5px;">Naturegraph</h1>
      <p style="margin:0;font-size:14px;color:#6b6982;font-style:italic;">Partageons nos émotions</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e9e6dc;border-right:1px solid #e9e6dc;text-align:center;">
      <div style="font-size:48px;margin:0 0 16px;">🌿</div>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1f1d36;">Tu es sur la waitlist !</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4869;">Merci de ton intérêt pour Naturegraph. Tu fais partie des explorateurs qui rejoignent l'aventure.</p>
      <div style="background:#f9f6ef;border:1.5px solid #5f5dd8;border-radius:20px;padding:24px 16px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#5f5dd8;text-transform:uppercase;">Ta position</p>
        <p style="margin:0 0 4px;font-size:42px;font-weight:700;color:#1f1d36;">#${rank}</p>
        <p style="margin:0;font-size:13px;color:#6b6982;">sur ${totalLabel}</p>
      </div>
      <p style="margin:0 0 8px;font-size:14px;color:#1f1d36;line-height:1.55;">On t'enverra un email avec ta clé d'accès dès qu'une place se libère.</p>
      <p style="margin:0;font-size:13px;color:#6b6982;line-height:1.55;">En attendant, retrouve-nous sur Discord pour suivre l'aventure !</p>
    </td></tr>
    <tr><td style="background:#f1eee4;padding:20px 32px;border-radius:0 0 24px 24px;text-align:center;border:1px solid #e9e6dc;border-top:none;">
      <p style="margin:0 0 6px;font-size:13px;color:#4a4869;">Une question ? <a href="mailto:naturegraph.fr@gmail.com" style="color:#5f5dd8;text-decoration:none;font-weight:600;">naturegraph.fr@gmail.com</a></p>
      <p style="margin:0;font-size:12px;color:#8a8898;">© 2026 Naturegraph — Plateforme citoyenne biodiversité</p>
    </td></tr>
  </table>
</body></html>`
}
