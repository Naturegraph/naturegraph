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
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Minus,
  Plus,
} from 'lucide-react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// ─── Assets ────────────────────────────────────────────────────────
import logoNaturegraph from '@/assets/logo-naturegraph.png'
import heroImg1 from '@/assets/hero-img1.png'
import heroImg2 from '@/assets/hero-img2.png'
import heroImg3 from '@/assets/hero-img3.png'
import valuesNature from '@/assets/values-nature.png'
import ctaKingfisher from '@/assets/cta-kingfisher.png'
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

      <LandingHeader />
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
/*  HEADER — Navbar responsive avec logo, liens et CTA                 */
/* ================================================================== */

function LandingHeader() {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  /** Liens de navigation internes (smooth scroll) */
  const navLinks = [
    { label: t('landing.nav.discover'), href: '#discover' },
    { label: t('landing.nav.values'), href: '#values' },
    { label: t('landing.nav.community'), href: '#community' },
    { label: t('landing.nav.faq'), href: '#faq' },
  ]

  /** Smooth scroll vers une section avec offset pour le header sticky */
  const scrollToSection = (href: string) => {
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      const offset = 80
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border-b border-[var(--color-border-light)]">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between h-16 px-5 lg:px-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={logoNaturegraph}
            alt={t('common.appName')}
            className="h-8 w-auto"
            width={160}
            height={32}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-action-default)] transition-colors bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-action-default)] transition-colors px-4 py-2"
          >
            {t('landing.nav.login')}
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] bg-[var(--color-action-default)] rounded-xl hover:bg-[var(--color-action-hover)] transition-colors"
          >
            {t('landing.nav.signup')}
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="lg:hidden p-2 text-[var(--color-text-secondary)]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t('landing.nav.closeMenu') : t('landing.nav.menu')}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--color-border-light)] bg-[var(--color-bg-primary)] px-5 py-4 space-y-3">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="block w-full text-left text-sm font-medium text-[var(--color-text-secondary)] py-2 bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 space-y-2">
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-[var(--color-action-default)] py-2"
              onClick={() => setMobileOpen(false)}
            >
              {t('landing.nav.login')}
            </Link>
            <Link
              to="/signup"
              className="block text-center px-5 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] bg-[var(--color-action-default)] rounded-xl"
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

/* ================================================================== */
/*  HERO — Section principale avec fond teal, titre et images          */
/* ================================================================== */

