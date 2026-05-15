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

// ─── Messages saisonniers ────────────────────────────────────────────────────

interface SeasonContent {
  /** Couleur d'accent du header (token DS) */
  accentVar: string
  /** Illustration SVG saisonnière (rendu inline, taille modeste) */
  illustration: React.ReactNode
  title: string
  body: string
}

function SeasonIllustration({ icon }: { icon: 'snow' | 'bud' | 'sun' | 'leaf' }) {
  // Illustrations SVG simples, taille 40px, cohérentes avec le DS.
  // Stroke fin et couleur unique pour un rendu moderne et discret.
  const common = {
    width: 40,
    height: 40,
    viewBox: '0 0 40 40',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (icon === 'snow') {
    return (
      <svg {...common}>
        <path d="M20 8v24M8 20h24M11.5 11.5l17 17M28.5 11.5l-17 17" />
        <circle cx="20" cy="20" r="3" />
      </svg>
    )
  }
  if (icon === 'bud') {
    return (
      <svg {...common}>
        <path d="M20 32V18" />
        <path d="M20 18c-4-2-7-1-9 2 2 3 5 4 9 2z" />
        <path d="M20 18c4-2 7-1 9 2-2 3-5 4-9 2z" />
        <path d="M14 32h12" />
      </svg>
    )
  }
  if (icon === 'sun') {
    return (
      <svg {...common}>
        <circle cx="20" cy="20" r="6" />
        <path d="M20 6v3M20 31v3M6 20h3M31 20h3M10 10l2.1 2.1M27.9 27.9 30 30M10 30l2.1-2.1M27.9 12.1 30 10" />
      </svg>
    )
  }
  // leaf
  return (
    <svg {...common}>
      <path d="M11 29C11 18 18 11 29 11c0 11-7 18-18 18z" />
      <path d="M11 29l9-9" />
    </svg>
  )
}

function getSeasonContent(): SeasonContent {
  const month = new Date().getMonth() + 1 // 1-12

  if (month === 12 || month <= 2) {
    return {
      accentVar: 'var(--color-info)',
      illustration: <SeasonIllustration icon="snow" />,
      title: "Tu t'apprêtes à hiberner ?",
      body: "On garde ta place bien au chaud. Tes observations t'attendent pour le printemps.",
    }
  }
  if (month <= 5) {
    return {
      accentVar: 'var(--color-success)',
      illustration: <SeasonIllustration icon="bud" />,
      title: 'Déjà prêt à quitter la nature en pleine floraison ?',
      body: "Les premières fleurs s'ouvrent, les migrateurs reviennent. Mais on comprend si tu fais une pause.",
    }
  }
  if (month <= 8) {
    return {
      accentVar: 'var(--color-warning)',
      illustration: <SeasonIllustration icon="sun" />,
      title: "Tu quittes déjà l'exploration ?",
      body: 'Le soleil brille et la biodiversité estivale bat son plein. À très vite !',
    }
  }
  return {
    accentVar: 'var(--color-action-default)',
    illustration: <SeasonIllustration icon="leaf" />,
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
  const { illustration, title, body, accentVar } = getSeasonContent()

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
        {/* Header : illustration dans cercle accent saisonnier */}
        <div className="flex flex-col items-center pt-7 pb-4 px-6">
          <div
            className="size-14 rounded-full flex items-center justify-center mb-4"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
              color: accentVar,
            }}
            aria-hidden="true"
          >
            {illustration}
          </div>
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

          {/* CTA destructif : déconnexion (outline rouge subtil) */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="
              w-full h-11 px-6 rounded-full
              text-sm font-bold
              text-[var(--color-text-secondary)]
              hover:text-[var(--color-error-action)]
              hover:bg-[var(--color-error-action)]/8
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error-action)]
            "
          >
            {isLoading ? 'Déconnexion…' : 'Oui, me déconnecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
