/**
 * check-social-digest : E7 (digest social quotidien), NG-045
 *
 * Un email par jour MAXIMUM qui resume l'activite sociale qu'un user n'a PAS
 * encore vue : reactions recues + nouveaux migrateurs (follows). Objectif :
 * ramener 1x/jour ceux qui ont decroche, sans micro-spam.
 *
 * Regles (validees avec Nicolas) :
 *   - Digest QUOTIDIEN, jamais toutes les 30 min.
 *   - Respecte notif_frequency du profil : 'realtime'/'daily' -> digest quotidien ;
 *     'weekly' -> rien ici (couvert par le resume hebdo E1).
 *   - N'envoie QUE du non-vu : notifs reaction/follow read=false ET emailed_at IS NULL.
 *     Si tout est lu/deja emaile -> rien.
 *   - N'envoie PAS si l'user est deja revenu aujourd'hui (last_active_at >= debut
 *     du jour UTC) : il a deja vu la cloche, inutile de doubler.
 *   - Marque emailed_at sur les notifs incluses -> jamais re-emailees.
 *
 * Le titre de la notif contient deja le username de l'acteur (cf. triggers
 * notify_on_reaction / notify_on_follow : title = username). Pas besoin de la
 * vue notifications_with_actor.
 *
 * Modes : body { user_id } (test cible) ou body {} (cron : users avec du non-vu).
 * Securite : POST + x-cron-secret.
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

interface NotifRow {
  id: string
  type: string
  title: string | null
}

/** "Alice", "Alice et Bob", "Alice, Bob et 3 autres". */
function joinNames(names: string[]): string {
  const uniq = [...new Set(names.filter((n) => !!n))]
  if (uniq.length === 0) return 'Quelqu’un'
  if (uniq.length === 1) return uniq[0]
  if (uniq.length === 2) return `${uniq[0]} et ${uniq[1]}`
  const others = uniq.length - 2
  return `${uniq[0]}, ${uniq[1]} et ${others} autre${others > 1 ? 's' : ''}`
}

function startOfTodayUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
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
  const todayStart = startOfTodayUtc()

  try {
    // 1. Candidats : users avec au moins une notif reaction/follow non vue et non emailee
    let userIds: string[] = []
    if (body.user_id) {
      userIds = [body.user_id]
    } else {
      const { data, error } = await admin
        .from('notifications')
        .select('user_id')
        .in('type', ['reaction', 'follow'])
        .eq('read', false)
        .is('emailed_at', null)
      if (error) throw error
      userIds = [...new Set((data ?? []).map((r) => r.user_id as string))]
    }
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ candidates: 0, sent: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Profils + reglages (email, frequence, derniere activite) en un lot
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, first_name, last_active_at')
      .in('id', userIds)
    if (profErr) throw profErr

    const { data: settings, error: setErr } = await admin
      .from('user_settings')
      .select('user_id, notif_frequency')
      .in('user_id', userIds)
    if (setErr) throw setErr
    const freqById = new Map(
      (settings ?? []).map((s) => [s.user_id as string, s.notif_frequency as string]),
    )

    let sent = 0
    for (const prof of profiles ?? []) {
      const uid = prof.id as string

      // Frequence : weekly -> couvert par E1, pas de digest quotidien ici.
      const freq = freqById.get(uid) ?? 'weekly'
      if (freq === 'weekly') continue

      // Deja revenu aujourd'hui -> il a vu la cloche, on ne double pas.
      const lastActive = prof.last_active_at as string | null
      if (lastActive && lastActive >= todayStart) continue

      // 3. Notifs non vues + non emailees de ce user
      const { data: notifs, error: notifErr } = await admin
        .from('notifications')
        .select('id, type, title')
        .eq('user_id', uid)
        .in('type', ['reaction', 'follow'])
        .eq('read', false)
        .is('emailed_at', null)
      if (notifErr) throw notifErr
      const rows = (notifs ?? []) as NotifRow[]
      if (rows.length === 0) continue

      const reactionNames = rows.filter((r) => r.type === 'reaction').map((r) => r.title ?? '')
      const followNames = rows.filter((r) => r.type === 'follow').map((r) => r.title ?? '')

      const lines: string[] = []
      if (reactionNames.length > 0) {
        const verb = new Set(reactionNames).size > 1 ? 'ont' : 'a'
        lines.push(`${joinNames(reactionNames)} ${verb} réagi à tes observations.`)
      }
      if (followNames.length > 0) {
        const verb = new Set(followNames).size > 1 ? 'ont' : 'a'
        lines.push(`${joinNames(followNames)} ${verb} commencé à te suivre.`)
      }
      if (lines.length === 0) continue

      const greeting = prof.first_name?.toString().trim()
        ? `${prof.first_name.toString().trim()},`
        : 'Bonjour,'
      const subject =
        reactionNames.length > 0 ? 'On a réagi à tes observations' : 'Tu as de nouveaux migrateurs'
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        lines.map((l) => `<p style="margin:0 0 16px 0;">${l}</p>`).join('') +
        `<p style="margin:0;">Passe voir ce qui t’attend sur Naturegraph.</p>`

      // 4. Envoi via le dispatcher. pref_type='reaction' : le digest social est
      // gate par la preference reaction (le desabonnement de ce mail coupe E7).
      // reference_key = date du jour -> au plus 1 E7 par jour.
      const dateKey = todayStart.slice(0, 10)
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: uid,
          to_email: prof.email,
          email_type: 'e7_reactions',
          category: 'event',
          pref_type: 'reaction',
          min_interval_hours: 20,
          reference_key: dateKey,
          subject,
          heroTitle: 'Ce que tu as manqué',
          bodyHtml,
          cta: { label: 'Voir mes notifications', url: `${APP_URL}/notifications` },
        }),
      })
      if (!resp.ok) {
        console.error('[check-social-digest] dispatch failed for', uid, await resp.text())
        continue
      }
      const result = await resp.json()

      // 5. Marque ces notifs comme emailees UNIQUEMENT si l'email est parti
      // (sinon on veut pouvoir reessayer demain).
      if (result.sent) {
        sent += 1
        const ids = rows.map((r) => r.id)
        const { error: updErr } = await admin
          .from('notifications')
          .update({ emailed_at: new Date().toISOString() })
          .in('id', ids)
        if (updErr) console.error('[check-social-digest] mark emailed failed:', updErr)
      }
    }

    return new Response(JSON.stringify({ candidates: userIds.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-social-digest]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
