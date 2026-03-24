/**
 * Discord — Section communauté Discord
 * ======================================
 * Fond teal foncé, liste d'avantages, bouton Discord,
 * screenshot Discord dans un phone (placeholder) à droite.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import discordPreview from '@/assets/images/discord-preview.png'

/** Icône Discord (SVG simple) */
function DiscordIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function Discord() {
  const { t } = useTranslation()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  const discordUrl = 'https://discord.gg/WVFQw2Zh'

  const benefits = [
    t('landing.discord.benefit1'),
    t('landing.discord.benefit2'),
    t('landing.discord.benefit3'),
    t('landing.discord.benefit4'),
    t('landing.discord.benefit5'),
  ]

  return (
    <motion.section
      id="community"
      ref={ref as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] as const }}
      className="w-full bg-[var(--color-bg-primary)] flex justify-center px-0 md:px-8"
      data-name="Section 7 : Discord"
    >
      <div className="w-full max-w-[1728px] bg-[var(--color-highlight-primary)] rounded-none md:rounded-[32px] overflow-hidden">
        <div className="relative px-6 md:px-10 lg:px-32 py-16 md:py-24 lg:py-40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-20">
            {/* Contenu gauche */}
            <div className="flex flex-col gap-10 lg:gap-12 flex-1">
              <h2 className="landing-section-title text-[var(--color-text-white)]">
                {t('landing.discord.title')}
              </h2>

              <div className="flex flex-col gap-8">
                <p className="text-[var(--color-text-white)]/85">
                  {t('landing.discord.description')}
                </p>

                <ul className="flex flex-col gap-2 text-[var(--color-text-white)]/85 list-disc pl-6">
                  {benefits.map((benefit, i) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              </div>

              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press btn-press-primary inline-flex items-center justify-center gap-4 h-12 px-6 text-base font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full self-start font-[var(--font-body)]"
                aria-label={t('landing.discord.button')}
              >
                <DiscordIcon />
                <span>{t('landing.discord.button')}</span>
              </a>
            </div>

            {/* Screenshot Discord */}
            <div className="w-full lg:w-[600px] lg:shrink-0">
              <div className="bg-[var(--color-highlight-secondary)] rounded-[48px] h-[384px] md:h-[480px] lg:h-[560px] relative overflow-hidden flex items-center justify-center">
                <div className="absolute left-1/2 top-[74px] -translate-x-1/2 w-[256px] md:w-[280px] lg:w-[317px]">
                  <div className="relative rounded-[20px] overflow-hidden aspect-[9/16] border-4 border-[var(--color-text-primary)]">
                    <img
                      src={discordPreview}
                      alt="Aperçu Discord Naturegraph"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
