/**
 * check-missed-feed : E2 "Cette semaine sur Naturegraph" (NG-045, refonte 2026-07-27)
 * =============================================================================
 *
 * ANCIEN E2 : relance ciblee "ce que tu as manque", declenchee par l'absence
 * (`last_active_at`). Elle ne partait qu'a ~7 comptes sur 50, car 44% des
 * comptes ont `last_active_at` NULL et etaient donc exclus.
 *
 * NOUVEL E2 : rendez-vous HEBDOMADAIRE du dimanche, envoye au plus grand nombre
 * (~48 destinataires mesures), qui montre la vraie vie de la semaine pour
 * ramener du monde sur le fil. Voir `docs/EMAIL_E2_CETTE_SEMAINE_SPEC.md`.
 *
 * SELECTION (section 2 du spec). Un compte recoit E2 si :
 *   1. il est onboarde (`first_name` non vide OU `interests` non vide) ;
 *   2. `is_internal = false` ;
 *   3. il a <= 2 publications sur 7 jours (les gros contributeurs, deja
 *      presents, n'ont pas besoin d'etre ramenes) ;
 *   4. il n'a pas coupe l'email (`is_email_enabled(user, 'weekly_digest')`).
 * `last_active_at` n'intervient PLUS : NULL = eligible. "Forcer l'envoi" veut
 * dire forcer le declencheur d'activite, JAMAIS le desabonnement (CASL / Loi 25).
 *
 * PLANCHER (section 3). Si moins de 3 obs publiques sur la semaine, on n'envoie
 * rien : un digest vide est contre-productif.
 *
 * CONTENU (section 4). 100% texte, aucune image (poids, delivrabilite, eco). Le
 * SOCLE (compte d'obs, especes reelles variees, "X a identifier") est calcule
 * UNE FOIS et partage. Seuls le prenom et le bloc perso varient par destinataire.
 *
 * Modes : body { user_id } (test cible) ou body {} (cron du dimanche).
 * `email_type` reste 'e2_missed' en interne pour la continuite de
 * `email_send_log` : seul le copywriting change.
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

/** Fenetre de la semaine ecoulee. */
const SEPT_JOURS_MS = 7 * 24 * 3600_000

interface Destinataire {
  id: string
  email: string
  first_name: string | null
  interests: unknown | null
}

/** Article francais approximatif pour une enumeration d'especes ("un" / "une"). */
function article(nom: string): string {
  // Regle simple : les noms finissant par un "e" muet prennent "une". Ce n'est
  // pas parfait (le hasard des noms d'especes), mais un email n'a pas besoin
  // d'une morphologie exacte, juste d'une lecture naturelle.
  return /e$/i.test(nom.trim()) ? 'une' : 'un'
}

