/**
 * monitoring.ts : Wiring Sentry (lazy, optionnel)
 *
 * Sentry n'est PAS installé en dépendance directe : ce module charge le SDK
 * dynamiquement uniquement si :
 *   - VITE_SENTRY_DSN est défini
 *   - le package @sentry/react est résoluble
 *
 * Cela permet de garder le bundle clean en local/dev sans Sentry,
 * et d'activer le monitoring en staging/prod via une simple variable d'env.
 *
 * Pour activer définitivement :
 *   npm install @sentry/react
 *   puis définir VITE_SENTRY_DSN dans Vercel.
 */

// Référence Sentry mémorisée après init (le SDK est chargé dynamiquement, donc
// non importable statiquement ailleurs). Permet à authBreadcrumb() d'envoyer des
// fils d'Ariane sans recharger le module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentryRef: any = null

/**
 * Fil d'Ariane « auth » (NG-038 Phase 0 : instrumentation).
 *
 * Trace chaque transition d'authentification / boot pour pouvoir diagnostiquer
 * les vrais echecs en prod (faux etat deconnecte, session perdue, boot lent)
 * AU LIEU de corriger a l'aveugle. Toujours loggue en console (dev + prod), et
 * envoie un breadcrumb Sentry si le monitoring est actif. No-op safe sinon.
 */
export function authBreadcrumb(message: string, data?: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line no-console
    console.debug(`[auth] ${message}`, data ?? '')
  } catch {
    /* console indispo : ignore */
  }
  try {
    sentryRef?.addBreadcrumb?.({ category: 'auth', level: 'info', message, data })
  } catch {
    /* Sentry absent ou erreur : ignore */
  }
}

/**
 * Reporte une exception a Sentry (si actif), sinon log console. No-op safe.
 *
 * Utilise par l'AppErrorBoundary pour remonter les erreurs de rendu (500, NG-021).
 * Le SDK est charge dynamiquement (cf. initMonitoring), d'ou l'usage de sentryRef.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    console.error('[monitoring] exception capturee :', error)
  } catch {
    /* console indispo : ignore */
  }
  try {
    sentryRef?.captureException?.(error, context ? { extra: context } : undefined)
  } catch {
    /* Sentry absent ou erreur : ignore */
  }
}

export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  try {
    // NG-006B : @sentry/react est en dependance -> import dynamique STATIQUE
    // pour que Vite le bundle dans un chunk lazy (telecharge uniquement quand
    // VITE_SENTRY_DSN est defini, donc jamais en local/dev sans DSN).
    // L'ancien import concatene ('@sentry'+'/react') n'etait PAS analysable par
    // Vite -> le SDK n'etait pas bundle -> l'import echouait en prod et Sentry
    // ne s'initialisait jamais (seuls les breadcrumbs console marchaient).
    // Cast `any` volontaire : module optionnel charge dynamiquement, et la
    // signature exacte de Sentry.init/beforeSend bouge entre versions (bumps
    // Dependabot). On garde quand meme le scrubbing PII ci-dessous.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = (await import('@sentry/react').catch(() => null)) as any
    if (!Sentry) {
      console.warn('[monitoring] @sentry/react absent : skip')
      return
    }
    sentryRef = Sentry
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_APP_ENV ?? 'development',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      // RGPD : pas de PII
      sendDefaultPii: false,
      beforeSend(event: { user?: { email?: string; ip_address?: string } }) {
        if (event.user) {
          event.user.email = undefined
          event.user.ip_address = undefined
        }
        return event
      },
    })
  } catch (err) {
    console.warn('[monitoring] init failed', err)
  }
}
