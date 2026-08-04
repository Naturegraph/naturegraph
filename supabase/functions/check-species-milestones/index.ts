/**
 * check-species-milestones : E6 (milestone especes), NG-045
 *
 * Envoie un email de celebration quand un user franchit 10, 25, 50 ou 100
 * especes DIFFERENTES observees (count DISTINCT taxref_id, source de verite :
 * RPC get_user_observation_stats deja utilisee par le profil).
 *
 * Robustesse / idempotence (le coeur du "notifications envoyees" avance) :
 *   - Chaque palier n'est emaile QU'UNE SEULE FOIS par user, jamais de doublon,
 *     grace a email_send_log (email_type='e6_milestone', reference_key=<palier>).
 *   - Si un user franchit plusieurs paliers d'un coup (ex 10 et 25 dans la meme
 *     journee), on n'envoie qu'UN email, celui du plus haut palier, et on marque
 *     les paliers inferieurs comme traites -> jamais "10 especes" apres "25".
 *   - Anti-backfill : au premier passage en prod, TOUS les users existants ont
 *     deja des paliers franchis. Il faut lancer le backfill SQL (marquer ces
 *     paliers comme deja envoyes SANS emailer) AVANT de scheduler ce cron,
 *     sinon envoi de masse retroactif. Cf. runbook go-live.
 *
 * Deux modes :
 *   - body { user_id } : verifie UN user precis (tests cibles vers tralor).
 *   - body {} (cron)   : verifie les users ayant publie dans les 2 derniers
 *                        jours (moment ou un palier peut etre franchi). Eco :
 *                        on ne recalcule pas toute la base chaque jour.
 *
 * Securite : POST + header x-cron-secret (comme les autres jobs NG-045).
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { serveWithSentry } from '../_shared/sentry.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_BASE_URL') ?? 'https://naturegraph.ca'

const MILESTONES = [10, 25, 50, 100]

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

/** Contenu de l'email selon le palier atteint. Ton chaleureux, jamais culpabilisant. */
function milestoneEmail(threshold: number, greeting: string) {
  const isBig = threshold >= 100
  const closing = isBig
    ? "Cent espèces, c'est un vrai cap de naturaliste. Merci de faire vivre la biodiversité avec autant de curiosité."
    : 'Merci de faire vivre la biodiversité, une observation à la fois.'
  return {
    subject: `Tu as observé ${threshold} espèces différentes`,
    heroTitle: `${threshold} espèces observées`,
    bodyHtml:
      `<p style="margin:0 0 16px 0;">${greeting}</p>` +
      `<p style="margin:0 0 16px 0;">Tu viens d'observer ta ${threshold}e espèce différente sur Naturegraph. ` +
      `À chaque nouvelle rencontre, ton ADN d'observateur s'enrichit un peu plus.</p>` +
      `<p style="margin:0;">${closing}</p>`,
    cta: { label: 'Voir mon profil', url: `${APP_URL}/profile` },
  }
}

serveWithSentry('check-species-milestones', async (req: Request) => {
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

  try {
    // 1. Liste des candidats
    let candidates: Candidate[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name')
        .eq('id', body.user_id)
      if (error) throw error
      candidates = (data ?? []) as Candidate[]
    } else {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600_000).toISOString()
      const { data: recent, error: recentErr } = await admin
        .from('posts')
        .select('user_id')
        .eq('status', 'published')
        .gte('created_at', twoDaysAgo)
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
      // 2. Nombre d'especes distinctes (source de verite : RPC profil)
      const { data: stats, error: statsErr } = await admin.rpc('get_user_observation_stats', {
        p_user_id: user.id,
      })
      if (statsErr) throw statsErr
      const speciesTotal = (stats as { species_total?: number } | null)?.species_total ?? 0

      const crossed = MILESTONES.filter((t) => speciesTotal >= t)
      if (crossed.length === 0) continue

      // 3. Paliers deja emailes pour ce user
      const { data: logged, error: logErr } = await admin
        .from('email_send_log')
        .select('reference_key')
        .eq('user_id', user.id)
        .eq('email_type', 'e6_milestone')
      if (logErr) throw logErr
      const loggedKeys = new Set((logged ?? []).map((l) => l.reference_key as string))

      const newCrossed = crossed.filter((t) => !loggedKeys.has(String(t)))
      if (newCrossed.length === 0) continue

      const tMax = Math.max(...newCrossed)
      const greeting = user.first_name?.trim() ? `${user.first_name.trim()},` : 'Bonjour,'
      const email = milestoneEmail(tMax, greeting)

      // 4. Envoi du plus haut palier via le dispatcher (qui loggue tMax lui-meme)
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e6_milestone',
          category: 'event',
          // Pas de pref_type : E6 suit seulement email_notifications global
          // (evenement rare et positif, pas de toggle dedie).
          min_interval_hours: 0,
          reference_key: String(tMax),
          ...email,
        }),
      })

      if (!resp.ok) {
        console.error('[check-species-milestones] dispatch failed for', user.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1

      // 5. Marque les paliers INFERIEURS nouvellement franchis comme traites,
      // pour ne jamais renvoyer "10 especes" apres avoir felicite "25". Le
      // palier tMax est deja loggue par le dispatcher s'il a ete envoye.
      const lowerToMark = newCrossed.filter((t) => t !== tMax)
      if (lowerToMark.length > 0) {
        const rows = lowerToMark.map((t) => ({
          user_id: user.id,
          email_type: 'e6_milestone',
          category: 'event',
          reference_key: String(t),
        }))
        const { error: markErr } = await admin.from('email_send_log').insert(rows)
        if (markErr) console.error('[check-species-milestones] mark lower failed:', markErr)
      }
    }

    return new Response(JSON.stringify({ candidates: candidates.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-species-milestones]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
