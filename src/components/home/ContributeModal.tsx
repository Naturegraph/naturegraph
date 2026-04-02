/**
 * ContributeModal — Sélection du type de contribution
 *
 * Options visibles :
 *   - Rencontre nature  : observation documentée d'une espèce     — icône teal (ligne mise en avant)
 *
 * Options prévues (masquées — version future) :
 *   - Instant nature    : capture spontanée (paysage, ambiance)   — icône orange
 *     → code conservé dans CONTRIBUTION_TYPES avec hidden: true
 *     → route /contribute?type=nature_instant disponible en dev
 *
 * Responsive :
 *   - Desktop : dropdown absolue sous le bouton "Contribuer" (pas de backdrop)
 *               → positionnée par le parent `position: relative` dans HomeNavbar
 *   - Mobile  : bottom sheet avec backdrop et handle bar
 *
 * Accessibilité :
 *   - role="menu" + role="menuitem" sur les options
 *   - Escape pour fermer, clic backdrop (mobile) ferme
 *   - Focus sur le premier item à l'ouverture
 *
 * TODO [BACKEND] — Au clic sur une option :
 *   - navigate(`/contribute?type=${id}`) vers le formulaire de création
 *   - POST /posts { type, ... } via postService.createPost()
 *   - Après succès : invalider le cache TanStack Query ['feed']
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types de contribution ────────────────────────────────────────────────────

const CONTRIBUTION_TYPES = [
  {
    id: 'nature_instant',
    /** Icône dans un cercle orange */
    emoji: '🏔️',
    bgColor: 'bg-[#FF6B35]',
    title: 'Instant nature',
    description: 'Capture un moment spontané : paysage, ambiance, phénomène.',
    highlighted: false,
    /** Masqué en front — disponible en dev, prévu pour une version future */
    hidden: true,
  },
  {
    id: 'nature_encounter',
    /** Icône dans un cercle teal */
    emoji: '🦅',
    bgColor: 'bg-teal',
    title: 'Rencontre nature',
    description: "Documente l'observation d'une espèce avec lieu et identification.",
    /** La ligne "Rencontre nature" est mise en avant (fond teal clair) */
    highlighted: true,
    hidden: false,
  },
]

// ─── Composant ────────────────────────────────────────────────────────────────

interface ContributeModalProps {
  onClose: () => void
}

export function ContributeModal({ onClose }: ContributeModalProps) {
  const navigate = useNavigate()
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus sur le premier item à l'ouverture
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Desktop : fermer si clic en dehors du dropdown
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  function handleSelect(id: string) {
    onClose()
    navigate(`/contribute?type=${id}`)
  }

  /** Rendu des options partagé entre dropdown et bottom sheet */
  const visibleTypes = CONTRIBUTION_TYPES.filter((t) => !t.hidden)

  const options = (
    <div role="menu" aria-label="Type de contribution">
      {visibleTypes.map((type, i) => (
        <div key={type.id}>
          {i > 0 && <div className="h-px bg-border mx-4" aria-hidden="true" />}

          <button
            ref={i === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => handleSelect(type.id)}
            className={[
              'w-full flex items-center gap-4 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
              type.highlighted
                ? 'bg-teal-light/20 hover:bg-teal-light/40'
                : 'hover:bg-primary-light/30',
            ].join(' ')}
          >
            {/* Icône dans un cercle coloré */}
            <div
              className={[
                'size-11 rounded-full flex items-center justify-center shrink-0 text-xl leading-none',
                type.bgColor,
              ].join(' ')}
              aria-hidden="true"
            >
              {type.emoji}
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{type.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {type.description}
              </p>
            </div>
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* ── Backdrop mobile uniquement ──────────────────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : dropdown absolue (positionnée par le parent relative) ── */}
      <div
        ref={dropdownRef}
        role="dialog"
        aria-modal="true"
        aria-label="Partager une observation"
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[300px] bg-cream-lighter border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      >
        {options}
      </div>

      {/* ── Mobile : bottom sheet ────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partager une observation"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-cream-lighter border-t border-border rounded-t-2xl shadow-xl overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {/* Titre discret */}
        <p className="px-5 pt-3 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Partager
        </p>
        {options}
        <div className="h-4" aria-hidden="true" />
      </div>
    </>
  )
}
