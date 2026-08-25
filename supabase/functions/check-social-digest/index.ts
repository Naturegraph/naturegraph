/**
 * check-social-digest : E7 (digest social HEBDOMADAIRE), NG-045
 *
 * Un email par SEMAINE maximum (cron dimanche 18h) qui resume l'activite sociale
 * qu'un user n'a PAS encore vue : reactions recues, nouveaux migrateurs (follows),
 * echanges sous ses publications et propositions d'espece. Objectif : ramener une
 * fois par semaine ceux qui ont decroche, sans micro-spam.
 *
 * NG-045 residuel (2026-07-23) : ajout des types 'comment' et 'identification',
 * livres par NG-049. Sans eux, quelqu'un pouvait recevoir dix echanges sur sa
 * publication sans qu'aucun email ne le lui dise.
 *
 * Refonte email (2026-08-22, Lot 2) : E7 est desormais le DIGEST HEBDOMADAIRE
 * UNIQUE (cron dimanche 18h). Les autres digests quotidiens (E8 posts suivis) et
 * nudges (E4 streak, E3 objectif) sont desactives, E1 resume hebdo aussi. Ce mail
 * est donc le seul email d'activite recurrent : ~1/semaine, pertinence > frequence.
 *
 * Regles (validees avec Nicolas) :
 *   - Digest HEBDOMADAIRE (dimanche), jamais toutes les 30 min.
 *   - Envoye a TOUS les profils eligibles quelle que soit notif_frequency (ne plus
 *     sauter les 'weekly' : E1 est desactive, ils n'auraient plus rien).
 *   - N'envoie QUE du non-vu : notifs reaction/follow read=false ET emailed_at IS NULL.
 *     Si tout est lu/deja emaile -> rien.
 *   - N'envoie PAS si l'user est deja revenu aujourd'hui (last_active_at >= debut
 *     du jour UTC) : il a deja vu la cloche, inutile de doubler.
 *   - Marque emailed_at sur les notifs incluses -> jamais re-emailees.
 *   - CONSENTEMENT PAR TYPE : le digest regroupe plusieurs types, mais chacun a
 *     sa propre preference email (`is_email_enabled` est par type). On filtre
 *     donc le CONTENU type par type : quelqu'un qui a coupe les emails
 *     d'echanges ne recoit pas de lignes d'echanges, meme si le digest part
 *     pour ses reactions. Sans ce filtre, l'ajout des echanges aurait contourne
 *     un refus deja exprime.
 *   - `pref_type` reste 'reaction' : c'est la cle du DIGEST SOCIAL dans son
 *     ensemble, et c'est elle qui pilote le lien de desabonnement
 *     (`unsubscribeType = pref_type ?? 'all'` dans le dispatcher). La changer
 *     rendrait le desabonnement imprevisible d'un jour a l'autre, et l'omettre
 *     couperait TOUS les emails au lieu du seul digest.
 *
 * Le titre de la notif contient deja le username de l'acteur (cf. triggers
 * notify_on_reaction / notify_on_follow : title = username). Pas besoin de la
 * vue notifications_with_actor.
 *
 * Modes : body { user_id } (test cible) ou body {} (cron : users avec du non-vu).
 * Securite : POST + x-cron-secret.
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

interface NotifRow {
  id: string
  type: string
  title: string | null
}

/**
 * Types regroupes dans le digest social.
 *
 * 'identification' est distinct de 'comment' depuis NG-049 : proposer une
 * espece n'est pas bavarder, et l'auteur d'une publication doit pouvoir le
 * reperer. Les deux restent gouvernes par la preference 'comment', qui est la
 * seule entree existante cote reglages.
 */
const TYPES_DIGEST = ['reaction', 'follow', 'comment', 'identification'] as const

