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
import { Button } from '@/components/ui'
// import { Globe } from 'lucide-react' // TODO: réactiver avec le language switcher
import logoSimplified from '@/assets/logos/logo-simplified-light.svg'

interface NavbarProps {
  onNavigate: (sectionId: string) => void
}

/**
 * Bouton de navigation interne — style transparent partagé entre desktop et mobile.
 * Évite la duplication de classes longues sur 2 emplacements (header desktop + overlay mobile).
 */
function NavLinkButton({
  label,
  onClick,
  variant,
}: {
  label: string
  onClick: () => void
  variant: 'desktop' | 'mobile'
}) {
  const base =
    'bg-transparent border-none cursor-pointer font-[var(--font-body)] text-[var(--color-text-white)]/90 hover:text-[var(--color-text-white)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-white)]/50 rounded'

  if (variant === 'desktop') {
    // Desktop : underline mint animé qui glisse depuis la gauche au hover
    return (
      <button onClick={onClick} className={`${base} relative text-base font-normal pb-1 group`}>
        {label}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-[var(--color-accent-mint)] origin-left scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-300 ease-out motion-reduce:transition-none"
        />
      </button>
    )
  }

  // Mobile : style simple dans l'overlay
  return (
    <button onClick={onClick} className={`${base} block w-full text-left text-base py-2`}>
      {label}
    </button>
  )
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
          <NavLinkButton
            key={link.id}
            label={link.label}
            onClick={() => handleNav(link.id)}
            variant="desktop"
          />
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
        <Button to="/signup" size="md">
          {t('landing.nav.signup')}
        </Button>
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
            <NavLinkButton
              key={link.id}
              label={link.label}
              onClick={() => handleNav(link.id)}
              variant="mobile"
            />
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
            <Button to="/signup" size="md" className="flex-1" onClick={() => setMobileOpen(false)}>
              {t('landing.nav.signup')}
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
