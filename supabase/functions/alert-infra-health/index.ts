/**
 * alert-infra-health : alerte quotidienne sur les seuils d'infrastructure
 * =============================================================================
 * NG-037 (quotas et coûts) + NG-035 (délivrabilité).
 *
 * Ne décide de rien : la mesure et les seuils vivent dans la fonction SQL
 * check_infra_health(), appelée par un cron quotidien. Cette fonction se
 * contente de mettre en forme et d'envoyer l'email quand un seuil est franchi.
 *
 * Surveille (cf. migration 20260722_infra_health_check.sql) :
 *   - quota Resend journalier et mensuel (plan gratuit : 100/jour, 3000/mois)
 *   - taille base, taille storage, connexions Postgres
 *   - taux de rejet (bounce) et de plainte spam
 *
 * Le quota journalier est le seuil le plus critique : les codes de connexion
 * partent par Resend, donc l'atteindre empêcherait les utilisateurs de se
 * connecter. C'est une panne d'authentification, pas un simple dépassement.
 *
 * Sécurité : interne, authentifiée par x-cron-secret. verify_jwt = false.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { serveWithSentry } from '../_shared/sentry.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <support@naturegraph.ca>'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') ?? 'support@naturegraph.ca'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface Alerte {
  /** Intitulé lisible, ex "Quota Resend journalier". */
  libelle: string
  /** Valeur courante formatée, ex "82 / 100". */
  valeur: string
  /** Pourcentage atteint. */
  pourcentage: number
  /** 'critique' vire au rouge, 'attention' reste orange. */
  gravite: 'critique' | 'attention'
  /** Conseil concret, affiché sous la ligne. */
  conseil?: string
}

/** Échappe le HTML : les valeurs viennent de la base, on ne fait pas confiance. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

serveWithSentry('alert-infra-health', async (req: Request) => {
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

  let payload: { alertes?: Alerte[] }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const alertes = Array.isArray(payload.alertes) ? payload.alertes : []
  if (alertes.length === 0) {
    // Rien à signaler : le cron ne devrait même pas nous appeler, mais on
    // répond proprement plutôt que d'envoyer un email vide.
    return new Response(JSON.stringify({ ok: true, envoye: false, raison: 'aucune_alerte' }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  const critiques = alertes.filter((a) => a.gravite === 'critique').length

  if (!RESEND_API_KEY) {
    console.error('[alert-infra-health] (no RESEND_API_KEY)', JSON.stringify(alertes))
    return new Response(JSON.stringify({ ok: true, envoye: false, raison: 'resend_absent' }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  const sujet =
    critiques > 0
      ? `[URGENT] Naturegraph : ${critiques} seuil(s) critique(s) atteint(s)`
      : `[Naturegraph] ${alertes.length} seuil(s) d'infrastructure à surveiller`

  const lignes = alertes
    .map((a) => {
      const couleur = a.gravite === 'critique' ? '#c0392b' : '#c07a1f'
      const conseil = a.conseil
        ? `<div style="font-size:13px;color:#6b6981;margin-top:4px;">${esc(a.conseil)}</div>`
        : ''
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #eceaf5;">
        <div style="font-weight:700;color:${couleur};">${esc(a.libelle)} : ${esc(a.valeur)} (${a.pourcentage} %)</div>
        ${conseil}
      </td></tr>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="fr"><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2a2a3a;line-height:1.5;">
  <h2 style="color:${critiques > 0 ? '#c0392b' : '#5f5dd8'};margin:0 0 12px;">Surveillance de l'infrastructure</h2>
  <p style="margin:0 0 8px;">Un ou plusieurs seuils ont été franchis lors du contrôle quotidien.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px;margin:12px 0;">${lignes}</table>
  <p style="margin:16px 0 0;font-size:12px;color:#8a8898;">Contrôle automatique Naturegraph (NG-037 / NG-035). Au plus une alerte par jour.</p>
</body></html>`

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: ALERT_EMAIL, subject: sujet, html }),
    })

    if (!resp.ok) {
      const detail = await resp.text()
      console.error('[alert-infra-health] Resend error:', detail)
      return new Response(JSON.stringify({ ok: false, reason: 'resend_error', detail }), {
        status: 502,
        headers: JSON_HEADERS,
      })
    }

    return new Response(JSON.stringify({ ok: true, envoye: true, alertes: alertes.length }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (err) {
    console.error('[alert-infra-health] erreur:', err)
    return new Response(JSON.stringify({ ok: false, reason: 'server_error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})
