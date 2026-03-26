/**
 * ContributeModal — Sélection du type de contribution
 *
 * Deux types de partage :
 *   - Rencontre Nature : observation documentée d'une espèce
 *   - Instant Nature   : capture spontanée d'un moment de nature
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal
 *   - Focus sur le premier bouton à l'ouverture
 *   - Escape pour fermer
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Types de contribution ────────────────────────────────────────────────────

// TODO [BACKEND] — Activer les deux types quand les formulaires sont prêts :
//   1. Passer available: true pour chaque type au moment du go
//   2. La route /contribute?type=nature_encounter redirige vers le formulaire de création
//      → POST /posts { type: 'nature_encounter', ... } via postService.createPost()
//   3. Brancher le storage Supabase pour l'upload photos/vidéos (médias du post)
//      → bucket 'post-media', policies RLS : authentifié seulement
//   4. Après soumission réussie : invalider le cache TanStack Query ['feed']
//      pour que le nouveau post apparaisse immédiatement dans le feed

const CONTRIBUTION_TYPES = [
  {
    id: 'nature_encounter',
    emoji: '🦅',
    title: 'Rencontre Nature',
    description:
      "Documente l'observation d'une espèce : lieu, date, conditions météo, identification.",
    available: false, // TODO [BACKEND] — passer à true quand le formulaire /contribute est implémenté
  },
  {
    id: 'nature_instant',
    emoji: '📸',
    title: 'Instant Nature',
    description: 'Capture un moment spontané de nature : ambiance, phénomène, paysage.',
    available: false, // TODO [BACKEND] — passer à true quand le formulaire /contribute est implémenté
  },
] as const

// ─── Composant ───────────────────────────────────────────────────────────────

interface ContributeModalProps {
  onClose: () => void
}

export function ContributeModal({ onClose }: ContributeModalProps) {
  const firstBtnRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Focus à l'ouverture
  useEffect(() => {
    firstBtnRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSelect(type: (typeof CONTRIBUTION_TYPES)[number]) {
    if (!type.available) return
    onClose()
    navigate(`/contribute?type=${type.id}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partager une observation"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] px-4 z-50"
      >
        <div className="bg-cream-lighter border-[0.5px] border-border rounded-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <h2 className="font-bold text-foreground">Partager une observation</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Quel type de contribution veux-tu publier ?
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 flex flex-col gap-3">
            {CONTRIBUTION_TYPES.map((type, i) => (
              <button
                key={type.id}
                ref={i === 0 ? firstBtnRef : undefined}
                type="button"
                onClick={() => handleSelect(type)}
                disabled={!type.available}
                className={[
                  'relative flex items-start gap-4 p-5 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  type.available
                    ? 'border-border hover:border-primary hover:bg-primary-light/30 cursor-pointer'
                    : 'border-border opacity-60 cursor-not-allowed',
                ].join(' ')}
              >
                <span className="text-3xl leading-none shrink-0 mt-0.5" aria-hidden="true">
                  {type.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground">{type.title}</p>
                    {!type.available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Bientôt disponible
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
