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

/**
 * Fil d'Ariane d'une ACTION utilisateur (tap sur un bouton, ouverture d'un
 * panneau, envoi d'un formulaire...). N'envoie RIEN tout seul : il enrichit le
 * contexte des erreurs/replays a venir. Quand quelque chose casse ensuite, on
 * lit la suite des gestes ("a tape Partager -> a ouvert le composer -> ...").
 * Toujours safe / no-op si Sentry est absent.
 */
export function trackAction(action: string, data?: Record<string, unknown>): void {
  try {
    console.debug(`[action] ${action}`, data ?? '')
  } catch {
    /* ignore */
  }
  try {
    sentryRef?.addBreadcrumb?.({ category: 'ui.action', level: 'info', message: action, data })
  } catch {
    /* ignore */
  }
}

/**
 * Signale un ECHEC SILENCIEUX a Sentry : un cas ou l'app ABANDONNE une action
 * sans lancer d'exception (session expiree geree en douce, watchdog, garde-fou
 * qui bloque, bouton qui "ne fait rien"). Sentry ne capte QUE les exceptions ;
 * sans cet appel explicite, ces echecs restent invisibles (retour Nicolas
 * 2026-07-30 : "le bouton ne marche plus et aucune erreur sur Sentry").
 *
 * Remonte en `warning` (pas `error`) : c'est un abandon gere, pas un crash. Avec
 * le Session Replay actif, l'evenement embarque la video de la session.
 */
export function trackFailure(action: string, reason: string, data?: Record<string, unknown>): void {
  try {
    console.warn(`[echec silencieux] ${action} : ${reason}`, data ?? '')
  } catch {
    /* ignore */
  }
  try {
    sentryRef?.captureMessage?.(`Echec silencieux : ${action} (${reason})`, {
      level: 'warning',
      tags: { silent_failure: action },
      extra: { action, reason, ...data },
    })
  } catch {
    /* ignore */
  }
  // Force l'envoi de la VIDEO de session (Session Replay) meme pour un warning :
  // par defaut le replay ne part que sur une erreur. Or un echec silencieux (le
  // fameux "bouton mort") n'est PAS une erreur -> sans ce flush on aurait le
  // contexte mais pas la video. Ici on capture les ~60 dernieres secondes.
  try {
    sentryRef
      ?.getReplay?.()
      ?.flush?.()
      ?.catch?.(() => {})
  } catch {
    /* Replay absent ou non bufferise : ignore */
  }
}

/**
 * Associe l'utilisateur courant a Sentry (id SEUL, jamais email/nom : le
 * `beforeSend` scrubbe deja, et un UUID n'est pas une donnee sensible). Permet a
 * Sentry de compter "combien d'UTILISATEURS touches" par incident -> on priorise
 * ce qui frappe le plus de monde. `null` = deconnexion (on efface).
 */
export function setMonitoringUser(userId: string | null): void {
  try {
    sentryRef?.setUser?.(userId ? { id: userId } : null)
  } catch {
    /* ignore */
  }
}

/**
 * Tag la ROUTE courante sur tous les evenements a venir. Rend le triage
 * instantane ("cet incident frappe /post/:id"). Appele a chaque navigation.
 */
export function setMonitoringRoute(route: string): void {
  try {
    sentryRef?.setTag?.('route', route)
  } catch {
    /* ignore */
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
      // Version de l'app = release Sentry. DOIT etre identique au `release` du
      // sentryVitePlugin (vite.config.ts) pour que les source maps s'associent.
      // Permet : "apparu en V0.6.0", suspect commits, "Resolve in next release",
      // detection auto des regressions. `__APP_VERSION__` = pkg.version injecte
      // au build (cf. vite.config `define`).
      release: __APP_VERSION__,
      // Integrations EXPLICITES : sans elles, le Session Replay et le tracing
      // Web Vitals ne s'activent pas (Sentry affichait "Set up Session Replay"
      // malgre replaysOnErrorSampleRate). L'optional chaining + filter protege
      // des bumps de version (Dependabot) ou une integration serait renommee.
      integrations: [
        Sentry.browserTracingIntegration?.(),
        Sentry.replayIntegration?.({ maskAllText: true, blockAllMedia: true }),
      ].filter(Boolean),
      tracesSampleRate: 0.1,
      // Session Replay. maskAllText + blockAllMedia = aucun contenu perso/photo.
      //
      // replaysSessionSampleRate = 1.0 : ENREGISTRE TOUTES LES SESSIONS, meme
      // SANS erreur. C'EST LE REGLAGE MANQUANT (Nicolas 2026-08-03) : le bug
      // "bouton mort au retour d'arriere-plan" ne lance AUCUNE exception -> avec
      // un enregistrement uniquement-sur-erreur, rien n'etait capture. Le replay
      // se fait au niveau DOM (rrweb), independamment de React : on verra la
      // video meme si React est fige. TEMPORAIRE / DEBUG : a REBAISSER (ex 0.1)
      // une fois le bug diagnostique, pour le quota Sentry.
      replaysSessionSampleRate: 1.0,
      replaysOnErrorSampleRate: 1.0,
      // RGPD : pas de PII
      sendDefaultPii: false,
      // Bruit connu a ignorer : ce ne sont PAS des erreurs de notre app.
      //  - `window.webkit.messageHandlers` / sendDataToNative / sendPageHideMessage :
      //    scripts injectes par les navigateurs in-app Instagram/Facebook (iOS
      //    WKWebView). Ils plantent chez EUX, pas dans notre code, et polluent
      //    Sentry des qu'un lien est ouvert depuis Insta/FB.
      //  - ResizeObserver loop : avertissement navigateur benin, sans impact.
      ignoreErrors: [
        /window\.webkit\.messageHandlers/i,
        'sendDataToNative',
        'sendPageHideMessage',
        /ResizeObserver loop/i,
      ],
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
