/**
 * FeaturesCards — Section "Découvrir" (3 cartes)
 * ================================================
 * 3 cartes fonctionnalités avec icônes lucide-react,
 * animation stagger au scroll via framer-motion.
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Binoculars, Camera, HeartHandshake } from 'lucide-react'
import { IconCircle } from '@/components/ui/IconCircle'

/**
 * Carte feature individuelle — wrapper card-style spécifique à cette section.
 * Utilise le IconCircle partagé en variant `solid` (fond action-default).
 */
function FeatureCard({
  icon,
  title,
  description,
  className = '',
}: {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={`bg-[var(--color-bg-tertiary)] rounded-[32px] p-8 flex flex-col gap-8 w-full ${className}`}
    >
      <IconCircle icon={icon} color="solid" size="lg" />
      <div className="flex flex-col gap-4">
        {/* h3 (et non h4) : la section parente est un h2 → respect de la
            hiérarchie sémantique sans saut de niveau. Tailwind preflight
            neutralise la taille par défaut, donc aucun changement visuel. */}
        <h3 className="text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </motion.div>
  )
}

export function FeaturesCards() {
  const { t } = useTranslation()

  return (
    <section
      id="discover"
      className="bg-[var(--color-bg-primary)] w-full flex justify-center px-5 md:px-10 lg:px-32 my-10 md:my-16 lg:my-40"
      data-name="Section 2 : Découvrir"
    >
      <div className="w-full max-w-[1728px] flex flex-col gap-6 md:gap-10 lg:gap-12">
        {/* Titre + sous-titre */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <h2 className="landing-section-title text-[var(--color-text-primary)]">
            {t('landing.features.title')}
          </h2>
          <p className="text-[var(--color-text-secondary)] lg:max-w-md">
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Grille de cartes */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          <FeatureCard
            title={t('landing.features.card1Title')}
            description={t('landing.features.card1Desc')}
            icon={
              <Binoculars size={28} className="text-[var(--color-text-white)]" strokeWidth={1.8} />
            }
          />
          <FeatureCard
            title={t('landing.features.card2Title')}
            description={t('landing.features.card2Desc')}
            icon={<Camera size={28} className="text-[var(--color-text-white)]" strokeWidth={1.8} />}
          />
          <FeatureCard
            title={t('landing.features.card3Title')}
            description={t('landing.features.card3Desc')}
            className="md:col-span-2 lg:col-span-1"
            icon={
              <HeartHandshake
                size={28}
                className="text-[var(--color-text-white)]"
                strokeWidth={1.8}
              />
            }
          />
        </motion.div>
      </div>
    </section>
  )
}
