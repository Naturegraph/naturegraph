/**
 * Unsubscribe : page de confirmation de désabonnement email (NG-045)
 * ===================================================================
 *
 * Cible de la redirection 302 renvoyée par l'Edge Function `email-unsubscribe`.
 *
 * Pourquoi une page frontend et pas du HTML servi par l'Edge Function ?
 * ────────────────────────────────────────────────────────────────────
 * Supabase force `Content-Type: text/plain` + un CSP `sandbox` sur les
 * réponses des Edge Functions (elles ne sont pas censées servir des pages
 * HTML à un navigateur). Résultat : le HTML s'affichait en code brut, accents
 * cassés. On laisse donc l'Edge Function faire uniquement le travail serveur
 * (vérification HMAC + mise à jour DB), puis elle redirige ici pour l'affichage.
 *
 * IMPORTANT : le désabonnement est DÉJÀ effectué côté serveur avant la
 * redirection. Cette page est purement cosmétique : même si elle ne se
 * chargeait pas, l'utilisateur serait bien désabonné.
 *
 * Route PUBLIQUE (hors BetaAccessGuard, hors auth) : l'utilisateur clique
 * depuis son client mail, sans session ni accès beta.
 *
 * Query params (posés par l'Edge Function) :
 *   - status : 'ok' | 'invalid' | 'error'
 *   - scope  : 'all' (tous les emails) | 'type' (un seul type) : contextualise
 *              le message quand status = 'ok'
 */

import { useSearchParams, Link } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import hermineIcon from '@/assets/images/hermine-icon.png'

interface UnsubContent {
  title: string
  body: string
}

/** Construit le message affiché selon status + scope. */
function resolveContent(status: string | null, scope: string | null): UnsubContent {
  if (status === 'invalid') {
    return {
      title: 'Lien invalide',
      body: "Ce lien de désabonnement n'est pas reconnu ou a été altéré. Si le problème persiste, écris-nous à support@naturegraph.ca.",
    }
  }
  if (status === 'error') {
    return {
      title: 'Une erreur est survenue',
      body: "Ton désabonnement n'a pas pu être enregistré. Écris-nous à support@naturegraph.ca et on s'en occupe manuellement.",
    }
  }
  // status = 'ok' (défaut)
  if (scope === 'all') {
    return {
      title: 'Désabonnement confirmé',
      body: 'Tu ne recevras plus aucun email automatique de Naturegraph. Tu peux réactiver ça à tout moment dans Paramètres puis Notifications.',
    }
  }
  return {
    title: 'Désabonnement confirmé',
    body: "Tu ne recevras plus ce type d'email. Les autres notifications par email restent actives, modifiables dans Paramètres puis Notifications.",
  }
}

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const status = params.get('status')
  const scope = params.get('scope')
  const { title, body } = resolveContent(status, scope)

  usePageTitle(title)

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-off-white px-4 py-12"
    >
      <div className="w-full max-w-md bg-cream-lighter border border-border rounded-2xl shadow-sm p-8 text-center">
        <img
          src={hermineIcon}
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          className="mx-auto mb-4 size-14 rounded-full bg-primary-light"
        />
        <h1 className="font-title font-bold text-xl text-foreground mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Retour à Naturegraph
        </Link>
      </div>
    </main>
  )
}
