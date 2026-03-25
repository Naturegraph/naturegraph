/**
 * Logo — Naturegraph wordmark cliquable
 * Navigue vers la landing page au clic si onNavigateToLanding est fourni.
 */

import logoColor from '@/assets/logos/logo-wordmark-color.svg'

interface LogoProps {
  /** Callback pour naviguer vers la landing. Si absent, le logo est non-cliquable. */
  onNavigateToLanding?: () => void
}

export function Logo({ onNavigateToLanding }: LogoProps) {
  if (onNavigateToLanding) {
    return (
      <button
        type="button"
        onClick={onNavigateToLanding}
        className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)] rounded"
        aria-label="Naturegraph — Retour à l'accueil"
      >
        <img src={logoColor} alt="Naturegraph" className="h-8 w-auto" />
      </button>
    )
  }

  return <img src={logoColor} alt="Naturegraph" className="h-8 w-auto" />
}
