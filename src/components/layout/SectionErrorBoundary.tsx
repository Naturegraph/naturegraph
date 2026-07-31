/**
 * SectionErrorBoundary : filet d'erreur LOCAL et re-essayable
 * =============================================================================
 *
 * Complement de `AppErrorBoundary` (global, au-dessus du router). Le filet
 * global rattrape tout, mais au prix fort : une erreur dans UN composant feuille
 * (un post mal forme, un fil d'echange, un panneau de contribution) faisait
 * basculer TOUTE l'app sur la page 500 -> l'utilisateur devait recharger l'app
 * entiere (retour Nicolas 2026-07-30 : "ca plante et me force a relancer").
 *
 * Ce filet-ci s'installe AUTOUR d'une section. Quand un rendu casse a
 * l'interieur :
 *   - le reste de l'app reste debout (header, navigation, autres sections) ;
 *   - la section affiche un petit encart "Un souci s'est produit ici" + bouton
 *     "Reessayer" qui REMONTE le boundary (nouvelle tentative de rendu) au lieu
 *     d'imposer un rechargement complet ;
 *   - `onReset` permet au parent de reinitialiser la source de donnees fautive
 *     (ex: `queryClient.resetQueries`) pour que la nouvelle tentative reparte
 *     d'un etat propre plutot que de re-crasher aussitot.
 *
 * `resetKeys` : si l'une de ces valeurs change (navigation, filtre, user), le
 * boundary se rearme automatiquement. Sans ca, une section restee en erreur le
 * resterait meme apres que la cause a disparu.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { captureException } from '@/lib/monitoring'

interface Props {
  children: ReactNode
  /** Nom de la section (feed, echanges...) : pour les logs / Sentry. */
  label: string
  /**
   * Rendu de repli custom. Recoit `retry` pour recabler un bouton maison.
   * Par defaut on rend l'encart natif.
   */
  fallback?: (retry: () => void) => ReactNode
  /** Appele au clic "Reessayer" AVANT le re-rendu : nettoie la donnee fautive. */
  onReset?: () => void
  /** Un changement d'une de ces valeurs rearme le boundary automatiquement. */
  resetKeys?: ReadonlyArray<unknown>
}

interface State {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Meme observabilite que le filet global, avec le nom de la section pour
    // savoir OU ca casse sans deballer toute l'app.
    console.error(`[SectionErrorBoundary:${this.props.label}]`, error)
    captureException(error, {
      section: this.props.label,
      componentStack: info.componentStack ?? undefined,
    })
  }

  componentDidUpdate(prev: Props): void {
    // Rearmement automatique quand le contexte change (navigation, filtre...).
    if (!this.state.hasError) return
    const a = prev.resetKeys ?? []
    const b = this.props.resetKeys ?? []
    if (a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))) {
      this.setState({ hasError: false })
    }
  }

  private retry = (): void => {
    this.props.onReset?.()
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.retry)

    return (
      <div
        role="alert"
        className="mx-auto my-6 flex max-w-md flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center"
      >
        <p className="font-body text-base text-foreground">
          Un souci s'est produit dans cette partie. Le reste de l'application fonctionne toujours.
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-action-default)] px-5 py-2.5 text-[var(--color-text-white)] transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Réessayer
        </button>
      </div>
    )
  }
}
