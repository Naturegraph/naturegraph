/**
 * Storytelling — Section hermine / animal totem
 * ===============================================
 * Présente l'hermine comme animal totem du projet avec ses 3 traits :
 * résilience, curiosité, discrétion.
 * Fond crème, icône hermine, animation au scroll.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Shield, Compass, Eye } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'

/** Icônes associées aux 3 traits de l'hermine */
const TRAIT_ICONS = [Shield, Compass, Eye]

export function Storytelling() {
  const { t } = useTranslation()

  const traits = [
    {
      icon: TRAIT_ICONS[0],
      title: t('landing.storytelling.trait1Title'),
      description: t('landing.storytelling.trait1Desc'),
    },
    {
      icon: TRAIT_ICONS[1],
      title: t('landing.storytelling.trait2Title'),
      description: t('landing.storytelling.trait2Desc'),
    },
    {
      icon: TRAIT_ICONS[2],
      title: t('landing.storytelling.trait3Title'),
      description: t('landing.storytelling.trait3Desc'),
    },
  ]

  return (
    <section className="w-full flex justify-center" data-name="Section 7 : Storytelling">
      <div className="w-full max-w-[1728px] bg-[var(--color-surface-cream)] px-6 md:px-10 lg:px-32 py-20 lg:py-32">
        {/* Header avec icône hermine */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
          className="flex flex-col items-center text-center gap-6 mb-16 lg:mb-24"
        >
          {/* Hermine badge */}
          <div className="bg-[var(--color-bg-primary)] rounded-full size-24 flex items-center justify-center shadow-lg overflow-hidden">
            <img
              src={hermineIcon}
              alt="Hermine — Animal totem Naturegraph"
              className="w-full h-full object-contain p-2"
            />
          </div>

          <h2 className="landing-section-title text-[var(--color-text-primary)]">
            {t('landing.storytelling.title')}
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-2xl">
            {t('landing.storytelling.intro')}
          </p>
        </motion.div>

        {/* 3 traits en grille */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-16 lg:mb-20">
          {traits.map((trait, index) => {
            const Icon = trait.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
                className="bg-[var(--color-bg-primary)] rounded-[32px] p-8 flex flex-col items-center text-center gap-5"
              >
                <div className="bg-[var(--color-highlight-primary)] rounded-full size-14 flex items-center justify-center shrink-0">
                  <Icon size={28} className="text-[var(--color-text-white)]" strokeWidth={1.8} />
                </div>
                <h3 className="text-[var(--color-text-primary)] text-xl font-bold">
                  {trait.title}
                </h3>
                <p className="text-[var(--color-text-muted)]">{trait.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Citation de conclusion */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex justify-center"
        >
          <blockquote className="text-center max-w-3xl border-l-4 border-[var(--color-highlight-primary)] pl-6 md:border-l-0 md:border-none md:pl-0">
            <p className="text-lg md:text-xl italic text-[var(--color-text-primary)] leading-relaxed">
              « {t('landing.storytelling.closing')} »
            </p>
          </blockquote>
        </motion.div>
      </div>
    </section>
  )
}
