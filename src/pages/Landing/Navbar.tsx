/**
 * Navbar : Navigation principale de la landing page
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
import logoSimplified from '@/assets/logos/logo-simplified-light.svg'

interface NavbarProps {
  onNavigate: (sectionId: string) => void
}

/**
 * Bouton de navigation interne : style transparent partagé entre desktop et mobile.
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
  const [mobileOpen, setMobileOpen] = useState(false)

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
    <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 lg:px-12 lg:py-10">
      {/* Logo (BATCH 114 : scale mobile pour éviter de prendre 60% de l'écran) */}
      <Link to="/" className="flex items-center shrink-0">
        <img
          src={logoSimplified}
          alt={t('common.appName')}
          className="w-[140px] sm:w-[180px] lg:w-[204px] h-auto"
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

      {/* Desktop CTA : language switcher : voir docs/archive/feature-language-switcher.md
          (réactivation Phase 2 quand EN sera production-ready) */}
      <div className="hidden lg:flex items-center gap-4">
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

      {/*
        Mobile drawer (BATCH 70, Nicolas decision 2026-05-15) :
        - Fixed full-height, slide-in depuis la droite, prend 3/4 de l'ecran (max 400px)
        - Fond cream (--color-bg-primary) cohereent avec le reste de l'app
        - Backdrop semi-transparent par-dessus le hero pour focus visuel
        - z-50 pour passer au-dessus de tout (orbes Hero, etc.)
        - Animation slide-in 250ms (respect motion-safe)
        - Fermeture : click backdrop, click X, click sur un lien
      */}
      {mobileOpen && (
        <>
          {/* Backdrop assombri */}
          <button
            type="button"
            aria-label={t('landing.nav.closeMenu', { defaultValue: 'Fermer le menu' })}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          />

          {/* Drawer */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t('landing.nav.menu', { defaultValue: 'Menu' })}
            className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-[360px] sm:w-3/4 sm:max-w-[400px] bg-[var(--color-bg-primary)] shadow-2xl flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-250"
          >
            {/* Header du drawer : titre + close */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
              <span className="text-base font-bold text-[var(--color-text-primary)]">
                {t('landing.nav.menu', { defaultValue: 'Menu' })}
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t('landing.nav.closeMenu', { defaultValue: 'Fermer le menu' })}
                className="p-2 -mr-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] transition-colors"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            {/* Liens nav */}
            <nav
              className="flex-1 flex flex-col gap-1 px-4 py-6 overflow-y-auto"
              aria-label={t('landing.nav.menu', { defaultValue: 'Menu' })}
            >
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-action-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* CTA en bas */}
            <div className="px-6 py-5 border-t border-[var(--color-border)]">
              <Button
                to="/signup"
                size="lg"
                className="w-full"
                onClick={() => setMobileOpen(false)}
              >
                {t('landing.nav.signup')}
              </Button>
            </div>
          </aside>
        </>
      )}
    </header>
  )
}
