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

  // Mode "campagne" (envoi one-shot manuel) : cible TOUS les inscrits non
  // internes, pas seulement la fenêtre J+3. Le filtre "0 publication" en aval
  // isole les onboardés inactifs. Le garde-fou onboarding + préférence email +
  // anti-spam du dispatcher s'appliquent quand même. Le contenu E5 est inchangé.
  // Déclenché manuellement : POST body { "campaign": true }.
  // preview_email : envoi de contrôle à UNE seule adresse (validation Nicolas
  // avant blast). Ignore le filtre "0 publication" pour toucher un compte de
  // test même s'il a déjà publié. Body : { "preview_email": "x@y.z" }.
  let campaign = false
  let previewEmail: string | null = null
  try {
    const body = await req.json()
    campaign = body?.campaign === true
    previewEmail = typeof body?.preview_email === 'string' ? body.preview_email : null
  } catch {
    // pas de body : mode cron J+3 normal
  }

  try {
    const { start, end } = dayBounds(3)

    // 1. Candidats : preview (1 adresse), campagne (tous non-internes) ou J+3 (cron)
    const baseQuery = admin.from('profiles').select('id, email, first_name')
    const { data: candidates, error: candErr } = previewEmail
      ? await baseQuery.eq('email', previewEmail)
      : campaign
        ? await baseQuery.eq('is_internal', false)
        : await baseQuery.gte('created_at', start).lt('created_at', end)

    if (candErr) throw candErr
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ candidates: 0, sent: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Filtre "0 publication" (sauté en preview : on veut toucher le testeur)
    let eligible = candidates
    if (!previewEmail) {
      const candidateIds = candidates.map((c) => c.id as string)
      const { data: publishedAuthors, error: postsErr } = await admin
        .from('posts')
        .select('user_id')
        .in('user_id', candidateIds)
        .eq('status', 'published')

      if (postsErr) throw postsErr
      const publishedSet = new Set((publishedAuthors ?? []).map((p) => p.user_id as string))
      eligible = candidates.filter((c) => !publishedSet.has(c.id as string))
    }

    // 3. Dispatch un email par user éligible.
    //    Chaque envoi est ISOLE (try/catch par user) : un echec ponctuel
    //    (reseau, quota Resend) ne doit jamais interrompre le reste du lot.
    //    Petite pause entre 2 envois pour rester sous la cadence Resend.
    let sent = 0
    for (const user of eligible) {
      const firstName = (user.first_name as string | null)?.trim()
      const greeting = firstName ? `${firstName},` : 'Bonjour,'

      try {
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
            subject: "Ta première observation t'attend",
            heroTitle: "Ta première observation t'attend",
            bodyHtml: `
              <p style="margin:0 0 16px 0;">${greeting}</p>
              <p style="margin:0 0 16px 0;">Ça fait quelques jours que tu as rejoint Naturegraph. Pas de pression : il n'y a pas de bonne façon de commencer, juste une première observation qui donne envie de partager la suivante.</p>
              <p style="margin:0;">Nous t'invitons alors à partager ta première rencontre en cliquant sur le bouton ci-dessous.</p>
            `,
            // Le bouton ouvre directement le compositeur de rencontre nature
            // (?type=nature_encounter). Sans ce param, /contribute redirige vers
            // le fil : c'est l'action de publication qu'on veut, pas le feed.
            cta: {
              label: 'Partager ma rencontre',
              url: `${APP_URL}/contribute?type=nature_encounter`,
            },
          }),
        })

        if (resp.ok) {
          const body = await resp.json()
          if (body.sent) sent += 1
        } else {
          console.error('[check-activation-emails] dispatch failed for', user.id, await resp.text())
        }
      } catch (dispatchErr) {
        // On loggue et on continue : les autres users doivent partir.
        console.error('[check-activation-emails] dispatch threw for', user.id, dispatchErr)
      }

      // Throttle doux (~4 envois/s max) pour ne pas saturer Resend.
      await new Promise((r) => setTimeout(r, 250))
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
