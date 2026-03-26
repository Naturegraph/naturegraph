/**
 * Values — Section des valeurs du projet
 * ========================================
 * Layout 50/50 : image (placeholder) à gauche, 3 valeurs numérotées à droite.
 * Séparateurs animés entre les items.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import valuesNature from '@/assets/images/values-nature.png'

/** Item valeur avec numéro dans un cercle */
function ValueItem({
  number,
  title,
  description,
  delay,
  isVisible,
}: {
  number: string
  title: string
  description: string
  delay: number
  isVisible: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.215, 0.61, 0.355, 1] as const }}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-[var(--color-surface-cream)] shrink-0">
          <span className="text-[var(--color-text-primary)] font-bold text-lg">{number}</span>
        </div>
        <h4 className="text-[var(--color-text-primary)]">{title}</h4>
      </div>
      <p className="text-[var(--color-text-muted)]">{description}</p>
    </motion.div>
  )
}

/** Séparateur animé */
function Separator({ delay, isVisible }: { delay: number; isVisible: boolean }) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={isVisible ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="w-full h-px bg-[var(--color-border)] origin-left"
    />
  )
}

export function Values() {
  const { t } = useTranslation()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  const items = [
    { title: t('landing.values.item1Title'), desc: t('landing.values.item1Desc') },
    { title: t('landing.values.item2Title'), desc: t('landing.values.item2Desc') },
    { title: t('landing.values.item3Title'), desc: t('landing.values.item3Desc') },
  ]

  return (
    <section
      id="values"
      ref={ref as React.RefObject<HTMLElement>}
      className="bg-[var(--color-bg-primary)] w-full flex justify-center px-5 md:px-10 lg:px-32 my-10 md:my-16 lg:my-40"
      data-name="Section 3 : Valeurs"
    >
      <div className="w-full max-w-[1728px] flex flex-col lg:flex-row items-center gap-10 lg:gap-32">
        {/* Image placeholder */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={isVisible ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] as const }}
          className="w-full lg:flex-1 h-[384px] md:h-[640px] rounded-[32px] lg:rounded-[48px] overflow-hidden shrink-0"
        >
          <img
            src={valuesNature}
            alt="Nature et valeurs Naturegraph"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </motion.div>

        {/* Contenu droite */}
        <div className="w-full lg:flex-1 flex flex-col gap-10 lg:gap-12">
          {/* Titre */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] as const }}
            className="landing-section-title text-[var(--color-text-primary)]"
          >
            {t('landing.values.title')}
          </motion.h2>

          {/* Liste des valeurs */}
          <div className="flex flex-col gap-6 md:gap-10 lg:gap-12">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col gap-6 md:gap-10 lg:gap-12">
                <ValueItem
                  number={String(i + 1)}
                  title={item.title}
                  description={item.desc}
                  delay={0.3 + i * 0.1}
                  isVisible={isVisible}
                />
                {i < items.length - 1 && <Separator delay={0.35 + i * 0.1} isVisible={isVisible} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
