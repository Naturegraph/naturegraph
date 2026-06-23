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
import ServerError from '@/pages/ServerError'
import { captureException } from '@/lib/monitoring'

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
    // Console (debug local) + Sentry (NG-021), avec le stack composant.
    console.error('[AppErrorBoundary] erreur capturee :', error)
    console.error('[AppErrorBoundary] stack composant :', info.componentStack)
    captureException(error, { componentStack: info.componentStack })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    // Page 500 dediee (NG-021). Rendue HORS router : ServerError navigue via
    // <a>/window.location (pas de <Link>), et fait son propre reload.
    // L'erreur n'est PAS passee a la page : elle part en console + Sentry
    // (componentDidCatch ci-dessus), jamais affichee a l'utilisateur.
    return <ServerError />
  }
}
