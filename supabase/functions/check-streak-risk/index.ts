/**
 * check-streak-risk : E4 (serie en danger), NG-045
 *
 * Rappelle a un user qui enchaine les semaines de publication que sa serie va
 * se rompre s'il ne publie pas cette semaine. Motivant, jamais culpabilisant.
 *
 * Serie hebdo (definition brief) : 1 publication par semaine = 1 unite. Publier
 * 3 semaines d'affilee = serie de 3. On compte les semaines ISO consecutives
 * (lundi-dimanche, UTC) avec au moins 1 post publie.
 *
 * Declencheur : samedi (cron), dernier moment utile avant la fin de semaine.
 * Conditions :
 *   - serie >= 2 semaines completes consecutives AVANT cette semaine
 *   - AUCUNE publication cette semaine (sinon la serie continue, pas de danger)
 *
 * Anti-spam : categorie 'weekly_marketing' (quota 1/semaine, cf. E3).
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
}

/** Lundi (00h UTC) de la semaine contenant `d`. */
function mondayOf(d: Date): Date {
  const day = d.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff))
}

function weekKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Calcule la serie de semaines completes consecutives (avant cette semaine) et
 * si l'user a publie cette semaine.
 */
function computeStreak(postDates: string[]): { streak: number; postedThisWeek: boolean } {
  const weeks = new Set(postDates.map((iso) => weekKey(mondayOf(new Date(iso)))))
  const thisMonday = mondayOf(new Date())
  const postedThisWeek = weeks.has(weekKey(thisMonday))

  let streak = 0
  const cursor = new Date(thisMonday)
  cursor.setUTCDate(cursor.getUTCDate() - 7) // semaine derniere
  while (weeks.has(weekKey(cursor))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 7)
  }
  return { streak, postedThisWeek }
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
  // On regarde 16 semaines en arriere : suffisant pour une serie significative.
  const since = new Date(Date.now() - 16 * 7 * 24 * 3600_000).toISOString()

  try {
    // 1. Candidats : ceux qui ont publie recemment (porteurs potentiels de serie),
    // hors cette semaine (le job tourne le samedi ; ceux ayant publie cette
    // semaine seront filtres par postedThisWeek de toute facon).
    let candidates: Candidate[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name')
        .eq('id', body.user_id)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    } else {
      const { data: recent, error: recentErr } = await admin
        .from('posts')
        .select('user_id')
        .eq('status', 'published')
        .gte('created_at', since)
      if (recentErr) throw recentErr
      const ids = [...new Set((recent ?? []).map((r) => r.user_id as string))]
      if (ids.length > 0) {
        const { data, error } = await admin
          .from('profiles')
          .select('id, email, first_name')
          .in('id', ids)
        if (error) throw error
        candidates = (data ?? []) as Candidate[]
      }
    }

    let sent = 0
    for (const user of candidates) {
      // 2. Dates de publication du user sur la fenetre
      const { data: posts, error: postErr } = await admin
        .from('posts')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .gte('created_at', since)
      if (postErr) throw postErr
      const dates = (posts ?? []).map((p) => p.created_at as string)
      if (dates.length === 0) continue

      const { streak, postedThisWeek } = computeStreak(dates)

      // 3. Serie en danger : >= 2 semaines consecutives et rien cette semaine
      if (postedThisWeek || streak < 2) continue

      const greeting = user.first_name?.trim() ? `${user.first_name.trim()},` : 'Bonjour,'
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        `<p style="margin:0 0 16px 0;">Tu partages des observations depuis <strong>${streak} semaines</strong> d'affilée. Belle régularité !</p>` +
        `<p style="margin:0;">Il te reste ce week-end pour continuer ta série. Une seule observation suffit à la préserver.</p>`

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e4_streak_risk',
          category: 'weekly_marketing',
          pref_type: 'streak',
          min_interval_hours: 144,
          subject: 'Ne perds pas ta série 🌿',
          heroTitle: `Ta série de ${streak} semaines`,
          bodyHtml,
          cta: { label: 'Publier maintenant', url: `${APP_URL}/contribute` },
        }),
      })
      if (!resp.ok) {
        console.error('[check-streak-risk] dispatch failed for', user.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1
    }

    return new Response(JSON.stringify({ candidates: candidates.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-streak-risk]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
