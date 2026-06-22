/**
 * NotFound : Page 404 "Page introuvable" (NG-021)
 *
 * Refonte 2026-06-21 (retour Nicolas) : design carte + ecusson hermine via
 * ErrorPageLayout, fond beige du DS, max 2 actions (les anciennes "suggestions"
 * creaient de la confusion), boutons sans icone, "Retour" en secondary a gauche.
 *
 * Cas d'usage :
 *   - URL tapee a la main inexistante (catch-all `*` dans le router)
 *   - Lien partage devenu obsolete (post supprime, profil banni, etc.)
 *
 * Composant rendu DANS le router : <Link> et hooks react-router OK. noindex.
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

export default function NotFound() {
  const { t } = useTranslation()
  usePageTitle(t('notFound.title', { defaultValue: 'Page introuvable' }))
  useNoIndex()

  return (
    <ErrorPageLayout
      code="404"
      eyebrow={t('notFound.eyebrow', { defaultValue: 'Page introuvable' })}
      title={t('notFound.title', { defaultValue: 'Cette page a migré ailleurs' })}
      description={t('notFound.description', {
        defaultValue:
          "L'adresse que tu cherches n'existe pas ou a été déplacée. Pas de panique, on te ramène en terrain connu.",
      })}
    >
      <Link to="/" className={errorBtnSecondary}>
        {t('notFound.backHome', { defaultValue: "Retour à l'accueil" })}
      </Link>
      <Link to="/home" className={errorBtnPrimary}>
        {t('notFound.exploreFeed', { defaultValue: 'Explorer le feed' })}
      </Link>
    </ErrorPageLayout>
  )
}
