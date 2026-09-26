/**
 * Logo, Naturegraph wordmark cliquable
 * Navigue vers la landing page au clic si onNavigateToLanding est fourni.
 */

import { LogoWordmark } from '@/components/ui/LogoWordmark'

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
      >
        {/* forceVariant light : pages auth toujours claires (cf. LogoWordmark).
            Nom accessible du bouton porte par l'alt (retour QA a11y "Logo") :
            pas d'aria-label redondant. */}
        <LogoWordmark forceVariant="light" alt="Naturegraph, accueil" />
      </button>
    )
  }

  return <LogoWordmark forceVariant="light" />
}
