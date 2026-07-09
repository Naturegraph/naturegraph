/**
 * email-unsubscribe : lien de désabonnement sans login (NG-045)
 *
 * Deux modes :
 *   - GET  : clic humain depuis un email -> fait le travail serveur puis
 *            REDIRIGE (302) vers la page frontend /desabonnement (Supabase
 *            force text/plain sur les Edge Functions, donc pas de HTML ici).
 *   - POST : désabonnement en un clic (RFC 8058, en-tête List-Unsubscribe-Post).
 *            Gmail/Apple Mail appellent cette URL en POST quand l'utilisateur
 *            clique le "Se désabonner" natif du client mail. On fait le même
 *            travail et on répond 200 (pas de redirection, pas d'UI).
 *
 * Le payload (user_id + type) est authentifié par signature HMAC
 * (cf. _shared/unsubscribeToken.ts), pas par session : un lien de
 * désabonnement ne doit jamais exiger de login.
 *
 * type = 'all'    -> coupe user_settings.email_notifications (tout email auto)
 * type = <autre>  -> coupe notification_preferences.email_enabled pour ce type
 *
 * verify_jwt : false (appel public depuis un client mail).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyUnsubscribeToken } from '../_shared/unsubscribeToken.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUB_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_BASE_URL') ?? 'https://naturegraph.ca'

const PREF_TYPES = new Set([
  'reaction',
  'follow',
  'post',
  'species_digest',
  'weekly_digest',
  'goal_reminder',
  'streak',
])

type UnsubResult = 'ok_all' | 'ok_type' | 'invalid' | 'error'

/** Vérifie la signature et applique le désabonnement. Aucune UI, juste le travail DB. */
async function doUnsubscribe(userId: string, type: string, sig: string): Promise<UnsubResult> {
  if (!userId || !type || !sig) return 'invalid'
  if (!UNSUB_SECRET) {
    console.error('[email-unsubscribe] EMAIL_UNSUB_SECRET non configuré')
    return 'error'
  }
  const valid = await verifyUnsubscribeToken(UNSUB_SECRET, userId, type, sig)
  if (!valid) return 'invalid'
  if (type !== 'all' && !PREF_TYPES.has(type)) return 'invalid'

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  try {
    if (type === 'all') {
      const { error } = await admin
        .from('user_settings')
        .upsert({ user_id: userId, email_notifications: false }, { onConflict: 'user_id' })
      if (error) throw error
      return 'ok_all'
    }
    const { error } = await admin
      .from('notification_preferences')
      .upsert({ user_id: userId, type, email_enabled: false }, { onConflict: 'user_id,type' })
    if (error) throw error
    return 'ok_type'
  } catch (err) {
    console.error('[email-unsubscribe] DB error:', err)
    return 'error'
  }
}

/** Redirige (302) vers la page frontend de confirmation (mode GET, clic humain). */
function redirect(result: UnsubResult): Response {
  const url = new URL('/desabonnement', APP_URL)
  if (result === 'ok_all') {
    url.searchParams.set('status', 'ok')
    url.searchParams.set('scope', 'all')
  } else if (result === 'ok_type') {
    url.searchParams.set('status', 'ok')
    url.searchParams.set('scope', 'type')
  } else {
    url.searchParams.set('status', result) // 'invalid' | 'error'
  }
  return new Response(null, { status: 302, headers: { Location: url.toString() } })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const userId = url.searchParams.get('u') ?? ''
  const type = url.searchParams.get('t') ?? ''
  const sig = url.searchParams.get('sig') ?? ''

  // POST : désabonnement en un clic (RFC 8058). Réponse minimale 200, sans UI.
  if (req.method === 'POST') {
    const result = await doUnsubscribe(userId, type, sig)
    const ok = result === 'ok_all' || result === 'ok_type'
    return new Response(ok ? 'unsubscribed' : result, { status: ok ? 200 : 400 })
  }

  // GET : clic humain -> travail serveur puis redirection vers la page brandée.
  if (req.method === 'GET') {
    const result = await doUnsubscribe(userId, type, sig)
    return redirect(result)
  }

  return redirect('invalid')
})
