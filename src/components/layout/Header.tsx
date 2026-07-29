import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export function Header() {
  const { t, i18n } = useTranslation()
  function toggleLang() {
    const next = i18n.language === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(next)
    localStorage.setItem('naturegraph-lang', next)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-light)] bg-[var(--color-bg-primary)]/95 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label={t('common.appName')}>
          <span className="text-xl font-bold text-[var(--color-link)]">Naturegraph</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          <Link
            to="/"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/explore"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t('nav.explore')}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label={t('settings.language')}
          >
            <Globe size={18} />
          </button>
          {/* Theme toggle : désactivé pour le MVP, réactivation post-MVP */}
        </div>
      </div>
    </header>
  )
}
