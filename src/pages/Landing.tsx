/**
 * Landing Page — Page d'accueil publique de Naturegraph
 * =====================================================
 * Assemblage de toutes les sections de la landing page.
 * Utilise les tokens CSS du design system Figma, les traductions i18n,
 * et des animations CSS-only (pas de framer-motion) pour l'éco-conception.
 *
 * Sections :
 * 1. Hero (navbar intégrée + titre + CTA + images décoratives)
 * 2. Découvrir (3 cartes fonctionnalités)
 * 3. Valeurs (image + 3 items numérotés)
 * 4. Fonctionnalités détaillées (4 features autour d'un phone mockup)
 * 5. CTA intermédiaire (histoire + image martin-pêcheur)
 * 6. Mission (image + texte)
 * 7. Discord (communauté)
 * 8. FAQ (accordéon accessible)
 * 9. Partenaires (logos)
 * 10. Footer complet
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Binoculars,
  Camera,
  HeartHandshake,
  Compass,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Menu,
  X,
  Minus,
  Plus,
} from 'lucide-react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// ─── Assets ────────────────────────────────────────────────────────
import logoColor from '@/assets/logos/logo-wordmark-color.svg'
import logoWhite from '@/assets/logos/logo-wordmark-white.svg'
import heroImg1 from '@/assets/hero-img1.png'
import heroImg2 from '@/assets/hero-img2.png'
import heroImg3 from '@/assets/hero-img3.png'
import valuesNature from '@/assets/values-nature.png'
import missionObserver from '@/assets/mission-observer.png'
import discordPreview from '@/assets/discord-preview.png'
import faqNature from '@/assets/faq-nature.png'
import partnerEhub from '@/assets/partner-ehub.png'
import partnerKreapulse from '@/assets/partner-kreapulse.png'
import partnerPaloume from '@/assets/partner-paloume.png'

/* ================================================================== */
/*  STYLES CSS-IN-JS pour les animations scroll reveal                 */
/*  (injectées une seule fois, pas de lib externe)                     */
/* ================================================================== */

const REVEAL_STYLES = `
  .reveal-base {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .reveal-base.revealed {
    opacity: 1;
    transform: translateY(0);
  }
  .reveal-delay-1 { transition-delay: 0.1s; }
  .reveal-delay-2 { transition-delay: 0.2s; }
  .reveal-delay-3 { transition-delay: 0.3s; }
  @media (prefers-reduced-motion: reduce) {
    .reveal-base {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
`

/* ================================================================== */
/*  SCROLL REVEAL WRAPPER                                              */
/* ================================================================== */

/**
 * Composant wrapper pour les animations au scroll.
 * Utilise IntersectionObserver via useScrollReveal.
 */
