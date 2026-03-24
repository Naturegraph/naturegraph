/**
 * ProductFeatures — Section produit (phone sticky + cartes alternées)
 * ====================================================================
 * Desktop : phone central sticky, cartes alternées gauche/droite au scroll.
 * Tablet/Mobile : slider horizontal avec pagination dots.
 * L'image du phone change en fonction de la carte visible.
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Binoculars, Star, Squirrel, UserCircle2 } from 'lucide-react'
import feature1 from '@/assets/images/feature-1.png'
import feature2 from '@/assets/images/feature-2.png'
import feature3 from '@/assets/images/feature-3.png'
import feature4 from '@/assets/images/feature-4.png'

/** Données des features avec icônes lucide-react */
const FEATURE_ICONS = [Binoculars, Star, Squirrel, UserCircle2]

/** Images réelles pour chaque feature */
const FEATURE_IMAGES = [feature1, feature2, feature3, feature4]

/* ── Carte feature (desktop) ──────────────────────────────────────── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  className = '',
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  title: string
  description: string
  className?: string
}) {
  return (
    <div
      className={`bg-[var(--color-bg-primary)] flex flex-col gap-6 items-start p-8 rounded-[32px] w-full lg:w-[456px] ${className}`}
    >
      <div className="bg-[var(--color-highlight-primary)] flex items-center justify-center rounded-full size-14 shrink-0">
        <Icon size={28} className="text-[var(--color-text-white)]" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-3 w-full">
        <h3 className="text-[var(--color-text-primary)] text-2xl font-bold leading-tight">
          {title}
        </h3>
        <p className="text-[var(--color-text-muted)]">{description}</p>
      </div>
    </div>
  )
}

/* ── Phone display central (desktop) ──────────────────────────────── */

