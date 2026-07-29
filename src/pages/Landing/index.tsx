/**
 * Landing Page : Page d'accueil publique de Naturegraph
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
 * 7. Discord (communauté)
 * 8. FAQ (accordéon accessible)
 * 9. Partenaires (logos)
 * 10. Footer complet
 */

import { useCallback } from 'react'
import '@/styles/pages/landing.css'

import { Hero } from './Hero'
import { FeaturesCards } from './FeaturesCards'
import { Values } from './Values'
import { ProductFeatures } from './ProductFeatures'
import { CTABanner } from './CTABanner'
import { Mission } from './Mission'
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
      /*
        NG-058 : la landing reste TOUJOURS claire (decision Nicolas 2026-07-23).
        C'est la seule page vue par des gens qui ne connaissent pas encore le
        produit : son rendu ne doit pas dependre du reglage systeme d'un
        visiteur. Cet attribut, plus proche que celui pose sur <html>, gagne
        sans qu'aucun code conditionnel soit necessaire. NE PAS RETIRER.
      */
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
      <Discord />
      <FAQ />
      <Partners />
      <Footer onNavigate={scrollToSection} />
    </div>
  )
}
