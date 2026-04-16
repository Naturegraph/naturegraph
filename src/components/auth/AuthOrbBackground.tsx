/**
 * AuthOrbBackground — Orbes de gradient animées (page d'authentification)
 * =========================================================================
 * Même système d'orbes "mousse dans l'eau" que le Hero de la landing :
 * 4 blobs de gradient qui flottent et sont repoussés par le curseur.
 * Désactivé automatiquement si prefers-reduced-motion est activé.
 *
 * S'insère en `absolute inset-0` dans le container de l'AuthPage.
 * Visible uniquement sur desktop (caché sur mobile via `hidden md:block`).
 *
 * Usage :
 * ```tsx
 * const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useAuthOrbTracking()
 * <div ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
 *   <AuthOrbBackground mouse={mouse} />
 * </div>
 * ```
 */

import { useCallback, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'

/* ── Types ────────────────────────────────────────────────────────── */

export interface OrbMouseTracking {
  mouseXPx: MotionValue<number>
  mouseYPx: MotionValue<number>
  containerW: MotionValue<number>
  containerH: MotionValue<number>
}

/* ── Spring config — même fluidité que le Hero landing ───────────── */

const springConfig = { damping: 20, stiffness: 80, mass: 0.6 }

/* ── Configuration des 4 orbes ────────────────────────────────────── */

const orbConfigs = [
  {
    /* Grande orbe mint — bas gauche */
    size: 'w-[400px] h-[400px] lg:w-[600px] lg:h-[600px]',
    color1: 'var(--color-accent-mint)',
    color2: 'color-mix(in srgb, var(--color-accent-mint) 20%, transparent)',
    position: '-left-[10%] -bottom-[15%]',
    anchorX: 0.15,
    anchorY: 0.85,
    delay: 0,
    duration: 10,
    strength: 80,
  },
  {
    /* Orbe violette — haut droite */
    size: 'w-[350px] h-[350px] lg:w-[500px] lg:h-[500px]',
    color1: 'var(--color-action-default)',
    color2: 'color-mix(in srgb, var(--color-action-default) 15%, transparent)',
    position: '-right-[8%] -top-[12%]',
    anchorX: 0.85,
    anchorY: 0.15,
    delay: 0.3,
    duration: 12,
    strength: 70,
  },
  {
    /* Orbe mint — centre droite */
    size: 'w-[200px] h-[200px] lg:w-[300px] lg:h-[300px]',
    color1: 'var(--color-accent-mint)',
    color2: 'color-mix(in srgb, var(--color-accent-mint) 12%, transparent)',
    position: 'right-[15%] bottom-[15%]',
    anchorX: 0.7,
    anchorY: 0.75,
    delay: 0.6,
    duration: 8,
    strength: 100,
  },
  {
    /* Orbe teal — haut gauche */
    size: 'w-[250px] h-[250px]',
    color1: 'var(--color-highlight-tertiary)',
    color2: 'color-mix(in srgb, var(--color-highlight-tertiary) 10%, transparent)',
    position: 'left-[20%] top-[8%]',
    anchorX: 0.3,
    anchorY: 0.2,
    delay: 0.9,
    duration: 14,
    strength: 90,
  },
] as const

/* ── Orbe individuelle ────────────────────────────────────────────── */

/**
 * Chaque orbe a un centre de repos (anchorX/Y en %).
 * La souris repousse l'orbe dans la direction opposée.
 * `strength` = amplitude max en px.
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
  mouse: OrbMouseTracking
}) {
  const { mouseXPx, mouseYPx, containerW, containerH } = mouse

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

  const smoothX = useSpring(offsetX, springConfig)
  const smoothY = useSpring(offsetY, springConfig)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 0.8, scale: 1 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      className={`absolute rounded-full blur-[80px] pointer-events-none ${size} ${position}`}
      style={{
        background: `radial-gradient(circle, ${color1} 0%, ${color2} 70%, transparent 100%)`,
        x: smoothX,
        y: smoothY,
      }}
    >
      {/* Flottement continu — se combine avec la répulsion souris */}
      <motion.div
        className="w-full h-full"
        animate={{ y: [0, -15, 0], x: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      />
    </motion.div>
  )
}

/* ── Hook — tracking souris relatif au container parent ──────────── */

/**
 * À brancher sur le div racine de l'AuthPage.
 * Retourne containerRef (à passer en ref), mouse (à passer à AuthOrbBackground),
 * et les handlers d'événements souris.
 */
export function useAuthOrbTracking() {
  const containerRef = useRef<HTMLDivElement>(null)

  const rawMouseXPx = useMotionValue(0)
  const rawMouseYPx = useMotionValue(0)
  const containerW = useMotionValue(0)
  const containerH = useMotionValue(0)

  const mouseXPx = useSpring(rawMouseXPx, { damping: 30, stiffness: 150, mass: 0.5 })
  const mouseYPx = useSpring(rawMouseYPx, { damping: 30, stiffness: 150, mass: 0.5 })

  const mouse: OrbMouseTracking = { mouseXPx, mouseYPx, containerW, containerH }

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

/* ── Composant principal ──────────────────────────────────────────── */

interface AuthOrbBackgroundProps {
  mouse: OrbMouseTracking
}

/**
 * Affiche les 4 orbes de gradient animées.
 * Le composant est `pointer-events-none` — les événements souris
 * doivent être capturés par le div parent et passés via `useAuthOrbTracking`.
 */
export function AuthOrbBackground({ mouse }: AuthOrbBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
      {orbConfigs.map((orb, i) => (
        <GradientOrb key={i} {...orb} mouse={mouse} />
      ))}
    </div>
  )
}