function RevealSection({
  children,
  className = '',
  as: Tag = 'section',
  threshold = 0.1,
  ...props
}: {
  children: React.ReactNode
  className?: string
  as?: 'section' | 'div'
  threshold?: number
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal({ threshold })
  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={`reveal-base ${isVisible ? 'revealed' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

/* ================================================================== */
/*  PAGE LANDING                                                       */
/* ================================================================== */

export default function Landing() {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] overflow-x-hidden"
    >
      {/* Injection des styles d'animation (une seule fois) */}
      <style>{REVEAL_STYLES}</style>

      <HeroSection />
      <DiscoverSection />
      <ValuesSection />
      <AppFeaturesSection />
      <StoryCtaSection />
      <MissionSection />
      <DiscordSection />
      <FaqSection />
      <PartnersSection />
      <LandingFooter />
    </div>
  )
}

/* ================================================================== */
/*  HERO — Section principale : navbar intégrée + titre + phones       */
/*  Fidèle au Figma node 6449:259 (Desktop)                           */
/*  Structure : Section (cream bg, 32px padding) > Container (teal,    */
/*  rounded-[32px]) > Header + Main content + Scroll indicator         */
/*  Les phone mockups sont positionnés en absolu en bas du container   */
/* ================================================================== */

function HeroSection() {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  /** Liens de navigation internes (smooth scroll) */
  const navLinks = [
    { label: t('landing.nav.discover'), href: '#discover' },
    { label: t('landing.nav.values'), href: '#values' },
    { label: t('landing.nav.community'), href: '#community' },
    { label: t('landing.nav.faq'), href: '#faq' },
  ]

  /** Smooth scroll vers une section */
  const scrollToSection = (href: string) => {
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 20
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  return (
    <section
      className="w-full bg-[var(--color-bg-primary)] flex justify-center p-0 md:px-8 md:pt-8"
      aria-label="Introduction"
    >
      <div className="relative w-full max-w-[1440px] bg-[var(--color-highlight-primary)] rounded-none md:rounded-[32px] overflow-hidden flex flex-col">
        {/* ── Header / Navbar (intégré dans le hero teal) ──────────── */}
        <header className="relative z-30 flex items-center justify-between px-6 py-6 lg:px-12 lg:py-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={logoWhite}
              alt={t('common.appName')}
              className="h-10 w-auto"
              width={204}
              height={40}
            />
          </Link>

          {/* Desktop nav — liens blancs centrés */}
          <nav className="hidden lg:flex items-center gap-10" aria-label="Navigation principale">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-base font-normal text-white/90 hover:text-white transition-colors bg-transparent border-none cursor-pointer font-[var(--font-body)]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA — pill violet */}
          <div className="hidden lg:block">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center h-12 px-6 text-base font-bold text-white bg-[var(--color-action-default)] rounded-full hover:bg-[var(--color-action-hover)] transition-colors font-[var(--font-body)]"
            >
              {t('landing.nav.signup')}
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? t('landing.nav.closeMenu') : t('landing.nav.menu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="lg:hidden relative z-30 bg-[var(--color-highlight-primary)] px-6 pb-6 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="block w-full text-left text-base text-white/90 py-2 bg-transparent border-none cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/signup"
              className="block text-center h-12 leading-[48px] font-bold text-white bg-[var(--color-action-default)] rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              {t('landing.nav.signup')}
            </Link>
          </div>
        )}

        {/* ── Contenu principal (titre, sous-titre, CTA) ───────────── */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 md:px-16 pt-8 pb-40 md:pt-16 md:pb-56 lg:pt-16 lg:pb-64">
          {/* Titre H1 — Quicksand Bold 64px */}
          <h1 className="text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-[1.2] font-[var(--font-title)] max-w-4xl">
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
          </h1>

          {/* Sous-titre — Quicksand Regular 18px */}
          <p className="mt-8 text-base lg:text-lg text-white/85 max-w-2xl font-[var(--font-body)]">
            {t('landing.hero.subtitle')}
          </p>

          {/* Boutons CTA — pills */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
            {/* Bouton primaire — violet pill */}
            <Link
              to="/signup"
              className="inline-flex items-center justify-center h-12 px-8 text-base font-bold text-white bg-[var(--color-action-default)] rounded-full hover:bg-[var(--color-action-hover)] transition-colors w-full sm:w-auto font-[var(--font-body)]"
            >
              {t('landing.hero.ctaShare')}
            </Link>
            {/* Bouton secondaire — outline pill */}
            <button
              onClick={() => {
                const el = document.getElementById('discover')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center h-12 px-8 text-base font-bold text-white border border-white/40 rounded-full hover:bg-white/10 transition-colors w-full sm:w-auto bg-transparent cursor-pointer font-[var(--font-body)]"
            >
              {t('landing.hero.ctaDiscover')}
            </button>
          </div>
        </div>

        {/* ── Phone mockups (desktop) ──────────────────────────────── */}
        <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[420px] pointer-events-none z-10 overflow-visible">
          {/* Blobs décoratifs (violet/vert) derrière les phones */}
          <div className="absolute left-[18%] bottom-[10%] w-[200px] h-[200px] bg-[var(--color-action-default)]/30 rounded-full blur-[60px]" />
          <div className="absolute left-[25%] bottom-[25%] w-[150px] h-[150px] bg-[#7ECFB0]/30 rounded-full blur-[50px]" />
          <div className="absolute right-[18%] bottom-[10%] w-[200px] h-[200px] bg-[var(--color-action-default)]/30 rounded-full blur-[60px]" />
          <div className="absolute right-[25%] bottom-[25%] w-[150px] h-[150px] bg-[#7ECFB0]/30 rounded-full blur-[50px]" />

          {/* Phone 1 — gauche extérieur */}
          <div className="absolute left-[6%] bottom-[-20px] w-[220px] h-[476px] rounded-[24px] overflow-hidden shadow-2xl rotate-[-12deg] origin-bottom border-[6px] border-[#1a1a2e]">
            <img
              src={heroImg1}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
          {/* Phone 2 — gauche intérieur */}
          <div className="absolute left-[20%] bottom-[-40px] w-[220px] h-[476px] rounded-[24px] overflow-hidden shadow-2xl rotate-[-4deg] origin-bottom border-[6px] border-[#1a1a2e]">
            <img
              src={heroImg2}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
          {/* Phone 3 — droite intérieur */}
          <div className="absolute right-[20%] bottom-[-40px] w-[220px] h-[476px] rounded-[24px] overflow-hidden shadow-2xl rotate-[4deg] origin-bottom border-[6px] border-[#1a1a2e]">
            <img
              src={heroImg3}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
          {/* Phone 4 — droite extérieur */}
          <div className="absolute right-[6%] bottom-[-20px] w-[220px] h-[476px] rounded-[24px] overflow-hidden shadow-2xl rotate-[12deg] origin-bottom border-[6px] border-[#1a1a2e]">
            <img
              src={heroImg1}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
        </div>

        {/* Phone mockups (tablette) */}
        <div className="hidden md:block lg:hidden absolute bottom-0 left-0 right-0 h-[300px] pointer-events-none z-10">
          <div className="absolute left-[10%] bottom-[-20px] w-[160px] h-[346px] rounded-[20px] overflow-hidden shadow-xl rotate-[-10deg] origin-bottom border-[5px] border-[#1a1a2e]">
            <img
              src={heroImg1}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
          <div className="absolute right-[10%] bottom-[-20px] w-[160px] h-[346px] rounded-[20px] overflow-hidden shadow-xl rotate-[10deg] origin-bottom border-[5px] border-[#1a1a2e]">
            <img
              src={heroImg2}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
              loading="lazy"
            />
          </div>
        </div>

        {/* ── Scroll indicator (souris) ────────────────────────────── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            className="flex flex-col items-center cursor-pointer bg-transparent border-none p-2 rounded-full focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Défiler vers le contenu"
          >
            {/* Icône souris SVG (20×32 comme dans le Figma) */}
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none" aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="18"
                height="30"
                rx="9"
                stroke="white"
                strokeOpacity="0.6"
                strokeWidth="2"
              />
              <circle cx="10" cy="10" r="2" fill="white" fillOpacity="0.8">
                <animate attributeName="cy" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  DISCOVER — 3 cartes de fonctionnalités                             */
/* ================================================================== */

function DiscoverSection() {
  const { t } = useTranslation()

  /** Données des 3 cartes — icônes Lucide matchant le Figma */
  const cards = [
    {
      icon: <Binoculars size={32} strokeWidth={1.5} />,
      title: t('landing.features.card1Title'),
      description: t('landing.features.card1Desc'),
    },
    {
      icon: <Camera size={32} strokeWidth={1.5} />,
      title: t('landing.features.card2Title'),
      description: t('landing.features.card2Desc'),
    },
    {
      icon: <HeartHandshake size={32} strokeWidth={1.5} />,
      title: t('landing.features.card3Title'),
      description: t('landing.features.card3Desc'),
    },
  ]

  return (
    <RevealSection id="discover" className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40">
      {/* Container — px-128 desktop (Figma), adapté mobile/tablette */}
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        {/* ── Titre + sous-titre — même ligne desktop, empilé mobile ── */}
        <div className="mb-8 flex flex-col gap-3 md:mb-12 lg:mb-12 lg:flex-row lg:items-center lg:justify-between">
          {/* H2 — Quicksand Bold 48px desktop / 32px mobile */}
          <h2 className="font-[family-name:var(--font-title)] text-[32px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[40px] lg:text-[48px]">
            {t('landing.features.title')}
          </h2>
          {/* Sous-titre — Quicksand Regular 18px, couleur secondary (pas disabled) */}
          <p className="font-[family-name:var(--font-title)] text-[16px] font-normal leading-[1.2] text-[var(--color-text-secondary)] md:text-[18px] lg:whitespace-nowrap">
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* ── 3 cartes — gap-32px, fond tertiary #FFF4E0 ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`flex flex-col gap-8 rounded-[32px] bg-[var(--color-bg-tertiary)] p-6 md:p-8 reveal-base revealed reveal-delay-${i + 1}`}
            >
              {/* Cercle icône — 56px, violet */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-default)] text-white">
                {card.icon}
              </div>

              {/* Contenu — gap 16px entre titre et description */}
              <div className="flex flex-col gap-4">
                {/* Titre carte — Quicksand Bold 24px */}
                <h3 className="font-[family-name:var(--font-title)] text-[20px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[24px]">
                  {card.title}
                </h3>
                {/* Description — Mulish Regular 16px, line-height 1.5 */}
                <p className="font-[family-name:var(--font-body)] text-[16px] font-normal leading-[1.5] text-[var(--color-text-secondary)]">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  VALUES — Image + 3 valeurs numérotées                              */
/* ================================================================== */

function ValuesSection() {
  const { t } = useTranslation()

  const values = [
    { title: t('landing.values.item1Title'), description: t('landing.values.item1Desc') },
    { title: t('landing.values.item2Title'), description: t('landing.values.item2Desc') },
    { title: t('landing.values.item3Title'), description: t('landing.values.item3Desc') },
  ]

  return (
    <RevealSection id="values" className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-stretch lg:gap-16 xl:gap-24">
          {/* Image gauche — 50% desktop */}
          <div className="w-full overflow-hidden rounded-[32px] lg:w-1/2">
            <img
              src={valuesNature}
              alt="Naturegraph values — explorer la nature"
              className="h-[320px] w-full object-cover md:h-[480px] lg:h-full"
              loading="lazy"
            />
          </div>

          {/* Contenu droite — 50% desktop */}
          <div className="flex w-full flex-col justify-center gap-10 lg:w-1/2 lg:gap-12">
            <h2 className="font-[family-name:var(--font-title)] text-[32px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[40px] lg:text-[48px]">
              {t('landing.values.title')}
            </h2>

            <div className="flex flex-col gap-0">
              {values.map((value, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-4 ${i > 0 ? 'border-t border-[var(--color-border-light)] pt-8' : ''} ${i < values.length - 1 ? 'pb-8' : ''}`}
                >
                  {/* Badge numéro + titre */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-text-primary)]">
                      <span className="font-[family-name:var(--font-title)] text-[14px] font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-title)] text-[18px] font-bold leading-[1.3] text-[var(--color-text-primary)] md:text-[20px]">
                      {value.title}
                    </h3>
                  </div>
                  {/* Description */}
                  <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] md:text-[16px]">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  APP FEATURES — 4 fonctionnalités autour d'un phone mockup          */
