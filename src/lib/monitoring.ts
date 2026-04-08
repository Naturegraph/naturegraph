/**
 * monitoring.ts — Wiring Sentry (lazy, optionnel)
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

export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  try {
    // Chemin fragmenté pour éviter l'analyse statique de Vite en dev
    // (le package n'est pas installé — chargé uniquement en prod via VITE_SENTRY_DSN)
    const sentryPkg = '@sentry' + '/react'
    // @ts-expect-error — import dynamique optionnel, non résolu en dev
    const Sentry = await import(sentryPkg).catch(() => null)
    if (!Sentry) {
      console.warn('[monitoring] @sentry/react absent — skip')
      return
    }
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
