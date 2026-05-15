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
import { Button } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'motion/react'
import { Navbar } from './Navbar'

/* ── Types partagés pour le tracking souris ──────────────────────── */

/** Valeurs de motion partagées entre les sous-composants du Hero */
interface MouseTracking {
  mouseXPx: MotionValue<number>
  mouseYPx: MotionValue<number>
  containerW: MotionValue<number>
  containerH: MotionValue<number>
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
    /* Grande orbe mint — bas gauche (BATCH 114 : scale mobile pour éviter overflow horizontal) */
    size: 'w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] lg:w-[700px] lg:h-[700px]',
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
    size: 'w-[220px] h-[220px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] lg:w-[600px] lg:h-[600px]',
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
    size: 'w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] md:w-[250px] md:h-[250px] lg:w-[350px] lg:h-[350px]',
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
    size: 'w-[160px] h-[160px] sm:w-[240px] sm:h-[240px] md:w-[300px] md:h-[300px]',
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
  const offsetX = useTransform(
    [mouseXPx, containerW] as MotionValue<number>[],
    ([mx, cw]: number[]) => {
      if (cw === 0) return 0
      const orbPx = anchorX * cw
      const dx = orbPx - mx
      const dist = Math.abs(dx) / cw
      const force = Math.max(0, 1 - dist * 1.8)
      return Math.sign(dx) * force * force * strength
    },
  )

  const offsetY = useTransform(
    [mouseYPx, containerH] as MotionValue<number>[],
    ([my, ch]: number[]) => {
      if (ch === 0) return 0
      const orbPy = anchorY * ch
      const dy = orbPy - my
      const dist = Math.abs(dy) / ch
      const force = Math.max(0, 1 - dist * 1.8)
      return Math.sign(dy) * force * force * strength
    },
  )

  /* Lissage spring des offsets pour un mouvement fluide et organique */
  const smoothX = useSpring(offsetX, springConfig)
  const smoothY = useSpring(offsetY, springConfig)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 0.7, scale: 1 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      className={`absolute rounded-full blur-[40px] sm:blur-[60px] md:blur-[80px] pointer-events-none ${size} ${position}`}
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
  const spotX = useTransform(
    [mouseXPx, containerW] as MotionValue<number>[],
    ([mx, cw]: number[]) => (cw > 0 ? `${(mx / cw) * 100}%` : '50%'),
  )
  const spotY = useTransform(
    [mouseYPx, containerH] as MotionValue<number>[],
    ([my, ch]: number[]) => (ch > 0 ? `${(my / ch) * 100}%` : '50%'),
  )

  /* Gradient radial qui suit la souris — utilise les tokens DS */
  const spotlightBg = useTransform(
    [spotX, spotY] as MotionValue<string>[],
    ([x, y]: string[]) =>
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

  // Throttle via requestAnimationFrame (QW-I1 / T-074) — limite a ~60fps max.
  // Avant : handleMouseMove fire a chaque pixel deplacé (potentiellement 200+ fois/sec
  // sur ecran haute frequence) → CPU + batterie mobile + bas de gamme.
  // Apres : 1 update par frame (RAF) → fluide visuellement, gain CPU significatif.
  const rafIdRef = useRef<number | null>(null)
  const pendingEventRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      pendingEventRef.current = { clientX: e.clientX, clientY: e.clientY }
      if (rafIdRef.current !== null) return
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        const el = containerRef.current
        const pending = pendingEventRef.current
        if (!el || !pending) return
        const rect = el.getBoundingClientRect()
        rawMouseXPx.set(pending.clientX - rect.left)
        rawMouseYPx.set(pending.clientY - rect.top)
        containerW.set(rect.width)
        containerH.set(rect.height)
      })
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
  const prefersReducedMotion = useReducedMotion()
  const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useMouseTracking()

  return (
    <section
      className="w-full bg-[var(--color-bg-primary)] flex justify-center p-0 md:px-8 md:pt-8"
      aria-label="Introduction"
    >
      <div
        ref={containerRef}
        onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
        onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
        className="relative w-full max-w-[1728px] hero-gradient-bg rounded-none md:rounded-[32px] overflow-hidden flex flex-col min-h-[70vh] lg:min-h-[75vh]"
      >
        {/* Navbar */}
        <Navbar onNavigate={onNavigate} />

        {/*
          Effets décoratifs (spotlight + orbes) désactivés si l'utilisateur
          a activé prefers-reduced-motion. Le fond `hero-gradient-bg` reste
          visible — seuls les calculs JS coûteux et les animations sont coupés.
        */}
        {!prefersReducedMotion && (
          <>
            <CursorSpotlight mouse={mouse} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {orbConfigs.map((orb, i) => (
                <GradientOrb key={i} {...orb} mouse={mouse} />
              ))}
            </div>
          </>
        )}

        {/* Contenu centré
            BATCH 65 : padding top responsive (pt-20 md:pt-24 lg:pt-0) pour
            eviter que le contenu colle a la navbar en mobile/tablet.
            En lg+, le centrage vertical (flex-1 + justify-center) gere
            naturellement le spacing sans surcharge. */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center text-center px-6 md:px-16 flex-1 justify-center pt-20 md:pt-24 lg:pt-0 pb-16 lg:pb-20"
        >
          {/* Titre H1 (BATCH 114 : ajout sm pour éviter écrasement sur 360px) */}
          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[72px] font-bold text-[var(--color-text-white)] leading-[1.1] font-[var(--font-title)] max-w-full sm:max-w-[600px] md:max-w-[900px]"
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

          {/* Boutons CTA (BATCH 114 : gap responsive) */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-6 sm:mt-8 lg:mt-10 w-full sm:w-auto"
          >
            <Button to="/signup" size="lg" className="w-full sm:w-auto">
              {t('landing.hero.ctaShare')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto backdrop-blur-sm"
              onClick={() => onNavigate('discover')}
            >
              {t('landing.hero.ctaDiscover')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <ScrollIndicator />
      </div>
    </section>
  )
}
