/**
 * email-unsubscribe : lien de désabonnement sans login (NG-045)
 *
 * Endpoint public GET, appelé en un clic depuis un email. Le payload
 * (user_id + type de notification) est authentifié par une signature HMAC
 * (cf. _shared/unsubscribeToken.ts), pas par une session utilisateur : on ne
 * peut pas exiger un login pour un lien de désabonnement RGPD.
 *
 * type = 'all'    -> coupe user_settings.email_notifications (tout email automatique)
 * type = <autre>  -> coupe notification_preferences.email_enabled pour ce type seul
 *                     (ex: 'weekly_digest' désactive juste E1/E2, pas les emails
 *                     de réaction)
 *
 * Affichage : cette fonction fait UNIQUEMENT le travail serveur (vérif HMAC +
 * mise à jour DB) puis REDIRIGE (302) vers la page frontend /desabonnement.
 * Pourquoi : Supabase force `Content-Type: text/plain` + un CSP `sandbox` sur
 * les réponses des Edge Functions (anti-phishing), donc du HTML servi ici
 * s'affiche en code brut avec accents cassés. La page frontend, elle, rend
 * proprement le message brandé. Le désabonnement est effectué AVANT la
 * redirection : il fonctionne même si la page ne se charge pas.
 *
 * Variables d'env :
 *   - EMAIL_UNSUB_SECRET : secret HMAC partagé avec la génération des liens
 *   - APP_BASE_URL       : origine du site pour construire la redirection
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : injectées automatiquement
 *
 * verify_jwt : false (appel public depuis un client mail, pas de JWT user).
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

/** Redirige (302) vers la page frontend de confirmation avec le statut voulu. */
function redirect(status: 'ok' | 'invalid' | 'error', scope?: 'all' | 'type'): Response {
  const url = new URL('/desabonnement', APP_URL)
  url.searchParams.set('status', status)
  if (scope) url.searchParams.set('scope', scope)
  return new Response(null, { status: 302, headers: { Location: url.toString() } })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return redirect('invalid')
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('u') ?? ''
  const type = url.searchParams.get('t') ?? ''
  const sig = url.searchParams.get('sig') ?? ''

  if (!userId || !type || !sig) {
    return redirect('invalid')
  }

  if (!UNSUB_SECRET) {
    console.error('[email-unsubscribe] EMAIL_UNSUB_SECRET non configuré')
    return redirect('error')
  }

  const valid = await verifyUnsubscribeToken(UNSUB_SECRET, userId, type, sig)
  if (!valid) {
    return redirect('invalid')
  }

  if (type !== 'all' && !PREF_TYPES.has(type)) {
    return redirect('invalid')
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (type === 'all') {
      const { error } = await admin
        .from('user_settings')
        .upsert({ user_id: userId, email_notifications: false }, { onConflict: 'user_id' })
      if (error) throw error
      return redirect('ok', 'all')
    }

    const { error } = await admin
      .from('notification_preferences')
      .upsert({ user_id: userId, type, email_enabled: false }, { onConflict: 'user_id,type' })
    if (error) throw error

    return redirect('ok', 'type')
  } catch (err) {
    console.error('[email-unsubscribe] DB error:', err)
    return redirect('error')
  }
})
