// _shared/sentry : remontee des erreurs Edge Functions vers Sentry (NG, 2026-08-04)
// ─────────────────────────────────────────────────────────────────────────────
// Jusqu'ici les Edge Functions (crons email NG-045, alertes, moderation) ne
// remontaient RIEN a Sentry : un crash serveur (ex E2 coupe a 23/42
// destinataires) restait invisible tant que personne ne lisait les logs Supabase.
// Ce module donne enfin de la visibilite backend, en miroir du monitoring front.
//
// POURQUOI PAS le SDK @sentry/deno : on evite d'ajouter une dependance lourde a
// 24 fonctions. On envoie directement une "envelope" Sentry par fetch (le format
// d'ingestion HTTP documente). C'est ~40 lignes, sans dependance, et ca marche
// dans le runtime Deno des Edge Functions.
//
// ACTIVATION : definir le secret `SENTRY_EDGE_DSN` (ou `SENTRY_DSN`) sur le projet
// Supabase (Edge Functions > Secrets). Le DSN Sentry est public (il est deja dans
// le bundle client), donc le reutiliser cote edge est sans risque. Sans DSN, tout
// est no-op : on log en console.error comme avant, rien ne casse.

// DSN lu au chargement du module (une fois par cold start). Fallback SENTRY_DSN
// pour reutiliser le meme secret que d'autres usages eventuels.
const DSN = Deno.env.get('SENTRY_EDGE_DSN') ?? Deno.env.get('SENTRY_DSN') ?? ''
// Environnement Sentry : par defaut 'production' (les Edge Functions tournent sur
// le projet prod). Surchargable via SENTRY_ENV si un jour on separe dev/prod.
const ENVIRONMENT = Deno.env.get('SENTRY_ENV') ?? 'production'

interface ParsedDsn {
  ingestUrl: string
}

/**
 * Decompose un DSN Sentry (`https://<publicKey>@<host>/<projectId>`) en URL
 * d'ingestion "envelope". Retourne null si le DSN est absent ou malforme.
 */
function parseDsn(dsn: string): ParsedDsn | null {
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const publicKey = u.username
    const projectId = u.pathname.replace(/^\//, '')
    if (!publicKey || !projectId) return null
    return {
      ingestUrl: `${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`,
    }
  } catch {
    return null
  }
}

const PARSED = parseDsn(DSN)

/** Corps commun d'un event Sentry (champs partages exception + message). */
function baseEvent(fn: string, level: 'error' | 'warning') {
  const eventId = crypto.randomUUID().replace(/-/g, '')
  return {
    eventId,
    payload: {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'javascript' as const,
      level,
      environment: ENVIRONMENT,
      server_name: fn,
      // Tag dedie : dans Sentry on filtre/alerte sur `edge_function:<nom>`.
      tags: { edge_function: fn, runtime: 'deno-edge' },
    },
  }
}

/**
 * Poste une envelope Sentry (un seul item `event`). No-op si pas de DSN.
 * Best-effort : on n'attend jamais que ca bloque la reponse de la fonction.
 */
async function sendEnvelope(eventId: string, event: Record<string, unknown>): Promise<void> {
  if (!PARSED) return
  const sentAt = new Date().toISOString()
  const envelope =
    `${JSON.stringify({ event_id: eventId, sent_at: sentAt })}\n` +
    `${JSON.stringify({ type: 'event' })}\n` +
    `${JSON.stringify(event)}\n`
  try {
    await fetch(PARSED.ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    })
  } catch (e) {
    // Sentry injoignable : on ne casse jamais la fonction pour ca.
    console.warn('[sentry-edge] envoi echoue', e)
  }
}

/**
 * Capture une EXCEPTION edge vers Sentry (+ console.error toujours). `fn` = nom
 * de la fonction (tag + server_name). `extra` = contexte libre (ids, compteurs).
 * Le message + la stack partent dans `exception.value` et `extra.stacktrace`
 * (frames non parsees : suffisant pour lire l'erreur, robuste sans SDK).
 */
export async function captureEdgeException(
  fn: string,
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  console.error(`[${fn}]`, err)
  const isErr = err instanceof Error
  const { eventId, payload } = baseEvent(fn, 'error')
  await sendEnvelope(eventId, {
    ...payload,
    exception: {
      values: [{ type: isErr ? err.name : 'Error', value: isErr ? err.message : String(err) }],
    },
    extra: { ...extra, stacktrace: isErr ? err.stack : undefined },
  })
}

/**
 * Capture un MESSAGE edge (echec gere, non-throw) vers Sentry en `warning` par
 * defaut : un envoi email rate pour un destinataire, un garde-fou declenche...
 * Miroir de `trackFailure` cote front.
 */
export async function captureEdgeMessage(
  fn: string,
  message: string,
  extra?: Record<string, unknown>,
  level: 'warning' | 'error' = 'warning',
): Promise<void> {
  console.warn(`[${fn}] ${message}`, extra ?? '')
  const { eventId, payload } = baseEvent(fn, level)
  await sendEnvelope(eventId, { ...payload, message, extra })
}

/**
 * Enveloppe un handler `Deno.serve` : capture vers Sentry TOUTE exception qui
 * s'echapperait du handler (avec le nom de la fonction + l'URL/methode), puis
 * renvoie un 500 propre au lieu d'un crash muet. Filet de securite uniforme sur
 * les 24 fonctions : c'est ce qui aurait rendu le crash E2 (coupe a 23/42)
 * visible tout seul. Les try/catch internes des fonctions restent la barriere
 * de premiere ligne ; ceci rattrape ce qui passe au travers.
 */
export function serveWithSentry(
  fn: string,
  handler: (req: Request) => Response | Promise<Response>,
): void {
  Deno.serve(async (req: Request) => {
    try {
      return await handler(req)
    } catch (err) {
      await captureEdgeException(fn, err, { url: req.url, method: req.method })
      return new Response(JSON.stringify({ ok: false, reason: 'server_error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  })
}
