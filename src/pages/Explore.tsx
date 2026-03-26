import { useTranslation } from 'react-i18next'

export default function Explore() {
  const { t } = useTranslation()

  return (
    <main id="main-content" className="container">
      <h1>{t('nav.explore')}</h1>
    </main>
  )
}
