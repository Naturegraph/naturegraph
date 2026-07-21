// _shared/cors : en-tetes CORS partages avec allowlist d'origines (NG-032)
// ─────────────────────────────────────────────────────────────────────────────
// Les Edge Functions etaient en `Access-Control-Allow-Origin: *`. On restreint
// aux origines connues de l'app (prod, beta, previews Vercel, local). Une origine
// inconnue recoit l'origine prod par defaut : le navigateur bloque alors la
// reponse cross-origin, ce qui est le comportement voulu.
//
// Note : ces functions s'authentifient par token/secret (pas par cookie de
// session), donc le risque CSRF cross-origin est faible. C'est de la defense en
// profondeur, a deployer avec les functions (supabase functions deploy <name>).

/** Origines statiques autorisees (prod, beta, local). */
const STATIC_ALLOWED = new Set<string>([
  'https://naturegraph.ca',
  'https://www.naturegraph.ca',
  'https://naturegraph.fr',
  'https://www.naturegraph.fr',
  'https://beta.naturegraph.ca',
  'http://localhost:5173',
  'http://localhost:3000',
])

/** true si l'origine est autorisee : liste statique ou preview Vercel (*.vercel.app). */
function isAllowedOrigin(origin: string): boolean {
  if (STATIC_ALLOWED.has(origin)) return true
  try {
    return new URL(origin).hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

/**
 * Construit les en-tetes CORS pour la requete. L'origine est reflechie si elle est
 * autorisee, sinon on renvoie l'origine prod par defaut (reponse bloquee cote
 * navigateur pour les origines non listees).
 */
export function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'https://naturegraph.ca'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-waitlist-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

/**
 * Rejet actif des origines tierces (NG-041).
 *
 * A appeler tout en tete de handler. Renvoie une reponse 403 si la requete
 * provient d'une origine NAVIGATEUR non autorisee (en-tete Origin present et
 * hors allowlist), sinon null (la requete continue son cours).
 *
 * Un appel serveur a serveur (cron, webhook DB, invocation interne) n'envoie pas
 * d'en-tete Origin : il est donc laisse passer (return null), ce qui evite de
 * casser les fonctions declenchees en interne. Le CORS ne concerne que les
 * navigateurs ; ce 403 est de la defense en profondeur, doublee de l'auth
 * (verify_jwt / secret) qui reste la vraie barriere.
 */
export function rejectDisallowedOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin')
  // Pas d'Origin = appel serveur/interne : on laisse passer.
  if (!origin) return null
  if (isAllowedOrigin(origin)) return null
  return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
  })
}
