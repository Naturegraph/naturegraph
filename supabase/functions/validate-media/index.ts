/**
 * validate-media : validation serveur des magic bytes des medias uploades (NG-001)
 * =============================================================================
 *
 * Probleme (NG-001) : Supabase Storage ne valide que le Content-Type DECLARE
 * par le client contre le allowed_mime_types du bucket, jamais les octets reels
 * du fichier. Un TIFF (ou tout autre format) renomme .jpg et envoye avec
 * Content-Type: image/jpeg via un appel direct a l'API (curl) passe la garde
 * bucket. La validation magic-bytes cote client (processMediaForUpload) protege
 * l'IHM mais est trivialement contournable hors navigateur.
 *
 * Cette fonction ferme le trou cote serveur : appelee en async par un webhook DB
 * (trigger AFTER INSERT/UPDATE OF url sur public.media, cf migration
 * 20260717_validate_media_magic_bytes.sql), elle lit les premiers octets du
 * fichier reellement stocke et verifie sa vraie signature.
 *
 * Formats acceptes par le bucket post-media : image/jpeg, image/png, image/webp,
 * video/mp4. Tout le reste (TIFF, GIF, BMP, HEIC, AVIF) est un fichier non
 * conforme : on le supprime du bucket et on marque le media status='invalid'.
 *
 * Philosophie FAIL-OPEN (exigence NG-001) : on ne supprime QUE sur detection
 * POSITIVE d'un format interdit. Toute incertitude (octets illisibles, storage
 * injoignable, signature inconnue) laisse le fichier en place et leve une alerte
 * Sentry. Objectif : ne jamais detruire du contenu legitime sur un doute.
 *
 * Securite :
 *   - Appelee uniquement par le webhook DB, authentifiee par x-cron-secret
 *     (meme secret Vault que les crons NG-045). verify_jwt = false.
 *   - SUPABASE_SERVICE_ROLE_KEY pour supprimer l'objet + mettre a jour media.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { detectFormat, parseStorageUrl } from './mediaMagic.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
// Optionnel : DSN Sentry pour l'alerte fail-open. Absent = repli sur console.error.
const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? ''

// Ces functions internes ne sont pas appelees par le navigateur (webhook DB),
// donc pas de CORS allowlist a gerer : reponses simples.
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// La detection magic-bytes et le parsing d'URL storage vivent dans le module
// pur ./mediaMagic.ts (sans dependance Deno/jsr), afin d'etre testes de facon
// deterministe par vitest hors prod.

// ─── Alerte Sentry (fail-open) ────────────────────────────────────────────────

/**
 * Envoie un evenement Sentry via l'API store si SENTRY_DSN est configure,
 * sinon repli sur console.error. Ne throw jamais (best effort).
 */
async function reportSentry(message: string, extra: Record<string, unknown>): Promise<void> {
  if (!SENTRY_DSN) {
    console.error('[validate-media] (no SENTRY_DSN)', message, JSON.stringify(extra))
    return
  }
  try {
    // DSN : https://<key>@<host>/<project_id>
    const m = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/)
    if (!m) {
      console.error('[validate-media] SENTRY_DSN malforme', message, JSON.stringify(extra))
      return
    }
    const [, key, host, projectId] = m
    const endpoint = `https://${host}/api/${projectId}/store/`
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=validate-media/1.0`,
      },
      body: JSON.stringify({
        message,
        level: 'warning',
        platform: 'other',
        logger: 'validate-media',
        tags: { function: 'validate-media', ticket: 'NG-001' },
        extra,
      }),
    })
  } catch (err) {
    console.error('[validate-media] Sentry report failed', err, message)
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────

interface Payload {
  media_id?: string
  url?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: JSON_HEADERS })
  }

  // Authentification interne : secret partage avec le webhook DB.
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: JSON_HEADERS,
    })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const mediaId = payload.media_id
  const url = payload.url
  if (!mediaId || !url) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const parsed = parseStorageUrl(url)
  if (!parsed) {
    // URL hors schema : on ne peut pas cibler le fichier -> fail-open + alerte.
    await reportSentry('validate-media: URL storage non parsable', { mediaId, url })
    return new Response(JSON.stringify({ ok: true, action: 'skipped_unparsable' }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ─── Lecture des premiers octets (fail-open sur toute erreur) ────────────────
  let head: Uint8Array
  try {
    // 32 octets suffisent largement pour toutes les signatures gerees.
    const res = await fetch(url, { headers: { Range: 'bytes=0-31' } })
    if (!res.ok && res.status !== 206) {
      throw new Error(`fetch status ${res.status}`)
    }
    head = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    // Storage injoignable / fichier illisible : on GARDE le fichier + alerte.
    await reportSentry('validate-media: lecture fichier impossible (fail-open)', {
      mediaId,
      bucket: parsed.bucket,
      path: parsed.path,
      error: err instanceof Error ? err.message : String(err),
    })
    return new Response(JSON.stringify({ ok: true, action: 'fail_open_read_error' }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  const verdict = detectFormat(head)

  // Format autorise ou signature inconnue : on ne touche a rien.
  if (verdict.kind === 'valid') {
    return new Response(JSON.stringify({ ok: true, action: 'valid', detected: verdict.detected }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }
  if (verdict.kind === 'unknown') {
    await reportSentry('validate-media: signature inconnue (fail-open, fichier conserve)', {
      mediaId,
      bucket: parsed.bucket,
      path: parsed.path,
      firstBytesHex: Array.from(head.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join(
        ' ',
      ),
    })
    return new Response(JSON.stringify({ ok: true, action: 'fail_open_unknown' }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  // ─── Detection POSITIVE d'un format interdit : suppression + marquage ────────
  const errors: string[] = []

  const { error: rmError } = await admin.storage.from(parsed.bucket).remove([parsed.path])
  if (rmError) errors.push(`storage.remove: ${rmError.message}`)

  const { error: updError } = await admin
    .from('media')
    .update({ status: 'invalid' })
    .eq('id', mediaId)
  if (updError) errors.push(`media.update: ${updError.message}`)

  // Trace : suppression pour raison de securite. Sentry en info (pas fail-open,
  // c'est le comportement nominal), utile pour mesurer le volume d'abus.
  await reportSentry('validate-media: media invalide supprime', {
    mediaId,
    bucket: parsed.bucket,
    path: parsed.path,
    detected: verdict.detected,
    errors: errors.length ? errors : undefined,
  })

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      action: 'deleted_invalid',
      detected: verdict.detected,
      errors: errors.length ? errors : undefined,
    }),
    { status: 200, headers: JSON_HEADERS },
  )
})
