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
 * Ton Naturegraph : rassurant, leger, metaphore nature. Aucun detail technique
 * n'est affiche a l'utilisateur (l'erreur part dans la console + Sentry via
 * l'AppErrorBoundary, jamais a l'ecran). noindex.
 */

import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNoIndex } from '@/hooks/useNoIndex'
import {
  ErrorPageLayout,
  errorBtnPrimary,
  errorBtnSecondary,
} from '@/components/layout/ErrorPageLayout'

export default function ServerError() {
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
        <p>
          {t('serverError.support', { defaultValue: 'Le souci persiste ?' })}{' '}
          <a
            href="mailto:support@naturegraph.ca"
            className="font-semibold text-[var(--color-action-default)] underline underline-offset-2"
          >
            support@naturegraph.ca
          </a>
        </p>
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