function PhoneDisplay({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative w-[280px] h-[606px] rounded-[40px] overflow-hidden border-[6px] border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] shadow-2xl">
      {FEATURE_IMAGES.map((img, index) => (
        <motion.div
          key={index}
          initial={false}
          animate={{ opacity: activeIndex === index ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={img}
            alt={`Feature ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </motion.div>
      ))}
    </div>
  )
}

/* ── Carte mobile (image + contenu) ────────────────────────────────── */

function MobileFeatureSlide({
  icon: Icon,
  title,
  description,
  imageIndex,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  title: string
  description: string
  imageIndex: number
}) {
  return (
    <div className="flex flex-col rounded-[24px] overflow-hidden w-[327px] flex-shrink-0">
      {/* Image phone */}
      <div className="relative h-[256px] bg-[var(--color-surface-cream-light)] overflow-hidden flex-shrink-0 flex items-end justify-center pt-8">
        <div className="w-[140px] h-[303px] rounded-[20px] border-4 border-[var(--color-text-primary)] overflow-hidden">
          <img
            src={FEATURE_IMAGES[imageIndex]}
            alt={`Feature ${imageIndex + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-[var(--color-surface-cream-light)] flex flex-col gap-4 items-start p-6 flex-1">
        <div className="bg-[var(--color-highlight-primary)] flex items-center justify-center rounded-full size-12 shrink-0">
          <Icon size={20} className="text-[var(--color-text-white)]" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col gap-2 w-full">
          <h3 className="text-[var(--color-text-primary)] text-xl font-bold leading-tight">
            {title}
          </h3>
          <p className="text-[var(--color-text-muted)] text-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Pagination dots ──────────────────────────────────────────────── */

function PaginationDots({
  count,
  active,
  onDotClick,
}: {
  count: number
  active: number
  onDotClick: (index: number) => void
}) {
  return (
    <div className="flex justify-center gap-3 mt-6">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={`transition-all duration-300 ${
            i === active
              ? 'w-[50px] h-[10px] rounded-[100px] bg-[var(--color-action-default)]'
              : 'w-[10px] h-[10px] rounded-full bg-[var(--color-border)]'
          }`}
          aria-label={`Aller au slide ${i + 1}`}
        />
      ))}
    </div>
  )
}

/* ── Flèche squiggly animée vers le téléphone ──────────────────────── */

function PhoneArrow({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'

  return (
    <div className={`flex mt-5 ${isLeft ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
      <svg
        width="148"
        height="48"
        viewBox="0 0 148 48"
        fill="none"
        /* Les cartes droites ont leur flèche miroir */
        style={isLeft ? undefined : { transform: 'scaleX(-1)' }}
      >
        {/* Ligne sinusoïdale squiggly */}
        <motion.path
          d="M 8,24 C 24,8 40,40 56,24 C 72,8 88,40 104,24 C 116,12 128,28 138,20"
          stroke="var(--color-highlight-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ opacity: 0.55 }}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.25 }}
        />
        {/* Tête de flèche */}
        <motion.path
          d="M 128,10 L 140,20 L 128,30"
          stroke="var(--color-highlight-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ opacity: 0.55 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, delay: 1.1 }}
        />
        {/* Petit point de départ */}
        <motion.circle
          cx="8"
          cy="24"
          r="3.5"
          fill="var(--color-highlight-primary)"
          style={{ opacity: 0.45 }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.1, type: 'spring', stiffness: 300 }}
        />
      </svg>
    </div>
  )
}

/* ── Composant principal ──────────────────────────────────────────── */

export function ProductFeatures() {
  const { t } = useTranslation()
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const cardRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ]

  const features = [
    {
      icon: FEATURE_ICONS[0],
      title: t('landing.detailedFeatures.item1Title'),
      description: t('landing.detailedFeatures.item1Desc'),
    },
    {
      icon: FEATURE_ICONS[1],
      title: t('landing.detailedFeatures.item2Title'),
      description: t('landing.detailedFeatures.item2Desc'),
    },
    {
      icon: FEATURE_ICONS[2],
      title: t('landing.detailedFeatures.item3Title'),
      description: t('landing.detailedFeatures.item3Desc'),
    },
    {
      icon: FEATURE_ICONS[3],
      title: t('landing.detailedFeatures.item4Title'),
      description: t('landing.detailedFeatures.item4Desc'),
    },
  ]

  /* ── Scroll detection (desktop) — détermine quelle carte est active ── */
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (window.innerWidth < 1024) return
      if (ticking) return

      ticking = true
      window.requestAnimationFrame(() => {
        // La carte active est celle dont le centre est le plus proche du centre de l'écran
        const viewportCenter = window.innerHeight * 0.5
        let closestIndex = 0
        let closestDistance = Infinity

        cardRefs.forEach((ref, index) => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const cardCenter = rect.top + rect.height / 2
            const distance = Math.abs(cardCenter - viewportCenter)
            if (distance < closestDistance) {
              closestDistance = distance
              closestIndex = index
            }
          }
        })

        setActiveFeature(closestIndex)
        ticking = false
      })
    }

    // Initial check
    setTimeout(handleScroll, 200)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  /* ── Slider scroll detection (mobile/tablet) ── */
  useEffect(() => {
    const slider = document.getElementById('features-slider')
    if (!slider) return

    const handleSliderScroll = () => {
      const slideWidth = 327 + 16 // card width + gap
      const index = Math.round(slider.scrollLeft / slideWidth)
      setActiveSlide(index)
    }

    slider.addEventListener('scroll', handleSliderScroll, { passive: true })
    return () => slider.removeEventListener('scroll', handleSliderScroll)
  }, [])

  /** Scroll le slider vers un slide donné */
  const scrollToSlide = (index: number) => {
    const slider = document.getElementById('features-slider')
    if (slider) {
      slider.scrollTo({ left: (327 + 16) * index, behavior: 'smooth' })
      setActiveSlide(index)
    }
  }

  return (
    <section className="w-full relative flex justify-center" data-name="Section 4 : Produit">
      <div className="w-full max-w-[1728px] bg-[var(--color-surface-cream)] rounded-t-[32px]">
        {/* Header */}
        <div className="px-6 md:px-10 lg:px-32 pt-20 lg:pt-40 flex flex-col gap-8 mb-16 lg:mb-32">
          <h2 className="landing-section-title text-[var(--color-text-primary)]">
            {t('landing.detailedFeatures.title')}
          </h2>
          <p className="text-[var(--color-text-muted)]">{t('landing.detailedFeatures.subtitle')}</p>
        </div>

        {/* ── Desktop : phone sticky + cartes alternées ────────────────── */}
        {/*
          Principe : le wrapper a une minHeight explicite qui définit la zone de scroll.
          Le phone sticky est en flux normal → son containing block = le wrapper.
          Les cartes sont en absolute → n'écrasent pas la hauteur du wrapper.
          Aucun overflow sur les ancêtres (overflow:hidden casse position:sticky).
        */}
        <div className="hidden lg:block relative pb-24" style={{ minHeight: '1750px' }}>
          {/* Phone sticky — reste centré à l'écran pendant tout le scroll */}
          <div
            className="sticky z-10 flex justify-center pointer-events-none"
            style={{ top: 'calc(50vh - 303px)', height: '606px' }}
          >
            <PhoneDisplay activeIndex={activeFeature} />
          </div>

          {/* Cartes en absolute — superposées au phone, définissent la mise en page visuelle */}
          <div className="absolute top-0 inset-x-0 px-6 md:px-10 lg:px-32">
            <div className="max-w-[1728px] mx-auto grid grid-cols-[1fr_320px_1fr] gap-x-16 xl:gap-x-24">
              {/* Colonne gauche : features 1 et 3 */}
              <div className="flex flex-col gap-[520px] pt-[80px] items-end">
                {[0, 2].map((i) => (
                  <div key={i} ref={cardRefs[i]} data-card={i}>
                    <motion.div
                      initial={{ opacity: 0, x: -60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.4 }}
                      transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
                    >
                      <FeatureCard {...features[i]} />
                      <PhoneArrow side="left" />
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Colonne centre : spacer visuel (le phone est en sticky au-dessus) */}
              <div />

              {/* Colonne droite : features 2 et 4 */}
              <div className="flex flex-col gap-[520px] pt-[360px] items-start">
                {[1, 3].map((i) => (
                  <div key={i} ref={cardRefs[i]} data-card={i}>
                    <motion.div
                      initial={{ opacity: 0, x: 60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.4 }}
                      transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
                    >
                      <FeatureCard {...features[i]} />
                      <PhoneArrow side="right" />
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile/Tablet : slider horizontal ────────────────────────── */}
        <div className="lg:hidden pb-16">
          <div className="overflow-hidden">
            <div id="features-slider" className="overflow-x-auto scrollbar-hide pb-6 px-6 md:px-10">
              <div className="flex gap-4 w-max items-stretch">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex"
                  >
                    <MobileFeatureSlide {...feature} imageIndex={index} />
                  </motion.div>
                ))}
              </div>
            </div>
            <PaginationDots count={4} active={activeSlide} onDotClick={scrollToSlide} />
          </div>
        </div>
      </div>
    </section>
  )
}
