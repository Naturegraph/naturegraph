import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <main
      id="main-content"
      className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center bg-cream-lighter"
    >
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">
        {t('notFound.title', 'Page introuvable')}
      </h1>
      <p className="text-muted-foreground max-w-sm">
        {t('notFound.description', "La page que tu cherches n'existe pas ou a été déplacée.")}
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 h-12 px-6 rounded-button bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('common.backHome', "Retour à l'accueil")}
      </Link>
    </main>
  )
}
