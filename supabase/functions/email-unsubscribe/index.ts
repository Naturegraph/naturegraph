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
 * Retourne directement une page HTML de confirmation (pas de redirection vers
 * l'app) : le désabonnement doit fonctionner même si l'utilisateur ne se
 * reconnecte jamais.
 *
 * Variables d'env :
 *   - EMAIL_UNSUB_SECRET : secret HMAC partagé avec la génération des liens
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : injectées automatiquement
 *
 * verify_jwt : false (appel public depuis un client mail, pas de JWT user).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyUnsubscribeToken } from '../_shared/unsubscribeToken.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUB_SECRET') ?? ''

const PREF_TYPES = new Set([
  'reaction',
  'follow',
  'post',
  'species_digest',
  'weekly_digest',
  'goal_reminder',
  'streak',
])

function htmlPage(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:40px 20px;background-color:#fffaf0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#13131a;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:40px 32px;box-shadow:0 4px 24px rgba(60,67,128,0.08);">
    <div style="font-size:40px;margin-bottom:16px;">🌿</div>
    <h1 style="font-size:22px;margin:0 0 12px 0;color:#13131a;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4869;margin:0;">${message}</p>
  </div>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return htmlPage('Méthode non autorisée', 'Ce lien doit être ouvert depuis un navigateur.')
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('u') ?? ''
  const type = url.searchParams.get('t') ?? ''
  const sig = url.searchParams.get('sig') ?? ''

  if (!userId || !type || !sig) {
    return htmlPage('Lien invalide', 'Ce lien de désabonnement est incomplet ou corrompu.')
  }

  if (!UNSUB_SECRET) {
    console.error('[email-unsubscribe] EMAIL_UNSUB_SECRET non configuré')
    return htmlPage(
      'Indisponible temporairement',
      "Le désabonnement n'a pas pu être traité. Écris-nous à support@naturegraph.ca et on s'en occupe manuellement.",
    )
  }

  const valid = await verifyUnsubscribeToken(UNSUB_SECRET, userId, type, sig)
  if (!valid) {
    return htmlPage('Lien invalide', "Ce lien de désabonnement n'est pas reconnu.")
  }

  if (type !== 'all' && !PREF_TYPES.has(type)) {
    return htmlPage('Lien invalide', 'Type de notification inconnu.')
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (type === 'all') {
      const { error } = await admin
        .from('user_settings')
        .upsert({ user_id: userId, email_notifications: false }, { onConflict: 'user_id' })
      if (error) throw error
      return htmlPage(
        'Désabonnement confirmé',
        'Tu ne recevras plus aucun email automatique de Naturegraph. Tu peux réactiver ça à tout moment dans Paramètres > Notifications.',
      )
    }

    const { error } = await admin
      .from('notification_preferences')
      .upsert({ user_id: userId, type, email_enabled: false }, { onConflict: 'user_id,type' })
    if (error) throw error

    return htmlPage(
      'Désabonnement confirmé',
      "Tu ne recevras plus ce type d'email. Les autres notifications par email restent actives, modifiables dans Paramètres > Notifications.",
    )
  } catch (err) {
    console.error('[email-unsubscribe] DB error:', err)
    return htmlPage(
      'Une erreur est survenue',
      "Le désabonnement n'a pas pu être enregistré. Écris-nous à support@naturegraph.ca et on s'en occupe manuellement.",
    )
  }
})
