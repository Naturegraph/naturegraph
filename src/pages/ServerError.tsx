/**
 * ServerError : Page 500 "Erreur serveur / runtime" (NG-021)
 *
 * Refonte 2026-06-21 (retour Nicolas) : design carte + ecusson hermine via
 * ErrorPageLayout, coherent avec la 404 et la 403.
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
import {
  ErrorPageLayout,
  errorBtnPrimary,
  errorBtnSecondary,
} from '@/components/layout/ErrorPageLayout'

export default function ServerError({ error }: { error?: Error | null }) {
  const { t } = useTranslation()
  usePageTitle(t('serverError.title', { defaultValue: 'Un pépin dans la forêt' }))
  useNoIndex()

  return (
    <ErrorPageLayout
      code="500"
      eyebrow={t('serverError.eyebrow', { defaultValue: 'Erreur inattendue' })}
      title={t('serverError.title', { defaultValue: 'Un pépin dans la forêt' })}
      description={t('serverError.description', {
        defaultValue:
          "Quelque chose ne s'est pas passé comme prévu. On est sur le coup. Aucune donnée n'est perdue, tu peux recharger ou revenir en terrain connu.",
      })}
      footer={
        <>
          <p>
            {t('serverError.support', { defaultValue: 'Le souci persiste ?' })}{' '}
            <a
              href="mailto:support@naturegraph.ca"
              className="font-semibold text-[var(--color-action-default)] underline underline-offset-2"
            >
              support@naturegraph.ca
            </a>
          </p>

          {/* Details techniques visibles uniquement en developpement. */}
          {import.meta.env.DEV && error && (
            <details className="mt-3 text-xs text-left">
              <summary className="cursor-pointer">Details techniques (dev)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-muted/30 p-3 rounded">
                {error.message}
                {error.stack ? '\n\n' + error.stack : ''}
              </pre>
            </details>
          )}
        </>
      }
    >
      {/* "Retour" en premier (secondary, a gauche desktop). Pas de <Link> : hors router. */}
      <a href="/home" className={errorBtnSecondary}>
        {t('serverError.backHome', { defaultValue: "Retour à l'accueil" })}
      </a>
      <button type="button" onClick={() => window.location.reload()} className={errorBtnPrimary}>
        {t('serverError.reload', { defaultValue: "Recharger l'app" })}
      </button>
    </ErrorPageLayout>
  )
}
