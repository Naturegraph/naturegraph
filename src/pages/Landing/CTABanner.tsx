/**
 * CTABanner — Bandeau d'appel à l'action
 * ========================================
 * Fond teal, icône hermine, titre + description + bouton.
 * Image à droite sur desktop (placeholder).
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import ctaKingfisher from '@/assets/images/cta-kingfisher.png'
import hermineIcon from '@/assets/images/hermine-icon.png'

export function CTABanner() {
  const { t } = useTranslation()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  return (
    <motion.section
      ref={ref as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] as const }}
      className="w-full bg-[var(--color-bg-primary)] flex justify-center px-0 md:px-8"
      data-name="Section 5 : CTA"
    >
      <div className="w-full max-w-[1728px] bg-[var(--color-highlight-primary)] rounded-none md:rounded-[32px] overflow-hidden flex flex-col lg:flex-row items-stretch">
        {/* Contenu */}
        <div className="flex-1 px-6 md:px-10 lg:pl-32 lg:pr-32 py-20 lg:py-40 flex flex-col gap-8">
          {/* Icône hermine */}
          <div className="bg-[var(--color-surface-cream)] flex items-center justify-center rounded-full size-24 shrink-0 overflow-hidden">
            <img
              src={hermineIcon}
              alt="Hermine Naturegraph"
              className="w-full h-full object-contain p-2"
            />
          </div>

          <h2 className="landing-section-title text-[var(--color-text-white)] text-balance">
            {t('landing.cta.title')}
          </h2>

          <p className="text-[var(--color-text-white)]/85">{t('landing.cta.description')}</p>

          <Link
            to="/signup"
            className="btn-press btn-press-primary inline-flex items-center justify-center h-12 px-6 text-base font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full self-start font-[var(--font-body)]"
          >
            {t('landing.cta.button')}
          </Link>
        </div>

        {/* Image — Desktop uniquement */}
        <div className="hidden lg:block relative w-[512px] shrink-0 overflow-hidden">
          <img
            src={ctaKingfisher}
            alt="Martin-pêcheur — Naturegraph"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </motion.section>
  )
}
