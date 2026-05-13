/**
 * usePageTitle — Hook pour synchroniser le titre de l'onglet du navigateur
 * ============================================================================
 *
 * Ajoute le titre de la page courante apres le nom du produit, avec un
 * separateur " · " (style Twitter / GitHub).
 *
 * Pourquoi un hook custom plutot que react-helmet ?
 *   - Pas de dependance JS additionnelle (eco-conception)
 *   - Cible : juste le `<title>` (pas de meta tags dynamiques en MVP)
 *   - 10 lignes vs ~3 KB gzip pour react-helmet
 *
 * Restauration : si le composant unmount, on remet le titre par defaut.
 *
 * Usage :
 *
 * ```tsx
 * // Dans une page React
 * function Profile() {
 *   const { t } = useTranslation()
 *   usePageTitle(t('profile.title')) // "Profil · Naturegraph"
 *   return <div>...</div>
 * }
 * ```
 *
 * Refs : QW-UX1 (QUICK_WINS) — BATCH 10
 */

import { useEffect } from 'react'

/** Nom du produit affiche en suffixe (constant pour pas declencher de render). */
const PRODUCT_NAME = 'Naturegraph'

/** Separateur visuel entre titre de page et nom produit (style Twitter). */
const SEPARATOR = ' · '

/**
 * Synchronise le titre du navigateur (`document.title`) avec le titre de la
 * page courante. Restaure le titre par defaut au unmount.
 *
 * @param title Titre de la page (sans suffixe produit). Si vide ou null,
 *              le titre est "Naturegraph" seul.
 */
export function usePageTitle(title?: string | null): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title}${SEPARATOR}${PRODUCT_NAME}` : PRODUCT_NAME
    return () => {
      document.title = previous
    }
  }, [title])
}
