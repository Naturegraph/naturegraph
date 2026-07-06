/**
 * check-activation-emails : E5 (activation premier partage), NG-045
 *
 * Cron quotidien. Cible les users inscrits EXACTEMENT il y a 3 jours (J+3)
 * qui n'ont publié aucune observation. Envoie un email d'invitation douce
 * via le dispatcher send-notification-email.
 *
 * Ne pas envoyer si l'utilisateur a publié entre-temps : c'est justement
 * pourquoi le filtre "0 post publié" est vérifié le jour J+3, pas au moment
 * de l'inscription (cf. brief NG-045, critère de validation E5).
 *
 * Planification : cf. migration 20260702_cron_activation_check.sql
 * (quotidien, décalé de weekly-species-digest pour ne pas cumuler la charge).
 *
 * Éco-conception : 1 requête profils + 1 requête posts (IN batch), pas de
 * N+1. Le dispatch email lui-même reste 1 appel HTTP par user éligible
 * (généralement une poignée par jour vu le volume soft launch).
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

function dayBounds(daysAgo: number): { start: string; end: string } {
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo),
  )
  const end = new Date(start.getTime() + 24 * 3600_000)
  return { start: start.toISOString(), end: end.toISOString() }
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const { start, end } = dayBounds(3)

    // 1. Candidats : inscrits il y a exactement 3 jours (fenêtre d'une journée)
    const { data: candidates, error: candErr } = await admin
      .from('profiles')
      .select('id, email, first_name')
      .gte('created_at', start)
      .lt('created_at', end)

    if (candErr) throw candErr
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ candidates: 0, sent: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Qui a déjà publié (n'importe quel statut != draft compte comme "a partagé")
    const candidateIds = candidates.map((c) => c.id as string)
    const { data: publishedAuthors, error: postsErr } = await admin
      .from('posts')
      .select('user_id')
      .in('user_id', candidateIds)
      .eq('status', 'published')

    if (postsErr) throw postsErr
    const publishedSet = new Set((publishedAuthors ?? []).map((p) => p.user_id as string))

    const eligible = candidates.filter((c) => !publishedSet.has(c.id as string))

    // 3. Dispatch un email par user éligible
    let sent = 0
    for (const user of eligible) {
      const firstName = (user.first_name as string | null)?.trim()
      const greeting = firstName ? `${firstName},` : 'Bonjour,'

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: user.id,
          to_email: user.email,
          email_type: 'e5_activation',
          category: 'event',
          // Pas de pref_type : email de cycle de vie, seule la coupure
          // globale email_notifications s'applique (pas de toggle dédié).
          min_interval_hours: 24 * 365, // envoi unique par compte
          subject: "Ta première observation t'attend 🌿",
          heroTitle: "Ta première observation t'attend",
          bodyHtml: `
            <p style="margin:0 0 16px 0;">${greeting}</p>
            <p style="margin:0 0 16px 0;">Ça fait quelques jours que tu as rejoint Naturegraph. Pas de pression : il n'y a pas de bonne façon de commencer, juste une première observation qui donne envie de partager la suivante.</p>
            <p style="margin:0 0 16px 0;">Une fleur sur ton balcon, un oiseau croisé en marchant, une feuille qui a attiré ton œil : tout compte.</p>
            <p style="margin:0;">Si tu as une question, on est là : support@naturegraph.ca</p>
          `,
          // Label court : "Publier ma première observation" débordait sur 3
          // lignes dans le bouton en mobile (retour test Nicolas 2026-07-06).
          cta: { label: 'Publier une observation', url: `${APP_URL}/contribute` },
        }),
      })

      if (resp.ok) {
        const body = await resp.json()
        if (body.sent) sent += 1
      } else {
        console.error('[check-activation-emails] dispatch failed for', user.id, await resp.text())
      }
    }

    return new Response(
      JSON.stringify({ candidates: candidates.length, eligible: eligible.length, sent }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[check-activation-emails]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
