import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 lg:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            &copy; {new Date().getFullYear()} {t('common.appName')}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {t('footer.dataAttribution', {
              defaultValue:
                'Données taxonomiques : iNaturalist (CC-BY 4.0), GBIF (CC0), Wikidata (CC0).',
            })}
          </p>
        </div>
      </div>
    </footer>
  )
}
