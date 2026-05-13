import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Explore() {
  const { t } = useTranslation()
  // BATCH 10 / QW-UX1 : titre dynamique pour onglet navigateur
  usePageTitle(t('nav.explore'))

  return (
    <main id="main-content" className="container">
      <h1>{t('nav.explore')}</h1>
    </main>
  )
}
