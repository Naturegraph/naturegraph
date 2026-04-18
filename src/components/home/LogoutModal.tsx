/**
 * LogoutModal — Modal de confirmation de déconnexion
 * ====================================================
 * Affiche un message saisonnier engageant avant de déconnecter l'utilisateur.
 * Le ton est celui de Naturegraph : chaleureux, nature, jamais dramatique.
 *
 * Messages par saison :
 *   Hiver (déc–fév) : hibernation / chaleur
 *   Printemps (mars–mai) : floraison / élan
 *   Été (juin–août) : exploration / soleil
 *   Automne (sept–nov) : feuilles / départ
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - Trap focus (Escape ferme)
 *   - Backdrop clic = annulation
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

// ─── Messages saisonniers ────────────────────────────────────────────────────

interface SeasonMessage {
  emoji: string
  title: string
  body: string
}

function getSeasonMessage(): SeasonMessage {
  const month = new Date().getMonth() + 1 // 1-12

  if (month === 12 || month <= 2) {
    return {
      emoji: '🐻',
      title: "Tu t'apprêtes à hiberner ?",
      body: "On garde ta place bien au chaud. Tes observations t'attendent pour le printemps.",
    }
  }
  if (month <= 5) {
    return {
      emoji: '🌱',
      title: 'Déjà prêt à quitter la nature en pleine floraison ?',
      body: "Les premières fleurs s'ouvrent, les migrateurs reviennent… mais on comprend !",
    }
  }
  if (month <= 8) {
    return {
      emoji: '☀️',
      title: "Tu quittes déjà l'exploration ?",
      body: 'Le soleil brille encore et la biodiversité estivale bat son plein. À très vite !',
    }
  }
  return {
    emoji: '🍂',
    title: 'Tu ramasses tes feuilles et tu pars déjà ?',
    body: "L'automne est si riche en observations. On t'attend pour la prochaine saison.",
  }
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface LogoutModalProps {
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function LogoutModal({ onConfirm, onCancel, isLoading = false }: LogoutModalProps) {
  const { emoji, title, body } = getSeasonMessage()

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onCancel, isLoading])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel()
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && !isLoading)
          onCancel()
      }}
    >
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className="w-full max-w-sm bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Illustration saisonnière */}
        <div className="bg-primary-light flex items-center justify-center py-8">
          <span className="text-6xl" role="img" aria-hidden="true">
            {emoji}
          </span>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <h2 id="logout-modal-title" className="text-foreground font-bold text-lg leading-snug">
            {title}
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{body}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {/* CTA secondaire — rester (action prioritaire visuellement = en haut) */}
          <Button variant="secondary" className="w-full" onClick={onCancel} disabled={isLoading}>
            Rester explorer
          </Button>

          {/* CTA primaire destructif — confirmer la déconnexion */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full h-12 px-6 rounded-full text-sm font-bold text-[var(--color-error-action)] border border-[var(--color-error-action)]/40 hover:bg-[var(--color-error-action)]/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Déconnexion…' : 'Oui, me déconnecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
