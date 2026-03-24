/**
 * Landing Page — Page d'accueil publique de Naturegraph
 * =====================================================
 * Assemblage modulaire de toutes les sections.
 * Chaque section est un composant dédié, réutilisant les tokens
 * du design system SCSS + les animations framer-motion.
 *
 * Sections :
 * 1. Hero (navbar intégrée + titre + CTA + images)
 * 2. Découvrir (3 cartes fonctionnalités)
 * 3. Valeurs (image + 3 items numérotés)
 * 4. Produit (phone sticky + cartes alternées / slider mobile)
 * 5. CTA intermédiaire (bandeau teal + image)
 * 6. Mission (image + texte)
 * 7. Storytelling (hermine — animal totem + 3 traits)
 * 8. Discord (communauté)
 * 9. FAQ (accordéon accessible)
 * 10. Partenaires (logos)
 * 11. Footer complet
 */

import { useCallback } from 'react'
import './landing.css'

import { Hero } from './Hero'
import { FeaturesCards } from './FeaturesCards'
import { Values } from './Values'
import { ProductFeatures } from './ProductFeatures'
import { CTABanner } from './CTABanner'
import { Mission } from './Mission'
import { Storytelling } from './Storytelling'
import { Discord } from './Discord'
import { FAQ } from './FAQ'
import { Partners } from './Partners'
import { Footer } from './Footer'

export default function Landing() {
  /**
   * Smooth scroll vers une section par son ID.
   * Utilisé par la navbar et le footer.
   */
  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 20
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
      style={{ overflowX: 'clip' }}
    >
      <Hero onNavigate={scrollToSection} />
      <FeaturesCards />
      <Values />
      <ProductFeatures />
      <CTABanner />
      <Mission />
      <Storytelling />
      <Discord />
      <FAQ />
      <Partners />
      <Footer onNavigate={scrollToSection} />
    </div>
  )
}
