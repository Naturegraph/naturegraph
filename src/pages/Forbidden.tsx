/**
 * Forbidden : Page 403 "Acces refuse" (NG-021)
 *
 * Refonte 2026-06-21 (retour Nicolas) : design carte + ecusson hermine via
 * ErrorPageLayout. Affichee pour les acces refuses generiques (espace reserve).
 *
 * Note securite : l'acces a /admin sans role admin NE passe PAS par ici.
 * AdminGuard redirige silencieusement vers /home pour ne PAS reveler l'existence
 * de /admin (anti-leak). Aucune raison technique du refus n'est exposee. noindex.
 *
 * Composant rendu DANS le router : <Link> et hooks react-router OK.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNoIndex } from '@/hooks/useNoIndex'
import {
  ErrorPageLayout,
  errorBtnPrimary,
  errorBtnSecondary,
} from '@/components/layout/ErrorPageLayout'

export default function Forbidden() {
  const { t } = useTranslation()
  usePageTitle(t('forbidden.title', { defaultValue: 'Cet espace est réservé' }))
  useNoIndex()

  return (
    <ErrorPageLayout
      code="403"
      eyebrow={t('forbidden.eyebrow', { defaultValue: 'Accès refusé' })}
      title={t('forbidden.title', { defaultValue: 'Cet espace est réservé' })}
      description={t('forbidden.description', {
        defaultValue:
          "Tu n'as pas accès à cette page. Reviens sur tes pas, on te ramène en terrain connu.",
      })}
    >
      <Link to="/" className={errorBtnSecondary}>
        {t('forbidden.backHome', { defaultValue: "Retour à l'accueil" })}
      </Link>
      <Link to="/login" className={errorBtnPrimary}>
        {t('forbidden.login', { defaultValue: 'Se connecter' })}
      </Link>
    </ErrorPageLayout>
  )
}
