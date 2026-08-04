/**
 * check-weekly-summary : E1 (resume hebdomadaire), NG-045
 *
 * Envoye le dimanche soir : un point chaleureux sur la semaine ecoulee.
 * Condition : inscrit depuis au moins 7 jours (sinon on laisse l'user
 * decouvrir la plateforme avant de resumer).
 *
 * Contenu (text-forward, meilleure delivrabilite) :
 *   - tes publications de la semaine (compte)
 *   - ce que tu as manque : publications des profils suivis cette semaine
 *   - CTA adaptatif : si tu as publie -> "Voir le fil" ; sinon -> "Publier une rencontre"
 *
 * Anti-spam : categorie 'weekly_marketing' (quota 1/semaine, prioritaire sur
 * E2/E3/E4 s'il part le premier dans la fenetre).
 *
 * Modes : body { user_id } (test) ou body {} (cron). POST + x-cron-secret.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { serveWithSentry } from '../_shared/sentry.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_BASE_URL') ?? 'https://naturegraph.ca'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Candidate {
  id: string
  email: string
  first_name: string | null
  created_at: string
}

function thisMondayUtc(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff),
  ).toISOString()
}

serveWithSentry('check-weekly-summary', async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  let body: { user_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const monday = thisMondayUtc()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()

  try {
    // 1. Candidats : inscrits depuis >= 7 jours
    let candidates: Candidate[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, created_at')
        .eq('id', body.user_id)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    } else {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, created_at')
        .lte('created_at', sevenDaysAgo)
        .eq('is_internal', false)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    }

    let sent = 0
    for (const user of candidates) {
      // Garde-fou : inscrit depuis >= 7 jours (revalide en mode test).
      if (new Date(user.created_at).getTime() > new Date(sevenDaysAgo).getTime()) continue

      // 2. Tes publications de la semaine
      const { count: myPosts, error: myErr } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'published')
        .gte('created_at', monday)
      if (myErr) throw myErr
      const mine = myPosts ?? 0

      // 3. Ce que tu as manque : publications des profils suivis cette semaine
      // (notifs type='post' recues cette semaine).
      const { count: missedPosts, error: missErr } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'post')
        .gte('created_at', monday)
      if (missErr) throw missErr
      const missed = missedPosts ?? 0

      // Rien a dire cette semaine (ni publi, ni activite suivie) -> on n'envoie pas
      // un email vide (respect de l'attention, eco-conception).
      if (mine === 0 && missed === 0) continue

      const greeting = user.first_name?.trim() ? `${user.first_name.trim()},` : 'Bonjour,'
      const lines: string[] = []
      if (mine > 0) {
        lines.push(
          `Cette semaine, tu as partagé <strong>${mine} observation${mine > 1 ? 's' : ''}</strong>. Merci de faire vivre la communauté !`,
        )
      } else {
        lines.push(
          "Cette semaine a été calme de ton côté. Une rencontre nature t'attend peut-être ce week-end.",
        )
      }
      if (missed > 0) {
        lines.push(
          `<strong>${missed} publication${missed > 1 ? 's' : ''}</strong> de profils que tu suis ${missed > 1 ? 'sont' : 'est'} à découvrir.`,
        )
      }

      const posted = mine > 0
      const cta = posted
        ? { label: 'Voir le fil', url: `${APP_URL}/home` }
        : { label: 'Publier une rencontre', url: `${APP_URL}/contribute` }

      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        lines.map((l) => `<p style="margin:0 0 16px 0;">${l}</p>`).join('') +
        `<p style="margin:0;">Belle semaine nature 🌿</p>`

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e1_weekly_summary',
          category: 'weekly_marketing',
          pref_type: 'weekly_digest',
          min_interval_hours: 144,
          subject: 'Ta semaine sur Naturegraph',
          heroTitle: 'Ta semaine sur Naturegraph',
          bodyHtml,
          cta,
        }),
      })
      if (!resp.ok) {
        console.error('[check-weekly-summary] dispatch failed for', user.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1
    }

    return new Response(JSON.stringify({ candidates: candidates.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-weekly-summary]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
