/**
 * check-followed-digest : E8 (publications des profils suivis), NG-045
 *
 * Un email par jour MAXIMUM regroupant les nouvelles publications des profils
 * suivis qu'un user n'a PAS encore vues. Remplace le "1 email par profil suivi
 * par jour" du brief (qui pouvait faire 100 mails/jour si on suit 100 personnes)
 * par UN digest quotidien plafonne, decision validee avec Nicolas.
 *
 * Regles (identiques a E7) :
 *   - Digest QUOTIDIEN. Respecte notif_frequency ('weekly' -> couvert par E1).
 *   - Uniquement du non-vu : notifs type='post' read=false ET emailed_at IS NULL.
 *   - Skip si l'user est deja revenu aujourd'hui (last_active_at >= debut du jour).
 *   - Marque emailed_at sur les notifs incluses.
 *
 * Bouton adaptatif (demande Nicolas) :
 *   - 1 seule obs -> bouton vers la page detail du post (/post/<id>).
 *   - plusieurs   -> bouton vers le fil (/home).
 *
 * Les notifs type='post' portent title = username de l'auteur et
 * reference_id = id du post (cf. trigger notify_on_new_post).
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

interface PostNotif {
  id: string
  title: string | null
  reference_id: string | null
}

function joinNames(names: string[]): string {
  const uniq = [...new Set(names.filter((n) => !!n))]
  if (uniq.length === 0) return 'Des migrateurs'
  if (uniq.length === 1) return uniq[0]
  if (uniq.length === 2) return `${uniq[0]} et ${uniq[1]}`
  const others = uniq.length - 2
  return `${uniq[0]}, ${uniq[1]} et ${others} autre${others > 1 ? 's' : ''}`
}

function startOfTodayUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

serveWithSentry('check-followed-digest', async (req: Request) => {
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
    let userIds: string[] = []
    if (body.user_id) {
      userIds = [body.user_id]
    } else {
      const { data, error } = await admin
        .from('notifications')
        .select('user_id')
        .eq('type', 'post')
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

      const freq = freqById.get(uid) ?? 'weekly'
      if (freq === 'weekly') continue

      const lastActive = prof.last_active_at as string | null
      if (lastActive && lastActive >= todayStart) continue

      const { data: notifs, error: notifErr } = await admin
        .from('notifications')
        .select('id, title, reference_id')
        .eq('user_id', uid)
        .eq('type', 'post')
        .eq('read', false)
        .is('emailed_at', null)
        .order('created_at', { ascending: false })
      if (notifErr) throw notifErr
      const rows = (notifs ?? []) as PostNotif[]
      if (rows.length === 0) continue

      const authors = rows.map((r) => r.title ?? '')
      const greeting = prof.first_name?.toString().trim()
        ? `${prof.first_name.toString().trim()},`
        : 'Bonjour,'

      let subject: string
      let bodyInner: string
      let cta: { label: string; url: string }

      if (rows.length === 1) {
        const author = authors[0] || 'Un migrateur'
        subject = `${author} a publié une nouvelle observation`
        bodyInner = `<p style="margin:0 0 16px 0;">${author} vient de partager une nouvelle rencontre nature.</p>`
        const postId = rows[0].reference_id
        cta = {
          label: "Voir l'observation",
          url: postId ? `${APP_URL}/post/${postId}` : `${APP_URL}/home`,
        }
      } else {
        subject = `${rows.length} nouvelles observations à découvrir`
        bodyInner = `<p style="margin:0 0 16px 0;">${joinNames(authors)} ont publié de nouvelles observations aujourd'hui.</p>`
        cta = { label: 'Voir le fil', url: `${APP_URL}/home` }
      }

      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        bodyInner +
        `<p style="margin:0;">À découvrir quand tu veux.</p>`

      const dateKey = todayStart.slice(0, 10)
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: uid,
          to_email: prof.email,
          email_type: 'e8_followed_post',
          category: 'event',
          pref_type: 'post',
          min_interval_hours: 20,
          reference_key: dateKey,
          subject,
          heroTitle: 'De nouvelles observations à découvrir',
          bodyHtml,
          cta,
        }),
      })
      if (!resp.ok) {
        console.error('[check-followed-digest] dispatch failed for', uid, await resp.text())
        continue
      }
      const result = await resp.json()

      if (result.sent) {
        sent += 1
        const ids = rows.map((r) => r.id)
        const { error: updErr } = await admin
          .from('notifications')
          .update({ emailed_at: new Date().toISOString() })
          .in('id', ids)
        if (updErr) console.error('[check-followed-digest] mark emailed failed:', updErr)
      }
    }

    return new Response(JSON.stringify({ candidates: userIds.length, sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-followed-digest]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