/* ================================================================== */

function AppFeaturesSection() {
  const { t } = useTranslation()

  const features = [
    {
      icon: <Camera size={20} />,
      title: t('landing.detailedFeatures.item1Title'),
      description: t('landing.detailedFeatures.item1Desc'),
    },
    {
      icon: <BookOpen size={20} />,
      title: t('landing.detailedFeatures.item2Title'),
      description: t('landing.detailedFeatures.item2Desc'),
    },
    {
      icon: <Compass size={20} />,
      title: t('landing.detailedFeatures.item3Title'),
      description: t('landing.detailedFeatures.item3Desc'),
    },
    {
      icon: <HelpCircle size={20} />,
      title: t('landing.detailedFeatures.item4Title'),
      description: t('landing.detailedFeatures.item4Desc'),
    },
  ]

  return (
    <RevealSection id="features" className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        {/* En-tête centré */}
        <div className="mb-12 text-center lg:mb-20">
          <h2 className="font-[family-name:var(--font-title)] text-[32px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[40px] lg:text-[48px]">
            {t('landing.detailedFeatures.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-title)] text-[16px] font-normal leading-[1.4] text-[var(--color-text-secondary)] md:text-[18px]">
            {t('landing.detailedFeatures.subtitle')}
          </p>
        </div>

        {/* Mobile/Tablet : liste empilée */}
        <div className="flex flex-col gap-4 lg:hidden">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-[24px] bg-[var(--color-bg-tertiary)] p-5 md:p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-highlight-primary)] text-white">
                {f.icon}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-[family-name:var(--font-title)] text-[16px] font-bold leading-[1.3] text-[var(--color-text-primary)] md:text-[18px]">
                  {f.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-[14px] font-normal leading-[1.5] text-[var(--color-text-secondary)] md:text-[15px]">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop : grille 3 colonnes avec phone au centre */}
        <div className="hidden items-center gap-10 lg:grid lg:grid-cols-[1fr_auto_1fr] xl:gap-16">
          {/* Colonne gauche — features 1 & 2, alignées à droite */}
          <div className="flex flex-col gap-16">
            {features.slice(0, 2).map((f, i) => (
              <div key={i} className="text-right">
                <div className="mb-3 flex items-center justify-end gap-4">
                  <h3 className="font-[family-name:var(--font-title)] text-[18px] font-bold leading-[1.3] text-[var(--color-text-primary)] xl:text-[20px]">
                    {f.title}
                  </h3>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-highlight-primary)] text-white">
                    {f.icon}
                  </div>
                </div>
                <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] xl:text-[16px]">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* Phone mockup centre */}
          <div className="flex justify-center">
            <div className="h-[480px] w-[240px] overflow-hidden rounded-[36px] border-4 border-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] shadow-2xl xl:h-[520px] xl:w-[260px]">
              <img
                src={heroImg2}
                alt="Aperçu de l'application Naturegraph"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Colonne droite — features 3 & 4, alignées à gauche */}
          <div className="flex flex-col gap-16">
            {features.slice(2).map((f, i) => (
              <div key={i} className="text-left">
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-highlight-primary)] text-white">
                    {f.icon}
                  </div>
                  <h3 className="font-[family-name:var(--font-title)] text-[18px] font-bold leading-[1.3] text-[var(--color-text-primary)] xl:text-[20px]">
                    {f.title}
                  </h3>
                </div>
                <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] xl:text-[16px]">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  STORY CTA — "Et si chaque sortie devenait une histoire ?"         */
/* ================================================================== */

function StoryCtaSection() {
  const { t } = useTranslation()

  return (
    <RevealSection className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40" threshold={0.2}>
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        {/* Carte CTA — fond tertiaire, coins arrondis */}
        <div className="flex flex-col gap-6 rounded-[32px] bg-[var(--color-bg-tertiary)] p-8 md:p-12 lg:gap-8 lg:p-16">
          {/* Icône */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-action-default)] text-white">
            <Binoculars size={28} strokeWidth={1.5} />
          </div>

          {/* Titre */}
          <h2 className="font-[family-name:var(--font-title)] text-[28px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[36px] lg:max-w-2xl lg:text-[40px]">
            {t('landing.cta.title')}
          </h2>

          {/* Description */}
          <p className="max-w-2xl font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] md:text-[16px]">
            {t('landing.cta.description')}
          </p>

          {/* Bouton CTA */}
          <Link
            to="/signup"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-action-default)] px-6 py-3 font-[family-name:var(--font-title)] text-[14px] font-semibold text-white transition-colors hover:opacity-90 md:px-8 md:py-3.5 md:text-[16px]"
          >
            {t('landing.cta.button')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  MISSION — Donner du sens à chaque observation                      */
/* ================================================================== */

function MissionSection() {
  const { t } = useTranslation()

  return (
    <RevealSection className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          {/* Image gauche — 50% desktop */}
          <div className="w-full overflow-hidden rounded-[32px] lg:w-1/2">
            <img
              src={missionObserver}
              alt="Observateur nature au coucher du soleil"
              className="h-[320px] w-full object-cover md:h-[400px] lg:h-[480px]"
              loading="lazy"
            />
          </div>

          {/* Contenu droite — 50% desktop */}
          <div className="flex w-full flex-col gap-6 lg:w-1/2 lg:gap-8">
            <h2 className="font-[family-name:var(--font-title)] text-[28px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[36px] lg:text-[40px]">
              {t('landing.mission.title')}
            </h2>
            <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] md:text-[16px]">
              {t('landing.mission.paragraph1')}
            </p>
            <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-[var(--color-text-secondary)] md:text-[16px]">
              {t('landing.mission.paragraph2')}
            </p>
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  DISCORD — Communauté                                               */
/* ================================================================== */

function DiscordSection() {
  const { t } = useTranslation()

  const benefits = [
    t('landing.discord.benefit1'),
    t('landing.discord.benefit2'),
    t('landing.discord.benefit3'),
    t('landing.discord.benefit4'),
    t('landing.discord.benefit5'),
  ]

  return (
    <RevealSection
      id="community"
      className="bg-[var(--color-highlight-primary)] py-20 md:py-28 lg:py-40"
      threshold={0.15}
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          {/* Contenu gauche */}
          <div className="flex flex-1 flex-col gap-6 lg:gap-8">
            <h2 className="font-[family-name:var(--font-title)] text-[28px] font-bold leading-[1.2] text-white md:text-[36px] lg:text-[40px]">
              {t('landing.discord.title')}
            </h2>
            <p className="font-[family-name:var(--font-body)] text-[15px] font-normal leading-[1.6] text-white/80 md:text-[16px]">
              {t('landing.discord.description')}
            </p>

            {/* Avantages */}
            <ul
              className="flex flex-col gap-2.5 pl-5 font-[family-name:var(--font-body)] text-[14px] leading-[1.5] text-white/80 md:text-[15px]"
              style={{ listStyleType: 'disc' }}
            >
              {benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            {/* CTA Discord */}
            <a
              href="https://discord.gg/WVFQw2Zh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-[#5865F2] px-6 py-3 font-[family-name:var(--font-title)] text-[14px] font-semibold text-white transition-colors hover:bg-[#4752C4] md:px-8 md:py-3.5 md:text-[16px]"
            >
              {/* Icône Discord inline */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              {t('landing.discord.button')}
            </a>
          </div>

          {/* Image droite — Aperçu Discord */}
          <div className="w-full lg:w-[480px] lg:shrink-0">
            <div className="relative flex h-[320px] items-start justify-center overflow-hidden rounded-[32px] bg-[var(--color-highlight-secondary)] pt-12 md:h-[400px] lg:h-[480px]">
              <div className="w-[220px] overflow-hidden rounded-[16px] border-4 border-[var(--color-text-primary)] md:w-[260px]">
                <img
                  src={discordPreview}
                  alt="Aperçu de la communauté Discord Naturegraph"
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  FAQ — Accordéon accessible                                         */
/* ================================================================== */

function FaqSection() {
  const { t } = useTranslation()
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]))

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const questions = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
  ]

  return (
    <RevealSection id="faq" className="bg-[var(--color-bg-primary)] py-20 md:py-28 lg:py-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32">
        {/* Desktop : image + questions côte à côte */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16 xl:gap-24">
          {/* Image gauche */}
          <div className="w-full overflow-hidden rounded-[32px] lg:w-2/5 lg:shrink-0">
            <img
              src={faqNature}
              alt="Racines d'arbre couvertes de mousse"
              className="h-[300px] w-full object-cover md:h-[400px] lg:h-full"
              loading="lazy"
            />
          </div>

          {/* Questions */}
          <div className="flex flex-1 flex-col gap-8 lg:gap-10">
            <h2 className="font-[family-name:var(--font-title)] text-[28px] font-bold leading-[1.2] text-[var(--color-text-primary)] md:text-[36px] lg:text-[40px]">
              {t('landing.faq.title')}
            </h2>

            <div className="flex flex-col gap-3">
              {questions.map((item, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[20px] border border-[var(--color-border-light)]"
                >
                  <button
                    onClick={() => toggleItem(i)}
                    className="flex w-full cursor-pointer items-center gap-4 border-none bg-transparent p-5 text-left md:p-6"
                    aria-expanded={openItems.has(i)}
                    aria-controls={`faq-answer-${i}`}
                  >
                    <h3 className="flex-1 font-[family-name:var(--font-title)] text-[15px] font-semibold text-[var(--color-text-primary)] md:text-[16px]">
                      {item.q}
                    </h3>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                      {openItems.has(i) ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  {openItems.has(i) && (
                    <div id={`faq-answer-${i}`} className="px-5 pb-5 md:px-6 md:pb-6">
                      <p className="font-[family-name:var(--font-body)] text-[14px] leading-[1.6] text-[var(--color-text-secondary)] md:text-[15px]">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  PARTNERS — Logos des partenaires                                    */
/* ================================================================== */

function PartnersSection() {
  const { t } = useTranslation()

  const partners = [
    { name: 'E-Hub Enerco', logo: partnerEhub, url: 'https://www.hubenerco.bzh/' },
    {
      name: "Kréa'Pulse",
      logo: partnerKreapulse,
      url: 'https://www.ploermelcommunaute.bzh/kreapulse/',
    },
    { name: 'Paloume', logo: partnerPaloume, url: 'https://www.paloume.fr/page/2020316-accueil' },
  ]

  return (
    <RevealSection className="bg-[var(--color-bg-primary)] py-16 md:py-20 lg:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-20 xl:px-32 text-center">
        <h2 className="mb-10 font-[family-name:var(--font-title)] text-[14px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)] md:mb-12 md:text-[16px]">
          {t('landing.partners.title')}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 transition-opacity hover:opacity-70 md:h-20"
              aria-label={`Visiter le site web de ${p.name}`}
            >
              <img
                src={p.logo}
                alt={p.name}
                className="h-full w-auto object-contain"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </RevealSection>
  )
}

/* ================================================================== */
/*  FOOTER — Footer complet avec navigation et CTA                     */
/* ================================================================== */

function LandingFooter() {
  const { t } = useTranslation()

  /** Smooth scroll vers une section */
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = 80
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t border-[var(--color-border-light)] bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-20 lg:py-16 xl:px-32">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src={logoColor}
              alt={t('common.appName')}
              className="mb-4 h-8 w-auto"
              width={160}
              height={32}
            />
            <p className="font-[family-name:var(--font-body)] text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="mb-4 font-[family-name:var(--font-title)] text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('footer.product.title')}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: t('footer.product.values'), section: 'values' },
                { label: t('footer.product.features'), section: 'features' },
                { label: t('footer.product.community'), section: 'community' },
                { label: t('footer.product.mission'), section: 'mission' },
              ].map((item) => (
                <li key={item.section}>
                  <button
                    onClick={() => scrollToSection(item.section)}
                    className="cursor-pointer border-none bg-transparent p-0 font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-action-default)]"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* À propos */}
          <div>
            <h4 className="mb-4 font-[family-name:var(--font-title)] text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('footer.about.title')}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  to="/contact"
                  className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-action-default)]"
                >
                  {t('footer.about.contact')}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-action-default)]"
                >
                  {t('footer.about.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal"
                  className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-action-default)]"
                >
                  {t('footer.about.legal')}
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA Card */}
          <div>
            <div className="rounded-2xl bg-[var(--color-action-default)] p-6">
              <p className="mb-2 font-[family-name:var(--font-title)] text-[14px] font-semibold text-white">
                {t('footer.cta.title')}
              </p>
              <Link
                to="/signup"
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 font-[family-name:var(--font-title)] text-[14px] font-semibold text-[var(--color-action-default)] transition-colors hover:bg-gray-50"
              >
                {t('footer.cta.button')}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border-light)] pt-6 md:flex-row">
          <p className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)]">
            {t('footer.copyright')}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)]">
            Données taxonomiques : TAXREF v18.0 — PatriNat (OFB-CNRS-MNHN-IRD)
          </p>
        </div>
      </div>
    </footer>
  )
}
