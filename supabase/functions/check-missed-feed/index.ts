/**
 * check-missed-feed : E2 (ce que tu as manque), NG-045
 *
 * Relance douce pour un user absent depuis quelques jours, quand la communaute
 * a ete active : "voici ce qui s'est passe pendant ton absence".
 *
 * Conditions (brief) :
 *   - absent depuis >= 5 jours (last_active_at <= now - 5j)
 *   - au moins 3 nouvelles observations publiques depuis sa derniere visite
 *   - PAS si E1 (ou un autre weekly_marketing) est parti recemment : gere par
 *     la categorie 'weekly_marketing' (quota partage, min_interval 144h ~ 6j,
 *     ce qui couvre la regle "pas si E1 dans les 48h").
 *
 * Contenu : compte des nouvelles observations + 2-3 apercus (espece + auteur).
 * Text-forward pour la delivrabilite.
 *
 * Depend de last_active_at (heartbeat frontend). Modes : body { user_id } (test,
 * avec last_active_at simule) ou body {} (cron quotidien). POST + x-cron-secret.
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
  last_active_at: string | null
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
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600_000).toISOString()

  try {
    // 1. Candidats : absents depuis >= 5 jours (last_active_at ancien).
    // Les last_active_at NULL sont exclus volontairement : sans signal
    // d'activite, on ne classe pas quelqu'un comme "absent" (evite d'emailer
    // tout le monde tant que le heartbeat n'a pas de donnees).
    let candidates: Candidate[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, last_active_at')
        .eq('id', body.user_id)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    } else {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, last_active_at')
        .lte('last_active_at', fiveDaysAgo)
        .eq('is_internal', false)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    }

    let sent = 0
    for (const user of candidates) {
      const lastActive = user.last_active_at
      // Revalide "absent >= 5j" en mode test aussi.
      if (!lastActive || lastActive > fiveDaysAgo) continue

      // 2. Nouvelles observations publiques depuis sa derniere visite
      const { count: newCount, error: cntErr } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gt('created_at', lastActive)
      if (cntErr) throw cntErr
      const total = newCount ?? 0
      if (total < 3) continue

      // 3. Apercus : 3 dernieres publiques (espece + auteur)
      const { data: recent, error: recErr } = await admin
        .from('posts')
        .select('species_name, user_id')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gt('created_at', lastActive)
        .order('created_at', { ascending: false })
        .limit(3)
      if (recErr) throw recErr
      const authorIds = [...new Set((recent ?? []).map((r) => r.user_id as string))]
      const { data: authors, error: authErr } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', authorIds)
      if (authErr) throw authErr
      const nameById = new Map((authors ?? []).map((a) => [a.id as string, a.username as string]))

      const previews = (recent ?? []).map((r) => {
        const who = nameById.get(r.user_id as string) ?? 'un migrateur'
        const what = (r.species_name as string | null)?.trim() || 'Une observation'
        return `<li style="margin:0 0 8px 0;">${what} <span style="color:#6b6981;">par ${who}</span></li>`
      })

      const greeting = user.first_name?.trim() ? `${user.first_name.trim()},` : 'Bonjour,'
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        `<p style="margin:0 0 16px 0;"><strong>${total} nouvelles observations</strong> ont été partagées depuis ta dernière visite.</p>` +
        `<ul style="margin:0 0 16px 0;padding-left:20px;">${previews.join('')}</ul>` +
        `<p style="margin:0;">Elles t'attendent sur le fil.</p>`

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e2_missed',
          category: 'weekly_marketing',
          pref_type: 'weekly_digest',
          min_interval_hours: 144,
          subject: 'Tu as manqué de belles observations',
          heroTitle: "Ce qui s'est passé pendant ton absence",
          bodyHtml,
          cta: { label: 'Voir les observations', url: `${APP_URL}/home` },
        }),
      })
      if (!resp.ok) {
        console.error('[check-missed-feed] dispatch failed for', user.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1
    }

    return new Response(JSON.stringify({ candidates: candidates.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-missed-feed]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
