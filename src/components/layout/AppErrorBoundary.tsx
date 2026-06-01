/**
 * AppErrorBoundary - Filet global pour les erreurs de rendu React
 *
 * NG-004 (2026-05-31) : sans error boundary, une erreur dans un composant
 * leaf (par exemple un FeedPost mal forme, un fetch qui throw apres render,
 * une mutation qui renvoie une shape inattendue) detruit silencieusement la
 * page entiere. L user voit un ecran blanc et croit que "l app est cassee".
 *
 * Ce composant capture les erreurs au-dessus du router, affiche une UI de
 * recuperation (recharger / retour home / contact), et log l erreur a la
 * console pour le debug. Une integration Sentry pourra etre branchee plus
 * tard via componentDidCatch.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optionnel : composant fallback custom. Par defaut on rend l UI native. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log a la console pour le debug. Si on integre Sentry/LogRocket,
    // c est ici qu on envoie le rapport (avec info.componentStack).
    console.error('[AppErrorBoundary] erreur capturee :', error)
    console.error('[AppErrorBoundary] stack composant :', info.componentStack)
  }

  handleReload = (): void => {
    // Force un reload complet (vide le cache memoire React/Query).
    // Si une erreur d hydratation persiste, le reload est le seul recours.
    window.location.reload()
  }

  handleHome = (): void => {
    // Reset l etat puis navigue. Si l erreur etait sur une page specifique,
    // /home devrait fonctionner.
    this.setState({ hasError: false, error: null })
    window.location.href = '/home'
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream-lighter px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-title font-bold text-2xl text-foreground mb-3">
            Oups, quelque chose s est mal passe
          </h1>
          <p className="text-base text-muted-foreground mb-6">
            On a rencontre un probleme inattendu en chargeant cette page. Aucune donnee n est
            perdue, tu peux recharger l app ou retourner au feed.
          </p>
          <div className="flex flex-col gap-3 items-stretch">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity"
            >
              Recharger l app
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="px-4 py-2 rounded-full border border-border text-foreground font-bold text-base hover:bg-muted/50 transition-colors"
            >
              Retour au feed
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-xs text-muted-foreground text-left">
              <summary className="cursor-pointer">Details techniques</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-muted/30 p-3 rounded">
                {this.state.error.message}
                {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
