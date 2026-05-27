import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Footer global (MainLayout) :
 *   - Copyright Naturegraph
 *   - Liens : Mentions légales + Politique de confidentialité (Nicolas 2026-05-26 :
 *     doivent etre visibles partout dans l app, pas seulement en landing)
 *   - Attribution sources de donnees (iNaturalist + GBIF + Wikidata)
 */
export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            &copy; {new Date().getFullYear()} {t('common.appName')}
          </p>
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]"
            aria-label={t('footer.navLabel', { defaultValue: 'Liens utiles' })}
          >
            <Link
              to="/legal"
              className="hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              {t('footer.legalLink', { defaultValue: 'Mentions légales' })}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              to="/privacy"
              className="hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              {t('footer.privacyLink', { defaultValue: 'Politique de confidentialité' })}
            </Link>
          </nav>
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-3 md:text-right">
          {t('footer.dataAttribution', {
            defaultValue:
              'Données taxonomiques : iNaturalist (CC-BY 4.0), GBIF (CC0), Wikidata (CC0).',
          })}
        </p>
      </div>
    </footer>
  )
}
