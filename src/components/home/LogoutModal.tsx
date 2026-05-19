/**
 * LogoutModal — Modal de confirmation de déconnexion
 *
 * BATCH 86 (Nicolas decision 2026-05-15) : redesign moderne.
 *   - Plus de gros emoji centré (était daté)
 *   - Illustration SVG subtile saisonniere en haut
 *   - Card cream cohérente avec le DS
 *   - 2 boutons clairs (rester / déconnecter)
 *
 * Messages saisonniers par mois :
 *   Hiver (déc–fév) : hibernation
 *   Printemps (mars–mai) : floraison
 *   Été (juin–août) : exploration
 *   Automne (sept–nov) : feuilles
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - Trap focus (Escape ferme)
 *   - Backdrop clic = annulation
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Messages saisonniers ────────────────────────────────────────────────────
//
// Nicolas 2026-05-19 : on garde la variation saisonnière du texte (titre +
// body) mais on retire l'illustration SVG abstraite pour utiliser l'hermine
// officielle (cohérence identitaire). accentVar + SeasonIllustration retirés.

interface SeasonContent {
  title: string
  body: string
}

function getSeasonContent(): SeasonContent {
  const month = new Date().getMonth() + 1 // 1-12

  if (month === 12 || month <= 2) {
    return {
      title: "Tu t'apprêtes à hiberner ?",
      body: "On garde ta place bien au chaud. Tes observations t'attendent pour le printemps.",
    }
  }
  if (month <= 5) {
    return {
      title: 'Déjà prêt à quitter la nature en pleine floraison ?',
      body: "Les premières fleurs s'ouvrent, les migrateurs reviennent. Mais on comprend si tu fais une pause.",
    }
  }
  if (month <= 8) {
    return {
      title: "Tu quittes déjà l'exploration ?",
      body: 'Le soleil brille et la biodiversité estivale bat son plein. À très vite !',
    }
  }
  return {
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
  const { title, body } = getSeasonContent()

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
      {/* Modal — design BATCH 86 : illustration discrete + card cohérente DS */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className="w-full max-w-sm bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
      >
        {/* Header : hermine officielle (illustration identitaire Naturegraph).
            Remplace l'icône SVG saisonnière abstraite — Nicolas 2026-05-19. */}
        <div className="flex flex-col items-center pt-7 pb-4 px-6">
          <img src={hermineEmptyState} alt="" aria-hidden="true" className="w-24 opacity-90 mb-4" />
          <h2
            id="logout-modal-title"
            className="text-foreground font-bold text-lg leading-snug text-center"
          >
            {title}
          </h2>
          <p className="mt-2 text-[var(--color-text-secondary)] text-sm leading-relaxed text-center">
            {body}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-2.5">
          {/* CTA primaire : rester (action prioritaire) */}
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={onCancel}
            disabled={isLoading}
          >
            Rester explorer
          </Button>

          {/* CTA destructif : déconnexion (variant secondary du DS — Nicolas 2026-05-19) */}
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Déconnexion…' : 'Oui, me déconnecter'}
          </Button>
        </div>
      </div>
    </div>
  )
}