function HeroSection() {
  const { t } = useTranslation()

  return (
    <section
      className="w-full bg-[var(--color-bg-primary)] flex justify-center p-0 md:p-6 lg:p-8"
      aria-label="Introduction"
    >
      <div className="relative w-full max-w-[1440px] bg-[var(--color-highlight-primary)] rounded-none md:rounded-[32px] overflow-hidden min-h-[520px] md:min-h-[600px] lg:min-h-[680px] flex flex-col items-center">
        {/* Images décoratives (desktop uniquement) */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
          {/* Image gauche */}
          <div className="absolute left-[8%] bottom-0 w-[180px] h-[380px] rounded-t-[20px] overflow-hidden border-4 border-[var(--color-text-primary)] rotate-[-12deg] origin-bottom opacity-80">
            <img src={heroImg1} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          {/* Image centre-gauche */}
          <div className="absolute left-[22%] bottom-0 w-[180px] h-[380px] rounded-t-[20px] overflow-hidden border-4 border-[var(--color-text-primary)] rotate-[4deg] origin-bottom opacity-80">
            <img src={heroImg3} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          {/* Image centre-droite */}
          <div className="absolute right-[22%] bottom-0 w-[180px] h-[380px] rounded-t-[20px] overflow-hidden border-4 border-[var(--color-text-primary)] rotate-[8deg] origin-bottom opacity-80">
            <img src={heroImg2} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          {/* Image droite */}
          <div className="absolute right-[8%] bottom-0 w-[180px] h-[380px] rounded-t-[20px] overflow-hidden border-4 border-[var(--color-text-primary)] rotate-[-15deg] origin-bottom opacity-80">
            <img src={heroImg1} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
        </div>

        {/* Contenu Hero */}
        <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-6 md:px-10 py-16 lg:py-24">
          <div className="flex flex-col items-center gap-6 md:gap-8 text-center max-w-3xl mx-auto">
            {/* Titre H1 — SEO */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-text-white)] leading-tight font-[var(--font-title)]">
              <span className="block">{t('landing.hero.titleLine1')}</span>
              <span className="block">{t('landing.hero.titleLine2')}</span>
            </h1>

            {/* Sous-titre */}
            <p className="text-base lg:text-lg text-white/85 max-w-xl">
              {t('landing.hero.subtitle')}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full sm:w-auto px-4 sm:px-0">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-[var(--color-highlight-primary)] bg-white rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                {t('landing.hero.ctaShare')}
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('features')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors w-full sm:w-auto bg-transparent cursor-pointer"
              >
                {t('landing.hero.ctaDiscover')}
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator (souris animée) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-2 rounded-full focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Défiler vers le contenu"
          >
            <ChevronDown size={24} className="text-white/60 animate-bounce" />
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

  const cards = [
    {
      icon: <Binoculars size={24} />,
      title: t('landing.features.card1Title'),
      description: t('landing.features.card1Desc'),
    },
    {
      icon: <Camera size={24} />,
      title: t('landing.features.card2Title'),
      description: t('landing.features.card2Desc'),
    },
    {
      icon: <HeartHandshake size={24} />,
      title: t('landing.features.card3Title'),
      description: t('landing.features.card3Desc'),
    },
  ]

  return (
    <RevealSection id="discover" className="py-16 lg:py-24 bg-[var(--color-bg-primary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
            {t('landing.features.title')}
          </h2>
          <p className="text-sm text-[var(--color-text-disabled)] lg:max-w-xs lg:text-right">
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`bg-[var(--color-bg-secondary)] rounded-[32px] p-8 reveal-base revealed reveal-delay-${i + 1}`}
            >
              <div className="w-14 h-14 rounded-full bg-[var(--color-action-default)] text-[var(--color-bg-primary)] flex items-center justify-center mb-6">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                {card.title}
              </h3>
              <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed">
                {card.description}
              </p>
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
    <RevealSection id="values" className="py-16 lg:py-24 bg-[var(--color-bg-primary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          {/* Image gauche */}
          <div className="w-full lg:flex-1 h-[320px] md:h-[480px] lg:h-[560px] rounded-[32px] lg:rounded-[48px] overflow-hidden">
            <img
              src={valuesNature}
              alt="Naturegraph values — explorer la nature"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Contenu droite */}
          <div className="w-full lg:flex-1 flex flex-col gap-8 lg:gap-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
              {t('landing.values.title')}
            </h2>

            <div className="flex flex-col gap-6 lg:gap-8">
              {values.map((value, i) => (
                <div key={i}>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] shrink-0">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                      {value.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed pl-14">
                    {value.description}
                  </p>
                  {/* Séparateur (sauf dernier) */}
                  {i < values.length - 1 && (
                    <div className="mt-6 lg:mt-8 h-px bg-[var(--color-border-light)]" />
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
    <RevealSection id="features" className="py-16 lg:py-24 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        {/* En-tête */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-4">
            {t('landing.detailedFeatures.title')}
          </h2>
          <p className="text-sm text-[var(--color-text-disabled)] max-w-xl mx-auto">
            {t('landing.detailedFeatures.subtitle')}
          </p>
        </div>

        {/* Mobile/Tablet: liste empilée */}
        <div className="lg:hidden space-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 bg-[var(--color-bg-primary)] rounded-2xl p-5">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-highlight-primary)] text-white flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-[var(--color-text-disabled)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: grille 3 colonnes avec phone au centre */}
        <div className="hidden lg:grid grid-cols-3 gap-12 items-center">
          {/* Colonne gauche */}
          <div className="space-y-12">
            {features.slice(0, 2).map((f, i) => (
              <div key={i} className="text-right">
                <div className="flex items-center justify-end gap-3 mb-3">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-highlight-primary)] text-white flex items-center justify-center">
                    {f.icon}
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* Phone mockup centre */}
          <div className="flex justify-center">
            <div className="w-[240px] h-[480px] rounded-[36px] bg-[var(--color-highlight-primary)] shadow-2xl flex items-center justify-center border-4 border-[var(--color-text-primary)] overflow-hidden">
              <img
                src={heroImg2}
                alt="Aperçu de l'application Naturegraph"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-12">
            {features.slice(2).map((f, i) => (
              <div key={i} className="text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-highlight-primary)] text-white flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                </div>
                <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed">
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
    <RevealSection className="w-full" threshold={0.2}>
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[400px] lg:min-h-[500px] overflow-hidden rounded-none lg:rounded-[32px]">
        {/* Contenu gauche — fond teal */}
        <div className="lg:w-1/2 bg-[var(--color-highlight-primary)] px-6 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-8 max-w-md">
            {t('landing.cta.description')}
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[var(--color-highlight-primary)] bg-white rounded-xl hover:bg-gray-50 transition-colors w-fit"
          >
            {t('landing.cta.button')}
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Image droite — martin-pêcheur */}
        <div className="lg:w-1/2 min-h-[300px] lg:min-h-0">
          <img
            src={ctaKingfisher}
            alt="Martin-pêcheur — symbole de la biodiversité"
            className="w-full h-full object-cover"
            loading="lazy"
          />
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
    <RevealSection className="py-16 lg:py-24 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
          {/* Image gauche */}
          <div className="w-full lg:w-[400px] lg:shrink-0">
            <img
              src={missionObserver}
              alt="Observateur nature au coucher du soleil"
              className="w-full h-auto aspect-square rounded-[48px] object-cover"
              loading="lazy"
            />
          </div>

          {/* Contenu droite */}
          <div className="flex flex-col gap-6 w-full">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
              {t('landing.mission.title')}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {t('landing.mission.paragraph1')}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
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
      className="w-full bg-[var(--color-highlight-primary)]"
      threshold={0.15}
    >
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-20">
          {/* Contenu gauche */}
          <div className="flex flex-col gap-8 flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              {t('landing.discord.title')}
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              {t('landing.discord.description')}
            </p>

            {/* Avantages */}
            <ul className="flex flex-col gap-2 text-white/80 text-sm list-disc pl-5">
              {benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            {/* CTA Discord */}
            <a
              href="https://discord.gg/WVFQw2Zh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 text-sm font-semibold text-white bg-[#5865F2] rounded-xl hover:bg-[#4752C4] transition-colors w-fit"
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
            <div className="bg-[var(--color-highlight-secondary)] rounded-[32px] h-[320px] md:h-[400px] lg:h-[480px] relative overflow-hidden flex items-start justify-center pt-12">
              <div className="w-[220px] md:w-[260px] rounded-[16px] overflow-hidden border-4 border-[var(--color-text-primary)]">
                <img
                  src={discordPreview}
                  alt="Aperçu de la communauté Discord Naturegraph"
                  className="w-full h-auto object-cover"
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
    <RevealSection id="faq" className="py-16 lg:py-24 bg-[var(--color-bg-primary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        {/* Desktop : image + questions côte à côte */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Image gauche */}
          <div className="w-full lg:w-[380px] lg:shrink-0">
            <img
              src={faqNature}
              alt="Racines d'arbre couvertes de mousse"
              className="w-full h-auto aspect-square lg:aspect-auto lg:h-full rounded-[32px] lg:rounded-[48px] object-cover"
              loading="lazy"
            />
          </div>

          {/* Questions */}
          <div className="flex-1 flex flex-col gap-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
              {t('landing.faq.title')}
            </h2>

            <div className="flex flex-col gap-3">
              {questions.map((item, i) => (
                <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px]">
                  <button
                    onClick={() => toggleItem(i)}
                    className="flex items-center gap-4 w-full text-left p-5 bg-transparent border-none cursor-pointer"
                    aria-expanded={openItems.has(i)}
                    aria-controls={`faq-answer-${i}`}
                  >
                    <h3 className="flex-1 text-sm font-semibold text-[var(--color-text-primary)]">
                      {item.q}
                    </h3>
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--color-text-secondary)]">
                      {openItems.has(i) ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  {openItems.has(i) && (
                    <div id={`faq-answer-${i}`} className="px-5 pb-5">
                      <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed">
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
    <RevealSection className="py-12 lg:py-16 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 text-center">
        <h2 className="text-lg font-semibold text-[var(--color-text-disabled)] uppercase tracking-wider mb-10">
          {t('landing.partners.title')}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 md:h-20 transition-opacity hover:opacity-70"
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
    <footer className="bg-[var(--color-bg-primary)] border-t border-[var(--color-border-light)]">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src={logoNaturegraph}
              alt={t('common.appName')}
              className="h-8 w-auto mb-4"
              width={160}
              height={32}
            />
            <p className="text-sm text-[var(--color-text-disabled)] leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              {t('footer.product.title')}
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: t('footer.product.values'), section: 'values' },
                { label: t('footer.product.features'), section: 'features' },
                { label: t('footer.product.community'), section: 'community' },
                { label: t('footer.product.mission'), section: 'mission' },
              ].map((item) => (
                <li key={item.section}>
                  <button
                    onClick={() => scrollToSection(item.section)}
                    className="text-sm text-[var(--color-text-disabled)] hover:text-[var(--color-action-default)] transition-colors bg-transparent border-none cursor-pointer p-0"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* À propos */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              {t('footer.about.title')}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-[var(--color-text-disabled)] hover:text-[var(--color-action-default)] transition-colors"
                >
                  {t('footer.about.contact')}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-[var(--color-text-disabled)] hover:text-[var(--color-action-default)] transition-colors"
                >
                  {t('footer.about.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal"
                  className="text-sm text-[var(--color-text-disabled)] hover:text-[var(--color-action-default)] transition-colors"
                >
                  {t('footer.about.legal')}
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA Card */}
          <div>
            <div className="bg-[var(--color-action-default)] rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-2">{t('footer.cta.title')}</p>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 mt-3 text-sm font-semibold text-[var(--color-action-default)] bg-white rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('footer.cta.button')}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[var(--color-border-light)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-disabled)]">{t('footer.copyright')}</p>
          <p className="text-xs text-[var(--color-text-disabled)]">
            Données taxonomiques : TAXREF v18.0 — PatriNat (OFB-CNRS-MNHN-IRD)
          </p>
        </div>
      </div>
    </footer>
  )
}