/** Preference email qui gouverne chaque type (plusieurs types la partagent). */
const PREFERENCE_PAR_TYPE: Record<string, string> = {
  reaction: 'reaction',
  follow: 'follow',
  comment: 'comment',
  identification: 'comment',
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

serveWithSentry('check-social-digest', async (req: Request) => {
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
    // 1. Candidats : users avec au moins une notif du digest non vue et non emailee
    let userIds: string[] = []
    if (body.user_id) {
      userIds = [body.user_id]
    } else {
      const { data, error } = await admin
        .from('notifications')
        .select('user_id')
        .in('type', TYPES_DIGEST as unknown as string[])
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

    // 2. Profils (email, prenom, derniere activite) en un lot.
    //
    // On ne lit PLUS user_settings.notif_frequency : depuis la refonte email
    // (Lot 2), E7 est le DIGEST HEBDO unique et E1 (resume hebdo) est desactive.
    // Sauter les profils en frequence 'weekly' les priverait de TOUT email
    // (34 users = la majorite). Tous les profils eligibles recoivent ce digest ;
    // la cadence in-app reste geree ailleurs, notif_frequency n'a plus d'effet ici.
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, first_name, last_active_at')
      .in('id', userIds)
    if (profErr) throw profErr

    let sent = 0
    for (const prof of profiles ?? []) {
      const uid = prof.id as string

      // Deja revenu aujourd'hui -> il a vu la cloche, on ne double pas.
      const lastActive = prof.last_active_at as string | null
      if (lastActive && lastActive >= todayStart) continue

      // 3. Notifs non vues + non emailees de ce user
      const { data: notifs, error: notifErr } = await admin
        .from('notifications')
        .select('id, type, title')
        .eq('user_id', uid)
        .in('type', TYPES_DIGEST as unknown as string[])
        .eq('read', false)
        .is('emailed_at', null)
      if (notifErr) throw notifErr
      const rows = (notifs ?? []) as NotifRow[]
      if (rows.length === 0) continue

      // CONSENTEMENT PAR TYPE. Chaque type a sa propre preference email : on
      // ecarte d'abord ceux que cette personne a refuses, AVANT de composer le
      // message. Ajouter les echanges au digest sans ce filtre aurait fait
      // passer par email un contenu dont le refus etait deja enregistre.
      const typesPresents = [...new Set(rows.map((r) => r.type))]
      const typesAutorises = new Set<string>()
      for (const type of typesPresents) {
        const { data: autorise, error: prefErr } = await admin.rpc('is_email_enabled', {
          p_user_id: uid,
          p_type: PREFERENCE_PAR_TYPE[type] ?? type,
        })
        if (prefErr) throw prefErr
        if (autorise) typesAutorises.add(type)
      }

      const retenues = rows.filter((r) => typesAutorises.has(r.type))
      if (retenues.length === 0) continue

      const noms = (type: string) =>
        retenues.filter((r) => r.type === type).map((r) => r.title ?? '')
      const reactionNames = noms('reaction')
      const followNames = noms('follow')
      const commentNames = noms('comment')
      const identificationNames = noms('identification')

      /** "a" ou "ont" selon le nombre de personnes DISTINCTES concernees. */
      const verbe = (n: string[]) => (new Set(n).size > 1 ? 'ont' : 'a')

      const lines: string[] = []
      if (reactionNames.length > 0) {
        lines.push(`${joinNames(reactionNames)} ${verbe(reactionNames)} réagi à tes moments.`)
      }
      if (commentNames.length > 0) {
        lines.push(`${joinNames(commentNames)} ${verbe(commentNames)} commenté tes moments.`)
      }
      if (identificationNames.length > 0) {
        const v = verbe(identificationNames)
        lines.push(`${joinNames(identificationNames)} ${v} proposé une espèce sur tes moments.`)
      }
      if (followNames.length > 0) {
        lines.push(`${joinNames(followNames)} ${verbe(followNames)} commencé à te suivre.`)
      }
      if (lines.length === 0) continue

      const greeting = prof.first_name?.toString().trim()
        ? `${prof.first_name.toString().trim()},`
        : 'Bonjour,'
      // Le sujet annonce ce qui est REELLEMENT dans le mail, dans l'ordre
      // d'importance pour la personne : une identification proposee vaut plus
      // qu'un coeur, et un sujet qui ment sur le contenu use la confiance.
      const subject =
        identificationNames.length > 0
          ? 'On a proposé une espèce sur tes moments'
          : commentNames.length > 0
            ? 'Tu as de nouveaux échanges'
            : reactionNames.length > 0
              ? 'On a réagi à tes moments'
              : 'Tu as de nouveaux migrateurs'
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        lines.map((l) => `<p style="margin:0 0 16px 0;">${l}</p>`).join('') +
        `<p style="margin:0;">Passe voir ce qui t’attend sur Naturegraph.</p>`

      // 4. Envoi via le dispatcher. pref_type='reaction' : le digest social est
      // gate par la preference reaction (le desabonnement de ce mail coupe E7).
      // reference_key = date du jour + fenetre 144h -> au plus 1 E7 par semaine.
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
          // Digest HEBDO (cron dimanche) : 144h (6j) garantit au plus 1 E7 par
          // semaine meme si la fonction est reinvoquee (test, relance manuelle).
          min_interval_hours: 144,
          reference_key: dateKey,
          subject,
          heroTitle: 'Ce que tu as manqué',
          bodyHtml,
          cta: { label: 'Faire un tour sur Naturegraph', url: `${APP_URL}/notifications` },
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
        // UNIQUEMENT les notifs reellement incluses : marquer "emailee" une
        // notif ecartee par preference serait faux dans les donnees, et lui
        // interdirait de partir si la personne reactive ce type plus tard.
        const ids = retenues.map((r) => r.id)
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
