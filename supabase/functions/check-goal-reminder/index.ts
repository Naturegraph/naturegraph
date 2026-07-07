/**
 * check-goal-reminder : E3 (rappel objectif hebdo), NG-045
 *
 * Rappelle a un user actif qu'il n'a pas encore atteint son objectif hebdo de
 * publications. Ton encourageant, jamais culpabilisant.
 *
 * Declencheur : jeudi (cron), pour laisser le week-end rattraper.
 * Conditions :
 *   - objectif hebdo NON atteint : obs_week < week_goal
 *   - user ACTIF : au moins 1 publication dans les 30 derniers jours
 *   - PAS si objectif deja atteint (obs_week >= week_goal) : filtre ci-dessous
 *
 * obs_week et week_goal viennent de la meme source que la progression affichee
 * sur le profil (RPC get_user_observation_stats + profiles.week_goal), pour que
 * l'email dise exactement la meme chose que l'app.
 *
 * Anti-spam : categorie 'weekly_marketing' -> compte dans le quota "1 email
 * marketing par semaine" (E1-E4 ne se cumulent pas). Le dispatcher bloque si un
 * autre weekly_marketing est parti dans les min_interval_hours (144h ~ 6j).
 *
 * Modes : body { user_id } (test) ou body {} (cron). POST + x-cron-secret.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
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
  week_goal: number | null
}

function thisMondayUtc(): Date {
  const now = new Date()
  const day = now.getUTCDay() // 0=dimanche..6=samedi
  const diff = day === 0 ? 6 : day - 1 // jours ecoules depuis lundi
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
}

/** Barre de progression email-safe (divs imbriquees, ok Gmail/Apple Mail). */
function progressBar(current: number, goal: number): string {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  return (
    `<div style="background:#e7e9f7;border-radius:999px;height:12px;width:100%;margin:4px 0 20px 0;">` +
    `<div style="background:#5f5dd8;border-radius:999px;height:12px;width:${pct}%;"></div>` +
    `</div>`
  )
}

Deno.serve(async (req: Request) => {
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()

  try {
    // 1. Candidats
    let candidates: Candidate[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, week_goal')
        .eq('id', body.user_id)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    } else {
      // Users actifs : au moins 1 publication dans les 30 derniers jours.
      const { data: recent, error: recentErr } = await admin
        .from('posts')
        .select('user_id')
        .eq('status', 'published')
        .gte('created_at', thirtyDaysAgo)
      if (recentErr) throw recentErr
      const ids = [...new Set((recent ?? []).map((r) => r.user_id as string))]
      if (ids.length > 0) {
        const { data, error } = await admin
          .from('profiles')
          .select('id, email, first_name, week_goal')
          .in('id', ids)
        if (error) throw error
        candidates = (data ?? []) as Candidate[]
      }
    }

    let sent = 0
    for (const user of candidates) {
      const weekGoal = user.week_goal ?? 5

      // 2. Actif ? (verifie aussi en mode test) : >= 1 publication sur 30 jours.
      const { count: recentCount, error: actErr } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'published')
        .gte('created_at', thirtyDaysAgo)
      if (actErr) throw actErr
      if ((recentCount ?? 0) === 0) continue

      // 3. Progression de la semaine (meme source que le profil)
      const { data: stats, error: statsErr } = await admin.rpc('get_user_observation_stats', {
        p_user_id: user.id,
        p_week_start: monday.toISOString(),
      })
      if (statsErr) throw statsErr
      const obsWeek = (stats as { obs_week?: number } | null)?.obs_week ?? 0

      // 4. Objectif deja atteint -> pas d'email
      if (obsWeek >= weekGoal) continue

      const greeting = user.first_name?.trim() ? `${user.first_name.trim()},` : 'Bonjour,'
      const remaining = weekGoal - obsWeek
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        `<p style="margin:0 0 4px 0;">Tu es à <strong>${obsWeek}/${weekGoal}</strong> observation${weekGoal > 1 ? 's' : ''} cette semaine.</p>` +
        progressBar(obsWeek, weekGoal) +
        `<p style="margin:0;">Encore ${remaining} et ton objectif est atteint. Une sortie, même courte, suffit souvent. Pas de pression : chaque observation compte.</p>`

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e3_goal_reminder',
          category: 'weekly_marketing',
          pref_type: 'goal_reminder',
          min_interval_hours: 144,
          subject: `Tu es à ${obsWeek}/${weekGoal} cette semaine`,
          heroTitle: 'Ton objectif de la semaine',
          bodyHtml,
          cta: { label: 'Publier une observation', url: `${APP_URL}/contribute` },
        }),
      })
      if (!resp.ok) {
        console.error('[check-goal-reminder] dispatch failed for', user.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1
    }

    return new Response(JSON.stringify({ candidates: candidates.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-goal-reminder]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