/** "un Fou de bassan, un Chevreuil europeen et un Heron cendre". */
function enumererEspeces(noms: string[]): string {
  const avecArticle = noms.map((n) => `${article(n)} ${n}`)
  if (avecArticle.length === 1) return avecArticle[0]
  return `${avecArticle.slice(0, -1).join(', ')} et ${avecArticle[avecArticle.length - 1]}`
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
  const depuis = new Date(Date.now() - SEPT_JOURS_MS).toISOString()

  try {
    // ── SOCLE COMMUN (calcule une seule fois) ────────────────────────────────

    // Obs publiques de la semaine : sert au compte N ET au plancher.
    const { count: nObs, error: obsErr } = await admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('created_at', depuis)
    if (obsErr) throw obsErr
    const totalObs = nObs ?? 0

    // PLANCHER : semaine trop creuse -> on ne construit meme pas l'email.
    if (totalObs < 3) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: 'semaine_creuse', obs: totalObs }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Especes identifiees de la semaine, pour en piocher jusqu'a 5 VARIEES par
    // groupe taxo. On tire large (30) puis on filtre en memoire : plus simple et
    // moins couteux qu'un DISTINCT ON cote SQL a ce volume.
    const { data: especesBrutes, error: espErr } = await admin
      .from('posts')
      .select('species_name, taxonomic_group')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('created_at', depuis)
      .not('species_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (espErr) throw espErr

    // Une espece par groupe taxo d'abord (la diversite se voit mieux qu'une
    // liste de trois oiseaux), puis on complete si moins de 5 groupes.
    const parGroupe = new Map<string, string>()
    const restantes: string[] = []
    for (const row of especesBrutes ?? []) {
      const nom = (row.species_name as string | null)?.trim()
      if (!nom) continue
      const groupe = (row.taxonomic_group as string | null) ?? '_'
      if (!parGroupe.has(groupe)) parGroupe.set(groupe, nom)
      else restantes.push(nom)
    }
    const especes = [...parGroupe.values(), ...restantes].slice(0, 5)

    // Obs de la semaine encore a identifier : hameçon vers l'identification.
    const { count: nPending } = await admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('visibility', 'public')
      .eq('identification_status', 'pending')
      .gte('created_at', depuis)
    const aIdentifier = nPending ?? 0

    // Comptes ayant publie du public cette semaine : sert au bloc perso (savoir
    // si un compte SUIVI par le destinataire a ete actif). Un seul chargement.
    const { data: publieurs, error: pubErr } = await admin
      .from('posts')
      .select('user_id, created_at')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('created_at', depuis)
      .order('created_at', { ascending: false })
    if (pubErr) throw pubErr
    // Map auteur -> date de publication la plus recente cette semaine.
    const derniereParAuteur = new Map<string, string>()
    for (const row of publieurs ?? []) {
      const uid = row.user_id as string
      if (!derniereParAuteur.has(uid)) derniereParAuteur.set(uid, row.created_at as string)
    }

    // Phrase d'especes du socle, calculee une fois.
    const ligneEspeces =
      especes.length > 0
        ? `<p style="margin:0 0 16px 0;">Parmi elles, ${enumererEspeces(especes)}.</p>`
        : ''
    const ligneIdentif =
      aIdentifier > 0
        ? `<p style="margin:0 0 16px 0;">${aIdentifier} observation${aIdentifier > 1 ? 's' : ''} attend${aIdentifier > 1 ? 'ent' : ''} encore d'être identifiée${aIdentifier > 1 ? 's' : ''}.</p>`
        : ''

    // ── DESTINATAIRES ────────────────────────────────────────────────────────

    let candidats: Destinataire[] = []
    if (body.user_id) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, interests, is_internal')
        .eq('id', body.user_id)
      if (error) throw error
      // En test on ne filtre pas sur is_internal (pour pouvoir se cibler
      // soi-meme), mais on garde tous les autres garde-fous plus bas.
      candidats = (data ?? []) as Destinataire[]
    } else {
      // Publications par compte sur 7j, pour appliquer la regle "<= 2".
      const { data: pubCounts, error: cntErr } = await admin
        .from('posts')
        .select('user_id')
        .eq('status', 'published')
        .gte('created_at', depuis)
      if (cntErr) throw cntErr
      const pubParCompte = new Map<string, number>()
      for (const row of pubCounts ?? []) {
        const uid = row.user_id as string
        pubParCompte.set(uid, (pubParCompte.get(uid) ?? 0) + 1)
      }

      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name, interests')
        .eq('is_internal', false)
      if (error) throw error
      candidats = (data ?? [])
        // Onboarde : prenom OU centres d'interet.
        .filter((p) => {
          const prenom = (p.first_name as string | null)?.trim()
          const interets = p.interests
          return !!prenom || (interets != null && interets !== '')
        })
        // <= 2 publications sur la semaine.
        .filter((p) => (pubParCompte.get(p.id as string) ?? 0) <= 2) as Destinataire[]
    }

    let sent = 0
    for (const dest of candidats) {
      // BLOC PERSO. Comptes suivis par ce destinataire, parmi ceux qui ont
      // publie cette semaine, tries du plus recemment actif.
      const { data: suivis, error: folErr } = await admin
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(username)')
        .eq('follower_id', dest.id)
      if (folErr) throw folErr

      const suivisActifs = (suivis ?? [])
        .map((f) => ({
          id: f.following_id as string,
          username: (f.profiles as { username?: string } | null)?.username ?? null,
          derniere: derniereParAuteur.get(f.following_id as string) ?? null,
        }))
        .filter((s) => s.derniere !== null && s.username)
        .sort((a, b) => (b.derniere! > a.derniere! ? 1 : -1))

      let blocPerso = ''
      if (suivisActifs.length > 0) {
        const vedette = suivisActifs[0]
        const autres = suivisActifs.length - 1
        const suffixe =
          autres > 0
            ? ` et ${autres} autre${autres > 1 ? 's' : ''} que tu suis ont publié cette semaine`
            : " : ses dernières observations viennent d'arriver sur le fil"
        blocPerso =
          `<p style="margin:0 0 16px 0;padding:12px 16px;background:#f3f4fb;border-radius:8px;">` +
          `Tu suis <strong>${vedette.username}</strong>${suffixe}. ` +
          `<a href="${APP_URL}/profile/${vedette.username}" style="color:#5f5dd8;">Voir son profil</a></p>`
      }

      const greeting = dest.first_name?.trim() ? `${dest.first_name.trim()},` : 'Bonjour,'
      const bodyHtml =
        `<p style="margin:0 0 16px 0;">${greeting}</p>` +
        `<p style="margin:0 0 16px 0;"><strong>${totalObs} nouvelles observations</strong> ont été partagées cette semaine par les migrateurs de la communauté.</p>` +
        ligneEspeces +
        ligneIdentif +
        blocPerso +
        `<p style="margin:0;">Elles t'attendent sur le fil, avec les personnes qui les ont photographiées.</p>`

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
        body: JSON.stringify({
          user_id: dest.id,
          to_email: dest.email,
          email_type: 'e2_missed',
          category: 'weekly_marketing',
          pref_type: 'weekly_digest',
          // E2 a sa PROPRE dedup (section 5, option recommandee) : le dispatcher
          // ne compte que les envois `e2_missed` de la semaine, hors du cap
          // partage avec E3/E4, pour garantir le rendez-vous du dimanche.
          // L'opt-out reste applique en amont via `pref_type`.
          ownDedup: true,
          min_interval_hours: 168,
          subject: 'Cette semaine sur Naturegraph',
          heroTitle: 'Cette semaine sur Naturegraph',
          bodyHtml,
          cta: { label: 'Découvrir le fil', url: `${APP_URL}/home` },
        }),
      })
      if (!resp.ok) {
        console.error('[check-missed-feed] dispatch failed for', dest.id, await resp.text())
        continue
      }
      const result = await resp.json()
      if (result.sent) sent += 1
    }

    return new Response(
      JSON.stringify({ ok: true, candidats: candidats.length, sent, obs: totalObs }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[check-missed-feed]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
