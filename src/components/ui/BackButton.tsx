/**
 * BackButton : Bouton "Retour" avec icône flèche
 * ================================================
 * Pattern récurrent dans le flow d'onboarding (3 occurrences) :
 * bouton outline avec ArrowLeft + texte caché sur mobile.
 *
 * A11y : aria-label compense l'absence de texte sur mobile.
 */

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface BackButtonProps {
  /** Texte du bouton : défaut: "Retour" */
  label?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Bouton retour avec flèche : utilise le variant secondaire du Button.
 * Cohérent visuellement avec les autres actions secondaires de l'app.
 */
export function BackButton({ label = 'Retour', onClick, disabled }: BackButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={<ArrowLeft size={18} aria-hidden="true" />}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  )
}
