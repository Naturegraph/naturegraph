/**
 * Hero — Section d'accueil principale
 * =====================================
 * Design épuré : typographie forte centrée sur fond teal,
 * orbes de gradient animées (mint/violet) en arrière-plan.
 * Effet "mousse dans l'eau" : les orbes sont repoussées par le curseur,
 * chacune réagit selon sa distance à la souris.
 * 2 CTA + scroll indicator.
 */

import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Navbar } from './Navbar'

/* ── Types partagés pour le tracking souris ──────────────────────── */

/** Valeurs de motion partagées entre les sous-composants du Hero */
interface MouseTracking {
  mouseXPx: ReturnType<typeof useSpring>
  mouseYPx: ReturnType<typeof useSpring>
  containerW: ReturnType<typeof useMotionValue>
  containerH: ReturnType<typeof useMotionValue>
}

/* ── Animation stagger ─────────────────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.215, 0.61, 0.355, 1] as const },
  },
}

/* ── Spring fluide pour le mouvement organique ───────────────────── */

const springConfig = { damping: 20, stiffness: 80, mass: 0.6 }

/* ── Configuration des 4 orbes décoratives ───────────────────────── */

/** Chaque orbe : apparence + position au repos + force de répulsion */
const orbConfigs = [
  {
    /* Grande orbe mint — bas gauche */
    size: 'w-[500px] h-[500px] lg:w-[700px] lg:h-[700px]',
    color1: 'var(--color-accent-mint)',
    color2: 'var(--hero-orb-mint-20)',
    position: '-left-[15%] -bottom-[20%]',
    anchorX: 0.15,
    anchorY: 0.85,
    delay: 0,
    duration: 10,
    strength: 80,
  },
  {
    /* Orbe violette — haut droite */
    size: 'w-[400px] h-[400px] lg:w-[600px] lg:h-[600px]',
    color1: 'var(--color-action-default)',
    color2: 'var(--hero-orb-action-15)',
    position: '-right-[10%] -top-[15%]',
    anchorX: 0.85,
    anchorY: 0.15,
    delay: 0.3,
    duration: 12,
    strength: 70,
  },
  {
    /* Orbe mint — centre droite */
    size: 'w-[250px] h-[250px] lg:w-[350px] lg:h-[350px]',
    color1: 'var(--color-accent-mint)',
    color2: 'var(--hero-orb-mint-12)',
    position: 'right-[20%] bottom-[10%]',
    anchorX: 0.7,
    anchorY: 0.75,
    delay: 0.6,
    duration: 8,
    strength: 100,
  },
  {
    /* Orbe teal — haut gauche */
    size: 'w-[300px] h-[300px]',
    color1: 'var(--color-highlight-tertiary)',
    color2: 'var(--hero-orb-teal-10)',
    position: 'left-[25%] top-[5%]',
    anchorX: 0.3,
    anchorY: 0.2,
    delay: 0.9,
    duration: 14,
    strength: 90,
  },
] as const

/* ── Orbe décorative repoussée par le curseur ────────────────────── */

/**
 * Chaque orbe a un "centre au repos" (anchorX/Y en %).
 * Quand la souris s'approche, l'orbe est repoussée dans la direction
 * opposée — comme de la mousse écartée par un doigt.
 * `strength` contrôle l'amplitude max du déplacement (en px).
 */
