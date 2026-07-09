// _shared/unsubscribeToken : lien de désabonnement signé, sans login (NG-045)
// ─────────────────────────────────────────────────────────────────────────────
// Chaque email automatique doit contenir un lien de désabonnement fonctionnel
// (RGPD/Loi 25). Le lien ne doit pas exiger de connexion (l'utilisateur clique
// depuis son client mail), mais ne doit pas non plus permettre à n'importe qui
// de désabonner n'importe quel autre user : le payload (user_id + type) est
// signé par HMAC-SHA256 avec un secret côté serveur (EMAIL_UNSUB_SECRET).
//
// Format du lien : /unsubscribe?u=<user_id>&t=<type>&sig=<signature base64url>
// Pas d'expiration : un lien de désabonnement doit rester valide indéfiniment
// (sinon un vieil email non lu devient un piège RGPD).

const enc = new TextEncoder()

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function payload(userId: string, type: string): string {
  return `${userId}:${type}`
}

/** Signe (user_id, type) pour construire un lien de désabonnement. */
export async function signUnsubscribeToken(
  secret: string,
  userId: string,
  type: string,
): Promise<string> {
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload(userId, type)))
  return toBase64Url(sig)
}

/** Vérifie qu'une signature correspond bien à (user_id, type) pour ce secret. */
export async function verifyUnsubscribeToken(
  secret: string,
  userId: string,
  type: string,
  signature: string,
): Promise<boolean> {
  const expected = await signUnsubscribeToken(secret, userId, type)
  // Comparaison à temps constant : la longueur des tokens HMAC-SHA256 encodés
  // est fixe, donc pas de fuite d'info via la longueur ici.
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

/** Construit l'URL complète de désabonnement pour un email donné. */
export async function buildUnsubscribeUrl(
  secret: string,
  baseUrl: string,
  userId: string,
  type: string,
): Promise<string> {
  const sig = await signUnsubscribeToken(secret, userId, type)
  const url = new URL('/functions/v1/email-unsubscribe', baseUrl)
  url.searchParams.set('u', userId)
  url.searchParams.set('t', type)
  url.searchParams.set('sig', sig)
  return url.toString()
}
