/**
 * Mission — Section mission du projet
 * =====================================
 * Image + 2 paragraphes côte à côte. Utilise le template ImageTextLayout.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { ImageTextLayout } from '@/components/templates'
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
      data-name="Section 5 : Mission"
    >
      <div className="w-full max-w-[1728px] bg-[var(--color-bg-primary)] px-6 md:px-10 lg:px-32 py-20 lg:py-40">
        <ImageTextLayout
          gap="lg"
          imageWidth="fixed"
          image={
            <div className="w-full lg:w-[448px] aspect-square md:aspect-auto md:h-[512px] rounded-[48px] overflow-hidden">
              <img
                src={missionObserver}
                alt="Observer la nature avec Naturegraph"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          }
        >
          <div className="flex flex-col gap-10 lg:gap-12">
            <h2 className="landing-section-title text-[var(--color-text-primary)]">
              {t('landing.mission.title')}
            </h2>

            <div className="flex flex-col gap-6">
              <p className="text-[var(--color-text-primary)]">{t('landing.mission.paragraph1')}</p>
              <p className="text-[var(--color-text-primary)]">{t('landing.mission.paragraph2')}</p>
            </div>
          </div>
        </ImageTextLayout>
      </div>
    </motion.section>
  )
}
