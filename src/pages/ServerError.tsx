/**
 * ServerError : Page 500 "Erreur serveur / runtime" (NG-021)
 *
 * Rendue par l'AppErrorBoundary quand une erreur de rendu remonte au-dessus du
 * router. IMPORTANT : ce composant est monte HORS du contexte react-router
 * (l'ErrorBoundary englobe le RouterProvider dans main.tsx). Il ne peut donc PAS
 * utiliser <Link> ni les hooks react-router : on navigue via <a> / window.location.
 *
 * Ton Naturegraph : rassurant, leger, metaphore nature. Pas de jargon technique
 * pour l'utilisateur (les details ne s'affichent qu'en dev). noindex.
 */

import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNoIndex } from '@/hooks/useNoIndex'
import hermineIcon from '@/assets/images/hermine-icon.png'

export default function ServerError({ error }: { error?: Error | null }) {
  const { t } = useTranslation()
  usePageTitle(t('serverError.title', { defaultValue: 'Un pepin dans la foret' }))
  useNoIndex()

  return (
    <main
      id="main-content"
      className="flex flex-col items-center justify-center min-h-screen min-h-[100svh] gap-8 px-4 py-12 text-center bg-[var(--color-bg-secondary)]"
    >
      {/* Illustration decorative (hermine + orbe), coherente avec la 404. */}
      <div className="relative" aria-hidden="true">
        <div
          className="absolute inset-0 -m-12 rounded-full blur-[60px] opacity-50"
          style={{
            background: `radial-gradient(circle, var(--color-action-default) 0%, transparent 70%)`,
          }}
        />
        <div className="relative size-32 rounded-full bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] flex items-center justify-center shadow-lg">
          <img src={hermineIcon} alt="" className="size-16" width={64} height={64} />
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        <p
          className="text-sm font-bold tracking-widest text-[var(--color-action-default)] uppercase"
          aria-label="Erreur 500"
        >
          500 · {t('serverError.eyebrow', { defaultValue: 'Erreur inattendue' })}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {t('serverError.title', { defaultValue: 'Un pepin dans la foret' })}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t('serverError.description', {
            defaultValue:
              "Quelque chose ne s'est pas passe comme prevu. On est sur le coup. Aucune donnee n'est perdue, tu peux recharger ou revenir en terrain connu.",
          })}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-press btn-press-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-action-default)] text-[var(--color-text-white)] font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          {t('serverError.reload', { defaultValue: "Recharger l'app" })}
        </button>
        {/* Pas de <Link> : on est au-dessus du router. */}
        <a
          href="/home"
          className="btn-press btn-press-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-bg-primary)] border-[0.5px] border-[var(--color-border)] text-foreground font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          {t('serverError.backHome', { defaultValue: "Retour a l'accueil" })}
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('serverError.support', { defaultValue: 'Le souci persiste ?' })}{' '}
        <a
          href="mailto:support@naturegraph.ca"
          className="font-semibold text-[var(--color-action-default)] underline underline-offset-2"
        >
          support@naturegraph.ca
        </a>
      </p>

      {/* Details techniques visibles uniquement en developpement (pas pour l'utilisateur final). */}
      {import.meta.env.DEV && error && (
        <details className="mt-2 text-xs text-muted-foreground text-left max-w-md w-full">
          <summary className="cursor-pointer">Details techniques (dev)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words bg-muted/30 p-3 rounded">
            {error.message}
            {error.stack ? '\n\n' + error.stack : ''}
          </pre>
        </details>
      )}
    </main>
  )
}
