/**
 * Navbar — Navigation principale de la landing page
 * ===================================================
 * Intégrée dans le hero (fond teal transparent).
 * Menu burger avec overlay sur mobile/tablet.
 * Smooth scroll vers les sections via ancres.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
// import { Globe } from 'lucide-react' // TODO: réactiver avec le language switcher
import logoSimplified from '@/assets/logos/logo-simplified-light.svg'

interface NavbarProps {
  onNavigate: (sectionId: string) => void
}

export function Navbar({ onNavigate }: NavbarProps) {
  const { t } = useTranslation()
  // const { i18n } = useTranslation() // TODO: réactiver avec le language switcher
  const [mobileOpen, setMobileOpen] = useState(false)

  // TODO: réactiver le language switcher quand prêt
  // const toggleLanguage = () => {
  //   const next = i18n.language === 'fr' ? 'en' : 'fr'
  //   i18n.changeLanguage(next)
  // }

  const navLinks = [
    { label: t('landing.nav.discover'), id: 'discover' },
    { label: t('landing.nav.values'), id: 'values' },
    { label: t('landing.nav.community'), id: 'community' },
    { label: t('landing.nav.faq'), id: 'faq' },
  ]

  /** Navigation vers une section + fermeture du menu mobile */
  const handleNav = (id: string) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
    <header className="relative z-30 flex items-center justify-between px-6 py-6 lg:px-12 lg:py-10">
      {/* Logo */}
      <Link to="/" className="flex items-center shrink-0">
        <img
          src={logoSimplified}
          alt={t('common.appName')}
          className="w-[204px] h-auto"
          width={204}
          height={40}
        />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-10" aria-label="Navigation principale">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleNav(link.id)}
            className="text-base font-normal text-[var(--color-text-white)]/90 hover:text-[var(--color-text-white)] transition-colors bg-transparent border-none cursor-pointer font-[var(--font-body)]"
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Desktop CTA (+ Language switcher masqué — fonctionnel, à activer plus tard) */}
      <div className="hidden lg:flex items-center gap-4">
        {/* TODO: Activer le switcher de langue quand prêt
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-white)]/80 hover:text-[var(--color-text-white)] transition-colors bg-transparent border border-[var(--color-text-white)]/20 rounded-full px-3 py-1.5 cursor-pointer"
          aria-label={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
        >
          <Globe size={14} />
          <span className="uppercase">{i18n.language === 'fr' ? 'EN' : 'FR'}</span>
        </button>
        */}
        <Link
          to="/signup"
          className="btn-press btn-press-primary inline-flex items-center justify-center h-12 px-6 text-base font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full font-[var(--font-body)]"
        >
          {t('landing.nav.signup')}
        </Link>
      </div>

      {/* Mobile burger */}
      <button
        className="lg:hidden p-2 text-[var(--color-text-white)] bg-transparent border-none cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? t('landing.nav.closeMenu') : t('landing.nav.menu')}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 z-30 bg-[var(--color-highlight-primary)] px-6 pb-6 space-y-3">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className="block w-full text-left text-base text-[var(--color-text-white)]/90 py-2 bg-transparent border-none cursor-pointer font-[var(--font-body)]"
            >
              {link.label}
            </button>
          ))}
          <div className="flex items-center gap-3 pt-2">
            {/* TODO: Activer le switcher de langue quand prêt
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-white)]/80 hover:text-[var(--color-text-white)] bg-transparent border border-[var(--color-text-white)]/20 rounded-full px-3 py-1.5 cursor-pointer"
              aria-label={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
            >
              <Globe size={14} />
              <span className="uppercase">{i18n.language === 'fr' ? 'EN' : 'FR'}</span>
            </button>
            */}
            <Link
              to="/signup"
              className="btn-press btn-press-primary flex-1 text-center h-12 leading-[48px] font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              {t('landing.nav.signup')}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
