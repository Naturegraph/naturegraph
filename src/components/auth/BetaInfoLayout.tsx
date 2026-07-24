/**
 * BetaInfoLayout : Layout pour pages de contenu long (Privacy, Legal, etc.)
 *
 * BATCH 68 (Nicolas decision 2026-05-15) : variante de BetaAuthLayout pour
 * pages de contenu long qui ont besoin de scroll. Conserve la cohereence
 * visuelle (background teal-dark + pattern dots + orbes) tout en permettant
 * une card plus large et un contenu scrollable.
 *
 * Difference avec BetaAuthLayout :
 *   - BetaAuthLayout  : card 512px centree verticalement (welcome, waitlist)
 *   - BetaInfoLayout  : card max-w-3xl, scroll vertical (privacy, legal, contact-long)
 */

import { useReducedMotion } from 'motion/react'
import { AuthOrbBackground, useAuthOrbTracking } from '@/components/auth/AuthOrbBackground'

interface BetaInfoLayoutProps {
  /** Contenu de la card */
  children: React.ReactNode
}

export function BetaInfoLayout({ children }: BetaInfoLayoutProps) {
  const prefersReducedMotion = useReducedMotion()
  const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useAuthOrbTracking()

  return (
    <div
      ref={containerRef}
      onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
      className="min-h-screen w-full relative bg-off-white md:bg-teal-dark"
    >
      {/* Background : pattern dots subtils + orbes anim (md:) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 hidden md:block opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23FFFFFF'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />
      {!prefersReducedMotion && (
        <div className="fixed inset-0 hidden md:block pointer-events-none">
          <AuthOrbBackground mouse={mouse} />
        </div>
      )}

      {/* Card cream scrollable */}
      <main
        id="main-content"
        className="relative z-10 w-full max-w-3xl mx-auto md:my-8 lg:my-12 bg-[var(--color-bg-primary)] md:rounded-[32px] px-6 md:px-12 py-10 md:py-12"
      >
        {children}
      </main>
    </div>
  )
}
