/**
 * Discord — Section communauté Discord
 * ======================================
 * Fond teal foncé, liste d'avantages, bouton Discord,
 * screenshot Discord dans un phone (placeholder) à droite.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { Button } from '@/components/ui'
import { ImageTextLayout } from '@/components/templates'
import { DiscordIcon } from '@/components/icons/DiscordIcon'
import discordPreview from '@/assets/images/discord-preview.png'

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
          <ImageTextLayout
            gap="md"
            imagePosition="right"
            imageWidth="fixed"
            image={
              <div className="w-full lg:w-[600px]">
                <div className="bg-[var(--color-highlight-secondary)] rounded-[48px] h-[384px] md:h-[480px] lg:h-[560px] relative overflow-hidden flex items-center justify-center">
                  <div className="absolute left-1/2 top-[74px] -translate-x-1/2 w-[256px] md:w-[280px] lg:w-[317px]">
                    <div className="relative rounded-[20px] overflow-hidden aspect-[9/16] border-4 border-[var(--color-text-primary)]">
                      <img
                        src={discordPreview}
                        alt="Aperçu Discord Naturegraph"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <div className="flex flex-col gap-10 lg:gap-12">
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

              <Button
                href={discordUrl}
                newTab
                size="md"
                className="self-start gap-4"
                aria-label={t('landing.discord.button')}
                icon={<DiscordIcon />}
              >
                {t('landing.discord.button')}
              </Button>
            </div>
          </ImageTextLayout>
        </div>
      </div>
    </motion.section>
  )
}
