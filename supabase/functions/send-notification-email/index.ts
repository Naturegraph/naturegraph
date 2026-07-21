/**
 * send-notification-email : dispatcher générique des emails NG-045
 *
 * Point d'entrée UNIQUE pour les 8 types d'emails (E1-E8). Ne décide jamais
 * SI un email doit partir (ça, c'est le rôle de chaque cron/job appelant :
 * "objectif atteint ?", "série active ?", "déjà publié ?"). Ce dispatcher ne
 * fait que la mécanique commune, une fois la décision prise par l'appelant :
 *
 *   1. Vérifie user_settings.email_notifications (coupure globale) et
 *      notification_preferences.email_enabled pour le type concerné
 *      (via le helper SQL is_email_enabled, source de vérité unique)
 *   2. Vérifie l'anti-spam : pas d'envoi si un email de la même catégorie
 *      (weekly_marketing) ou de la même clé de dédup (event) a déjà été
 *      envoyé dans la fenêtre demandée
 *   3. Construit le HTML (coquille commune + lien désabonnement signé)
 *   4. Envoie via Resend
 *   5. Logge dans email_send_log (que l'envoi ait réussi ou non côté
 *      décision anti-spam : seul un envoi RÉELLEMENT parti est loggé)
 *
 * Sécurité : appelée uniquement par d'autres Edge Functions / cron internes
 * (pas de client public), authentifiée par secret partagé x-cron-secret.
 *
 * Eco-conception : aucune requête N+1, tout est résolu par l'appelant qui a
 * déjà la liste de users à traiter ; ce dispatcher traite un envoi à la fois
 * (le batching/regroupement est la responsabilité de l'appelant pour E7/E8).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildEmailShell } from '../_shared/emailTemplate.ts'
import { buildUnsubscribeUrl } from '../_shared/unsubscribeToken.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <notifications@naturegraph.ca>'
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUB_SECRET') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const EMAIL_TYPES = new Set([
  'e1_weekly_summary',
  'e2_missed',
  'e3_goal_reminder',
  'e4_streak_risk',
  'e5_activation',
  'e6_milestone',
  'e7_reactions',
  'e8_followed_post',
])

interface SendRequest {
  user_id: string
  to_email: string
  email_type: string
  /** 'weekly_marketing' (E1-E4, quota partagé 2/semaine) ou 'event' (E5-E8, hors quota). */
  category: 'weekly_marketing' | 'event'
  /**
   * Type dans notification_preferences.type à vérifier avant envoi. Omis
   * pour les emails de cycle de vie non désactivables individuellement
   * (E5 : seul email_notifications global s'applique).
   */
  pref_type?: string
  /**
   * Fenêtre anti-spam en heures. weekly_marketing : vérifie TOUTE la
   * catégorie (pas juste ce email_type), cf. règle "E1-E4 ne se cumulent
   * pas". event : vérifie ce email_type + reference_key uniquement.
   */
  min_interval_hours: number
  /** Clé de dédup fine pour les events (E8 : id de l'auteur suivi). */
  reference_key?: string
  subject: string
  heroTitle: string
  bodyHtml: string
  cta?: { label: string; url: string }
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://naturegraph.ca',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  let payload: SendRequest
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_json' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!payload.user_id || !payload.to_email || !payload.email_type || !payload.category) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_fields' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!EMAIL_TYPES.has(payload.email_type)) {
    return new Response(JSON.stringify({ ok: false, reason: 'unknown_email_type' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // 0. Eligibilite : ne JAMAIS emailer un profil seulement invite (auto-cree
    // a l'invitation mais qui n'a jamais termine son inscription/onboarding).
    // On exige un profil onboarde : prenom OU centres d'interet renseignes
    // (meme definition que isProfileAlreadyOnboarded cote app). Garde-fou
    // central : vaut pour les 8 emails, quel que soit le job appelant.
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('first_name, interests')
      .eq('id', payload.user_id)
      .maybeSingle()
    if (profErr) throw profErr
    const onboarded = !!(
      prof &&
      (prof.first_name?.toString().trim() ||
        (Array.isArray(prof.interests) && prof.interests.length > 0))
    )
    if (!onboarded) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'not_onboarded' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 1. Préférences (global + par type)
    if (payload.pref_type) {
      const { data: allowed, error: prefErr } = await admin.rpc('is_email_enabled', {
        p_user_id: payload.user_id,
        p_type: payload.pref_type,
      })
      if (prefErr) throw prefErr
      if (!allowed) {
        return new Response(JSON.stringify({ ok: true, sent: false, reason: 'opted_out' }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Pas de pref_type (ex E5) : seule la coupure globale s'applique.
      const { data: settings, error: settingsErr } = await admin
        .from('user_settings')
        .select('email_notifications')
        .eq('user_id', payload.user_id)
        .maybeSingle()
      if (settingsErr) throw settingsErr
      if (settings?.email_notifications === false) {
        return new Response(JSON.stringify({ ok: true, sent: false, reason: 'opted_out' }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // 2. Anti-spam
    // weekly_marketing (E1-E4) : plafond de 2 emails / 7 jours glissants (decision
    // Nicolas 2026-07-18 : passage de 1 a 2 par semaine pour ameliorer le retour
    // des users). La fenetre (168h) et le plafond (2) sont geres ici, de facon
    // centrale, quel que soit le min_interval_hours passe par les crons E1-E4.
    // event (E5-E8) : dedup fine par email_type (+ reference_key) sur la fenetre
    // min_interval_hours fournie par l'appelant (comportement inchange).
    const isWeeklyMarketing = payload.category === 'weekly_marketing'
    const windowHours = isWeeklyMarketing ? 168 : payload.min_interval_hours
    const maxInWindow = isWeeklyMarketing ? 2 : 1
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString()
    let recentQuery = admin
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', payload.user_id)
      .gte('sent_at', since)

    if (isWeeklyMarketing) {
      recentQuery = recentQuery.eq('category', 'weekly_marketing')
    } else {
      recentQuery = recentQuery.eq('email_type', payload.email_type)
      if (payload.reference_key) {
        recentQuery = recentQuery.eq('reference_key', payload.reference_key)
      }
    }

    const { count: recentCount, error: recentErr } = await recentQuery
    if (recentErr) throw recentErr
    if ((recentCount ?? 0) >= maxInWindow) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'anti_spam_window' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 3. Construction du HTML
    const unsubscribeType = payload.pref_type ?? 'all'
    const unsubscribeUrl = await buildUnsubscribeUrl(
      UNSUB_SECRET,
      SUPABASE_URL,
      payload.user_id,
      unsubscribeType,
    )
    const html = buildEmailShell({
      pageTitle: payload.subject,
      heroTitle: payload.heroTitle,
      bodyHtml: payload.bodyHtml,
      cta: payload.cta,
      unsubscribeUrl,
    })

    // 4. Envoi Resend
    if (!RESEND_API_KEY) {
      console.warn(
        `[send-notification-email] RESEND_API_KEY absent : skip envoi ${payload.email_type} pour ${payload.user_id}`,
      )
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: 'resend_not_configured' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: payload.to_email,
        subject: payload.subject,
        html,
        // List-Unsubscribe (RFC 8058) : desabonnement natif un clic dans
        // Gmail/Apple Mail. Exige par Gmail/Yahoo pour l'envoi en volume,
        // ameliore la delivrabilite et reduit le classement en Promotions/spam.
        // L'URL pointe sur email-unsubscribe (GET pour le clic humain, POST
        // pour le un-clic natif).
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    if (!resendResp.ok) {
      const errText = await resendResp.text()
      console.error('[send-notification-email] Resend error:', errText)
      return new Response(JSON.stringify({ ok: false, reason: 'resend_error' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 5. Log (uniquement si l'envoi est réellement parti)
    const { error: logErr } = await admin.from('email_send_log').insert({
      user_id: payload.user_id,
      email_type: payload.email_type,
      category: payload.category,
      reference_key: payload.reference_key ?? null,
    })
    if (logErr) {
      // L'email est parti : on ne fait pas échouer la requête pour un souci
      // de log, mais on l'alerte fort (impacte l'anti-spam des prochains runs).
      console.error('[send-notification-email] email_send_log insert failed:', logErr)
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-notification-email]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ ok: false, reason: 'internal_error', detail: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