function GradientOrb({
  size,
  color1,
  color2,
  position,
  delay = 0,
  duration = 8,
  anchorX,
  anchorY,
  strength = 60,
  mouse,
}: {
  size: string
  color1: string
  color2: string
  position: string
  delay?: number
  duration?: number
  anchorX: number
  anchorY: number
  strength?: number
  mouse: MouseTracking
}) {
  const { mouseXPx, mouseYPx, containerW, containerH } = mouse

  /**
   * Calcule la répulsion : direction = orbe - souris, normalisée.
   * L'intensité décroît avec la distance (inverse quadratique adouci).
   */
  const offsetX = useTransform([mouseXPx, containerW] as const, ([mx, cw]: number[]) => {
    if (cw === 0) return 0
    const orbPx = anchorX * cw
    const dx = orbPx - mx
    const dist = Math.abs(dx) / cw
    const force = Math.max(0, 1 - dist * 1.8)
    return Math.sign(dx) * force * force * strength
  })

  const offsetY = useTransform([mouseYPx, containerH] as const, ([my, ch]: number[]) => {
    if (ch === 0) return 0
    const orbPy = anchorY * ch
    const dy = orbPy - my
    const dist = Math.abs(dy) / ch
    const force = Math.max(0, 1 - dist * 1.8)
    return Math.sign(dy) * force * force * strength
  })

  /* Lissage spring des offsets pour un mouvement fluide et organique */
  const smoothX = useSpring(offsetX, springConfig)
  const smoothY = useSpring(offsetY, springConfig)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 0.7, scale: 1 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      className={`absolute rounded-full blur-[80px] pointer-events-none ${size} ${position}`}
      style={{
        background: `radial-gradient(circle, ${color1} 0%, ${color2} 70%, transparent 100%)`,
        x: smoothX,
        y: smoothY,
      }}
    >
      {/* Animation flottante continue (se combine avec la répulsion) */}
      <motion.div
        className="w-full h-full"
        animate={{
          y: [0, -15, 0],
          x: [0, 8, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
      />
    </motion.div>
  )
}

/* ── Spotlight curseur — halo lumineux qui suit la souris ─────────── */

function CursorSpotlight({ mouse }: { mouse: MouseTracking }) {
  const { mouseXPx, mouseYPx, containerW, containerH } = mouse

  /* Convertit px en % pour le radial-gradient */
  const spotX = useTransform([mouseXPx, containerW] as const, ([mx, cw]: number[]) =>
    cw > 0 ? `${(mx / cw) * 100}%` : '50%',
  )
  const spotY = useTransform([mouseYPx, containerH] as const, ([my, ch]: number[]) =>
    ch > 0 ? `${(my / ch) * 100}%` : '50%',
  )

  /* Gradient radial qui suit la souris — utilise les tokens DS */
  const spotlightBg = useTransform(
    [spotX, spotY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x} ${y}, var(--hero-spot-mint-15), var(--hero-spot-action-04) 40%, transparent 65%)`,
  )

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-[1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      style={{ background: spotlightBg }}
    />
  )
}

/* ── Scroll indicator ──────────────────────────────────────────────── */

function ScrollIndicator() {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: [0, 8, 0] }}
      transition={{
        opacity: { delay: 1.5, duration: 0.6 },
        y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 },
      }}
      className="absolute bottom-8 lg:bottom-12 left-1/2 -translate-x-1/2 z-20 cursor-pointer bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-white)]/50 rounded-full"
      onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      aria-label="Scroll down to content"
    >
      <svg width="20" height="32" viewBox="0 0 20 32" fill="none" aria-hidden="true">
        <path
          d="M10 0.5C15.2467 0.5 19.5 4.7533 19.5 10V22C19.5 27.2467 15.2467 31.5 10 31.5C4.7533 31.5 0.5 27.2467 0.5 22V10C0.5 4.7533 4.7533 0.5 10 0.5Z"
          stroke="var(--color-text-white)"
          strokeWidth="1.5"
        />
        <motion.circle
          cx="10"
          r="2"
          fill="var(--color-text-white)"
          animate={{ cy: [10, 22, 10] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.button>
  )
}

/* ── Hook — tracking souris relatif à un container ─────────────────── */

/**
 * Retourne les valeurs de motion (position + dimensions)
 * et les handlers à brancher sur le container.
 * Lissage spring pour un rendu fluide.
 */
function useMouseTracking() {
  const containerRef = useRef<HTMLDivElement>(null)

  const rawMouseXPx = useMotionValue(0)
  const rawMouseYPx = useMotionValue(0)
  const containerW = useMotionValue(0)
  const containerH = useMotionValue(0)

  const mouseXPx = useSpring(rawMouseXPx, { damping: 30, stiffness: 150, mass: 0.5 })
  const mouseYPx = useSpring(rawMouseYPx, { damping: 30, stiffness: 150, mass: 0.5 })

  const mouse: MouseTracking = { mouseXPx, mouseYPx, containerW, containerH }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      rawMouseXPx.set(e.clientX - rect.left)
      rawMouseYPx.set(e.clientY - rect.top)
      containerW.set(rect.width)
      containerH.set(rect.height)
    },
    [rawMouseXPx, rawMouseYPx, containerW, containerH],
  )

  const handleMouseLeave = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    rawMouseXPx.set(rect.width / 2)
    rawMouseYPx.set(rect.height / 2)
  }, [rawMouseXPx, rawMouseYPx])

  return { containerRef, mouse, handleMouseMove, handleMouseLeave }
}

/* ── Composant Hero ────────────────────────────────────────────────── */

interface HeroProps {
  onNavigate: (sectionId: string) => void
}

export function Hero({ onNavigate }: HeroProps) {
  const { t } = useTranslation()
  const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useMouseTracking()

  return (
    <section
      className="w-full bg-[var(--color-bg-primary)] flex justify-center p-0 md:px-8 md:pt-8"
      aria-label="Introduction"
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[1728px] hero-gradient-bg rounded-none md:rounded-[32px] overflow-hidden flex flex-col min-h-[70vh] lg:min-h-[75vh]"
      >
        {/* Navbar */}
        <Navbar onNavigate={onNavigate} />

        {/* Spotlight curseur — halo mint qui suit la souris */}
        <CursorSpotlight mouse={mouse} />

        {/* Orbes décoratives — repoussées par le curseur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {orbConfigs.map((orb, i) => (
            <GradientOrb key={i} {...orb} mouse={mouse} />
          ))}
        </div>

        {/* Contenu centré */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center text-center px-6 md:px-16 flex-1 justify-center pb-16 lg:pb-20"
        >
          {/* Badge discret */}
          <motion.div
            variants={fadeUp}
            className="mb-6 lg:mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-text-white)]/10 backdrop-blur-sm border border-[var(--color-text-white)]/15"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-mint)] animate-pulse" />
            <span className="text-sm text-[var(--color-text-white)]/80 font-[var(--font-body)]">
              {t('landing.hero.badge')}
            </span>
          </motion.div>

          {/* Titre H1 */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-5xl lg:text-[72px] font-bold text-[var(--color-text-white)] leading-[1.1] font-[var(--font-title)] max-w-[900px]"
          >
            {t('landing.hero.titleLine1')}
            <br />
            <span className="bg-gradient-to-r from-[var(--color-accent-mint)] to-[var(--color-bg-menthe)] bg-clip-text text-transparent">
              {t('landing.hero.titleLine2')}
            </span>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            variants={fadeUp}
            className="mt-6 lg:mt-8 text-base lg:text-xl text-[var(--color-text-white)]/80 max-w-xl font-[var(--font-body)] leading-relaxed"
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          {/* Boutons CTA */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-4 mt-8 lg:mt-10 w-full sm:w-auto"
          >
            <Link
              to="/signup"
              className="btn-press btn-press-primary inline-flex items-center justify-center h-14 px-10 text-base font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full w-full sm:w-auto font-[var(--font-body)]"
            >
              {t('landing.hero.ctaShare')}
            </Link>
            <button
              onClick={() => onNavigate('discover')}
              className="btn-press btn-press-outline inline-flex items-center justify-center h-14 px-10 text-base font-bold text-[var(--color-text-white)] rounded-full w-full sm:w-auto font-[var(--font-body)] backdrop-blur-sm bg-transparent border-none"
            >
              {t('landing.hero.ctaDiscover')}
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <ScrollIndicator />
      </div>
    </section>
  )
}
