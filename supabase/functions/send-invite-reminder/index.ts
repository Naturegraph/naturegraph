/**
 * send-invite-reminder : relance unique des invitations non finalisées (one-off)
 * =============================================================================
 *
 * ⛔ PHASE TERMINÉE, NE PAS REDÉPLOYER NI RÉUTILISER.
 * Envoi effectué une seule fois le 2026-07-21 (78 destinataires). Décision
 * Nicolas le même jour : la phase des invitations est close, on ne relance plus
 * jamais, ni ces 78 personnes ni de futurs profils non onboardés. Le
 * déploiement Supabase correspondant est retiré : ce fichier est conservé
 * UNIQUEMENT pour expliquer l'origine des lignes `invite_reminder` dans
 * email_send_log. Ne pas le redéployer.
 *
 * Contexte : des personnes ont reçu une invitation à rejoindre Naturegraph mais
 * n'ont jamais terminé leur inscription (profil créé à l'invitation, sans
 * prénom ni centres d'intérêt). La très grande majorité vient de la waitlist,
 * donc a donné son email volontairement : la relance est légitime.
 *
 * Pourquoi une fonction dédiée plutôt que le dispatcher NG-045 :
 * send-notification-email refuse VOLONTAIREMENT d'emailer un profil non
 * onboardé (garde-fou central). On ne désactive pas ce garde-fou, on passe à
 * côté pour cet envoi précis, ponctuel et validé.
 *
 * Garanties :
 *   - jamais deux fois la même personne (email_send_log, type 'invite_reminder')
 *   - jamais quelqu'un qui a terminé son onboarding (filtre en dur)
 *   - jamais quelqu'un qui s'est désabonné (user_settings.email_notifications)
 *   - lien de désabonnement signé + en-têtes List-Unsubscribe (RGPD/Loi 25)
 *
 * Envoi par vagues : Resend limite le débit, un envoi en rafale se fait
 * rejeter. On traite `limit` personnes par appel (défaut 6), l'appelant relance
 * autant de fois que nécessaire.
 *
 * Sécurité : interne, authentifiée par x-cron-secret. verify_jwt = false.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildEmailShell } from '../_shared/emailTemplate.ts'
import { buildUnsubscribeUrl } from '../_shared/unsubscribeToken.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Naturegraph <notifications@naturegraph.ca>'
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUB_SECRET') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_BASE_URL') ?? 'https://naturegraph.ca'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const EMAIL_TYPE = 'invite_reminder'

interface Profile {
  id: string
  email: string | null
  first_name: string | null
  interests: string[] | null
  is_internal: boolean | null
}

/** Onboardé = prénom OU centres d'intérêt renseignés (même définition que l'app). */
function estOnboarde(p: Profile): boolean {
  const prenom = (p.first_name ?? '').trim()
  if (prenom) return true
  return Array.isArray(p.interests) && p.interests.length > 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: JSON_HEADERS })
  }

  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: JSON_HEADERS,
    })
  }

  let body: { limit?: number; dry_run?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const limit = Math.min(Math.max(body.limit ?? 6, 1), 20)
  const dryRun = body.dry_run === true

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // ── 1. Profils internes (leurs publications ne comptent pas dans les stats,
    //       et ils ne doivent jamais recevoir la relance) ────────────────────
    const { data: profils, error: profErr } = await admin
      .from('profiles')
      .select('id, email, first_name, interests, is_internal')
    if (profErr) throw profErr
    const tous = (profils ?? []) as Profile[]
    const idsInternes = new Set(tous.filter((p) => p.is_internal === true).map((p) => p.id))

    // ── 2. Chiffres réels de la communauté, calculés à l'envoi ──────────────
    // Périmètre honnête : publiées, publiques, hors comptes internes.
    const { data: postsData, error: postsErr } = await admin
      .from('posts')
      .select('user_id, taxref_id')
      .eq('status', 'published')
      .eq('visibility', 'public')
    if (postsErr) throw postsErr
    const postsCommunaute = (postsData ?? []).filter((p) => !idsInternes.has(p.user_id as string))
    const nbObservations = postsCommunaute.length
    const nbEspeces = new Set(
      postsCommunaute
        .map((p) => p.taxref_id as string | null)
        .filter((t) => t !== null && t !== ''),
    ).size

    // ── 3. Exclusions : déjà relancés, désabonnés ───────────────────────────
    const { data: dejaEnvoyes, error: logErr } = await admin
      .from('email_send_log')
      .select('user_id')
      .eq('email_type', EMAIL_TYPE)
    if (logErr) throw logErr
    const idsDejaRelances = new Set((dejaEnvoyes ?? []).map((l) => l.user_id as string))

    const { data: refus, error: refusErr } = await admin
      .from('user_settings')
      .select('user_id')
      .eq('email_notifications', false)
    if (refusErr) throw refusErr
    const idsDesabonnes = new Set((refus ?? []).map((r) => r.user_id as string))

    // ── 4. Destinataires de cette vague ─────────────────────────────────────
    const candidats = tous.filter(
      (p) =>
        p.is_internal !== true &&
        !estOnboarde(p) &&
        !!p.email &&
        p.email.trim() !== '' &&
        !idsDejaRelances.has(p.id) &&
        !idsDesabonnes.has(p.id),
    )
    const vague = candidats.slice(0, limit)

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          candidats_restants: candidats.length,
          vague: vague.length,
          observations: nbObservations,
          especes: nbEspeces,
        }),
        { status: 200, headers: JSON_HEADERS },
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, reason: 'resend_not_configured' }), {
        status: 200,
        headers: JSON_HEADERS,
      })
    }

    // ── 5. Envoi ────────────────────────────────────────────────────────────
    const sujet = 'Il y a toujours une place pour toi chez les migrateurs'
    let envoyes = 0
    const erreurs: string[] = []

    for (const p of vague) {
      const unsubscribeUrl = await buildUnsubscribeUrl(UNSUB_SECRET, SUPABASE_URL, p.id, 'all')

      const corps =
        `<p style="margin:0 0 16px 0;">Bonjour,</p>` +
        `<p style="margin:0 0 16px 0;">Tu as reçu il y a quelque temps une invitation à rejoindre ` +
        `Naturegraph. Elle est peut-être passée inaperçue, alors voici un rappel tout doux.</p>` +
        `<p style="margin:0 0 16px 0;">Naturegraph est une jeune plateforme qui se construit avec ` +
        `celles et ceux qui la font vivre : ses migrateurs. Depuis ton invitation, ` +
        `<strong>${nbObservations} observations</strong> ont été partagées et ` +
        `<strong>${nbEspeces} espèces différentes</strong> recensées.</p>` +
        `<p style="margin:0 0 16px 0;">Aucune urgence de notre côté. Viens simplement faire un tour ` +
        `quand tu as cinq minutes : le fil se consulte librement, sans compte.</p>` +
        `<p style="margin:0 0 16px 0;">Et si l'envie te vient de partager tes propres rencontres, ou ` +
        `de nous dire ce qui pourrait être mieux, tu peux ` +
        `<a href="${APP_URL}/signup" style="color:#5f5dd8;font-weight:600;">devenir migrateur</a> ` +
        `en deux minutes. C'est grâce à des regards neufs comme le tien que la plateforme évoluera ` +
        `dans le bon sens.</p>` +
        `<p style="margin:0;">À bientôt,<br>Nicolas</p>`

      const html = buildEmailShell({
        pageTitle: sujet,
        heroTitle: 'Il y a une place pour toi',
        bodyHtml: corps,
        cta: { label: 'Venir faire un tour', url: `${APP_URL}/home` },
        unsubscribeUrl,
      })

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: p.email,
          subject: sujet,
          html,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })

      if (!resp.ok) {
        erreurs.push(`${p.id}: ${await resp.text()}`)
        continue
      }

      const { error: insErr } = await admin.from('email_send_log').insert({
        user_id: p.id,
        email_type: EMAIL_TYPE,
        category: 'event',
      })
      if (insErr) {
        // L'email est parti : on le signale fort, sinon la personne risque
        // d'être relancée une seconde fois au prochain appel.
        console.error('[send-invite-reminder] log insert failed', p.id, insErr.message)
        erreurs.push(`${p.id}: log_failed`)
      }
      envoyes += 1
    }

    return new Response(
      JSON.stringify({
        ok: erreurs.length === 0,
        envoyes,
        restants: candidats.length - envoyes,
        observations: nbObservations,
        especes: nbEspeces,
        erreurs: erreurs.length ? erreurs : undefined,
      }),
      { status: 200, headers: JSON_HEADERS },
    )
  } catch (err) {
    console.error('[send-invite-reminder]', err)
    return new Response(
      JSON.stringify({
        ok: false,
        reason: 'internal_error',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})
