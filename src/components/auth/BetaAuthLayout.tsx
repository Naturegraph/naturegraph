/**
 * BetaAuthLayout — Layout partage des ecrans beta (Welcome + Waitlist)
 *
 * BATCH 64 (Nicolas decision 2026-05-15) : factorisation du pattern visuel
 * commun a /welcome et /waitlist, pour eviter la duplication et garantir
 * une cohereence pixel-perfect entre les deux ecrans.
 *
 * Structure :
 *   ┌─ <main> teal-dark + pattern dots + orbes anim (md:) ──┐
 *   │  ┌─ Card cream rounded-[32px] (md:) ─────────────────┐ │
 *   │  │  {children}                                       │ │
 *   │  └───────────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────┘
 *
 * Responsive :
 *   - mobile : full-width, fond cream uniforme, p-4
 *   - >=md : card 512px centree, fond teal-dark + pattern + orbes, p-16
 *
 * Performance / eco-conception :
 *   - Pattern dots = inline SVG data URL (0 requete reseau)
 *   - Orbes desactivees si prefers-reduced-motion
 *   - Tracking mouse desactive si prefers-reduced-motion
 */

import { useReducedMotion } from 'motion/react'
import { AuthOrbBackground, useAuthOrbTracking } from '@/components/auth/AuthOrbBackground'

interface BetaAuthLayoutProps {
  /** Contenu de la card (header, form, footer slogan, etc.) */
  children: React.ReactNode
  /** Optionnel : ref customisee a poser sur le main (sinon useAuthOrbTracking) */
  mainId?: string
}

export function BetaAuthLayout({ children, mainId = 'main-content' }: BetaAuthLayoutProps) {
  const prefersReducedMotion = useReducedMotion()
  const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useAuthOrbTracking()

  return (
    <main
      id={mainId}
      ref={containerRef}
      data-theme="light"
      onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
      className="flex items-center justify-center min-h-screen w-full relative overflow-hidden bg-off-white md:bg-teal-dark"
    >
      {/* Background : teal-dark + pattern dots subtils + orbes anim (BATCH 56) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden md:block opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23FFFFFF'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />
      {!prefersReducedMotion && <AuthOrbBackground mouse={mouse} />}

      {/* Carte centree — paddings/gaps reduits sur mobile pour tenir sans scroll */}
      <div className="relative z-10 w-full md:w-auto flex items-center justify-center md:p-6">
        <div className="flex items-center overflow-hidden relative rounded-sm md:rounded-[32px] w-full md:w-auto">
          <div className="bg-[var(--color-bg-primary)] flex flex-col gap-4 md:gap-8 items-center justify-center overflow-hidden p-4 md:p-16 h-full w-full md:w-[512px]">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
