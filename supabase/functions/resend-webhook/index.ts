/**
 * resend-webhook : réception des événements Resend (NG-035)
 * =============================================================================
 *
 * Journalise dans email_events tout ce que Resend nous dit d'un email : envoyé,
 * délivré, rejeté (bounce), signalé comme spam, ouvert, cliqué.
 *
 * Deux usages :
 *   1. Délivrabilité : suivre les bounces et les plaintes, objectif de NG-035.
 *   2. Quota : l'événement 'email.sent' est la SEULE source exhaustive du volume
 *      envoyé. Resend n'expose pas d'API de consommation, et les emails
 *      d'authentification Supabase (codes de connexion) partent en SMTP par
 *      Resend sans passer par notre email_send_log. Sans ce webhook, on ignore
 *      43 % de notre consommation réelle.
 *
 * Sécurité : l'endpoint est PUBLIC (Resend doit pouvoir l'appeler, donc
 * verify_jwt = false). La seule barrière est donc la signature Svix, que l'on
 * vérifie strictement :
 *   - contenu signé : `${svix-id}.${svix-timestamp}.${corps brut}`
 *   - HMAC-SHA256 avec le secret whsec_... décodé depuis le base64
 *   - comparaison à temps constant contre chaque signature `v1,...` fournie
 *   - horodatage rejeté au-delà de 5 minutes (anti-rejeu)
 * Sans secret configuré, on refuse tout : fail closed, jamais fail open sur un
 * endpoint public.
 *
 * Le corps doit être lu BRUT (texte) : la signature casse au moindre reformatage.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''

const JSON_HEADERS = { 'Content-Type': 'application/json' }
/** Tolérance sur l'horodatage, contre le rejeu d'une requête interceptée. */
const TOLERANCE_SECONDES = 5 * 60

const enc = new TextEncoder()

/** Décode le secret `whsec_<base64>` en octets bruts. */
function decodeSecret(secret: string): Uint8Array {
  const base64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const binaire = atob(base64)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

/** Comparaison à temps constant : évite de fuiter la signature par le timing. */
function egaliteConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Vérifie la signature Svix envoyée par Resend. */
async function signatureValide(
  corpsBrut: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
): Promise<boolean> {
  // Anti-rejeu : un horodatage trop ancien ou dans le futur est refusé.
  const horodatage = Number(svixTimestamp)
  if (!Number.isFinite(horodatage)) return false
  const ecart = Math.abs(Math.floor(Date.now() / 1000) - horodatage)
  if (ecart > TOLERANCE_SECONDES) return false

  const cle = await crypto.subtle.importKey(
    'raw',
    decodeSecret(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const contenuSigne = `${svixId}.${svixTimestamp}.${corpsBrut}`
  const signature = await crypto.subtle.sign('HMAC', cle, enc.encode(contenuSigne))

  // Encodage base64 de la signature calculée.
  const octets = new Uint8Array(signature)
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  const attendue = btoa(binaire)

  // Le header peut contenir plusieurs signatures (rotation de secret) :
  // "v1,abc v1,def". Une seule correspondance suffit.
  for (const partie of svixSignature.split(' ')) {
    const [version, valeur] = partie.split(',')
    if (version !== 'v1' || !valeur) continue
    if (egaliteConstante(attendue, valeur)) return true
  }
  return false
}

interface ResendEvent {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[] | string
    subject?: string
    [cle: string]: unknown
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: JSON_HEADERS })
  }

  // Fail closed : sans secret, on ne fait confiance à personne.
  if (!WEBHOOK_SECRET) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET absent : requete refusee')
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: JSON_HEADERS,
    })
  }

  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: 'missing_signature_headers' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }

  // Corps BRUT obligatoire : re-sérialiser du JSON invaliderait la signature.
  const corpsBrut = await req.text()

  if (!(await signatureValide(corpsBrut, svixId, svixTimestamp, svixSignature))) {
    console.error('[resend-webhook] signature invalide')
    return new Response(JSON.stringify({ error: 'invalid_signature' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }

  let evenement: ResendEvent
  try {
    evenement = JSON.parse(corpsBrut)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const type = evenement.type
  if (!type) {
    return new Response(JSON.stringify({ error: 'missing_type' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const donnees = evenement.data ?? {}
  const destinataire = Array.isArray(donnees.to) ? donnees.to[0] : (donnees.to ?? null)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // Rattachement à un compte quand l'adresse correspond. Les emails
    // d'authentification vers une adresse inconnue restent simplement non
    // rattachés (user_id NULL), ce qui est normal.
    let userId: string | null = null
    if (destinataire) {
      const { data: profil } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', destinataire)
        .maybeSingle()
      userId = (profil?.id as string | undefined) ?? null
    }

    // onConflict sur l'index de dedup : un rejeu Svix ne cree pas de doublon.
    const { error } = await admin.from('email_events').insert({
      resend_email_id: donnees.email_id ?? null,
      event: type,
      to_email: destinataire,
      subject: donnees.subject ?? null,
      user_id: userId,
      metadata: donnees,
    })

    // 23505 = violation d'unicite : c'est un rejeu deja enregistre, tout va bien.
    if (error && error.code !== '23505') throw error

    return new Response(JSON.stringify({ ok: true, event: type }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (err) {
    console.error('[resend-webhook] erreur:', err)
    // On renvoie 500 pour que Svix rejoue plus tard plutot que de perdre
    // l'evenement (la dedup empeche le doublon au rejeu).
    return new Response(JSON.stringify({ ok: false, reason: 'internal_error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})
