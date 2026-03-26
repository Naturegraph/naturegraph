/**
 * Mission — Section mission du projet
 * =====================================
 * Image à gauche (placeholder) + titre + 2 paragraphes à droite.
 * Fond crème, arrondi 48px sur l'image.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import missionObserver from '@/assets/images/mission-observer.png'

export function Mission() {
  const { t } = useTranslation()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  return (
    <motion.section
      ref={ref as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] as const }}
      className="w-full flex justify-center"
      data-name="Section 6 : Mission"
    >
      <div className="w-full max-w-[1728px] bg-[var(--color-bg-primary)] px-6 md:px-10 lg:px-32 py-20 lg:py-40">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-32">
          {/* Image mission */}
          <div className="w-full lg:w-[448px] lg:shrink-0 aspect-square md:aspect-auto md:h-[512px] rounded-[48px] overflow-hidden">
            <img
              src={missionObserver}
              alt="Observer la nature avec Naturegraph"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Contenu */}
          <div className="flex flex-col gap-10 lg:gap-12 w-full">
            <h2 className="landing-section-title text-[var(--color-text-primary)]">
              {t('landing.mission.title')}
            </h2>

            <div className="flex flex-col gap-6">
              <p className="text-[var(--color-text-primary)]">{t('landing.mission.paragraph1')}</p>
              <p className="text-[var(--color-text-primary)]">{t('landing.mission.paragraph2')}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
