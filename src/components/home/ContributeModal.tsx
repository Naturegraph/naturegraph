/**
 * ContributeModal — Sélection du type de contribution (v2 — pixel-perfect Figma 6385:97403)
 *
 * Options :
 *   - Rencontre nature  : observation documentée d'une espèce — icône oiseau teal (disponible)
 *   - Instant nature    : capture spontanée paysage/ambiance — icône montagne orange (bientôt)
 *
 * Design :
 *   - Conteneur : bg cream, border gris-clair 0.5px, rounded-lg, shadow-lg, padding 4px
 *   - Cartes    : fond coloré (teal-50 / warm-bg-tertiary), gap-5, padding 16px, rounded-xl
 *   - Icône     : cercle 56px (teal `#006666` | amber `#cc7a00`), icône blanche 28px
 *   - Titre     : Quicksand Bold 18px
 *   - Desc.     : Mulish Regular 14px, text-muted-foreground
 *   - Bientôt   : badge pill primary/10, item opacity-60, cursor-not-allowed
 *
 * Responsive :
 *   - Desktop : dropdown absolue sous le bouton "Contribuer" (parent relative HomeNavbar)
 *   - Mobile  : bottom sheet avec backdrop et handle bar
 *
 * Accessibilité :
 *   - role="menu" + role="menuitem" + aria-disabled
 *   - Escape pour fermer, clic backdrop (mobile) ferme
 *   - Focus sur le premier item à l'ouverture
 *
 * TODO [FEATURE] Instant nature — activer quand le formulaire est prêt :
 *   1. Retirer `disabled: true` dans CONTRIBUTION_TYPES
 *   2. Créer le formulaire /contribute?type=nature_instant
 *   3. POST /posts { type: 'nature_instant', ... } via postService
 *   4. Invalider le cache TanStack Query ['feed']
 *
 * TODO [TOKEN] `#cc7a00` (cercle Instant nature) — ajouter `--color-amber-primary`
 *   dans _light-theme.scss quand le design system sera mis à jour.
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bird, MountainSnow } from 'lucide-react'

// ─── Types de contribution ────────────────────────────────────────────────────

interface ContributionType {
  id: string
  title: string
  description: string
  /** Couleur CSS du fond de la carte (token ou hex commenté) */
  cardBg: string
  /** Couleur CSS du fond du cercle-icône */
  iconBg: string
  /** Composant Lucide pour l'icône */
  Icon: React.ElementType
  /** Si true, carte grisée + badge "Bientôt" — non cliquable */
  disabled: boolean
}

const CONTRIBUTION_TYPES: ContributionType[] = [
  {
    id: 'nature_encounter',
    title: 'Rencontre nature',
    description: 'Contribue en ajoutant une observation animale, avec ou sans photo.',
    /** Teal-50 du design system ($brand-highlight-50 = #e5f7f7) */
    cardBg: '#e5f7f7',
    /** Teal-500 via CSS var (--color-highlight-primary = #006666) */
    iconBg: 'var(--color-highlight-primary)',
    Icon: Bird,
    disabled: false,
  },
  {
    id: 'nature_instant',
    title: 'Instant nature',
    description: "Partage un paysage ou un phénomène naturel qui t'a marqué.",
    /** Warm-bg-tertiary via CSS var (--color-bg-tertiary = #fff4e0) */
    cardBg: 'var(--color-bg-tertiary)',
    /** Amber brand primary — token CSS (BATCH 42 — _light/_dark theme). */
    iconBg: 'var(--color-amber-primary)',
    Icon: MountainSnow,
    disabled: true,
  },
]

// ─── Badge "Bientôt" ─────────────────────────────────────────────────────────

function SoonBadge() {
  return (
    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
      Bientôt
    </span>
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface ContributeModalProps {
  onClose: () => void
  /**
   * Si fourni, appelé à la sélection d'un type — ouvre le panneau inline
   * sans naviguer vers /contribute. Sinon : navigation classique.
   */
  onTypeSelect?: (type: string) => void
}

export function ContributeModal({ onClose, onTypeSelect }: ContributeModalProps) {
  const navigate = useNavigate()
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus sur le premier item actif à l'ouverture
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
    // Délai 50ms pour éviter que le clic d'ouverture ferme immédiatement
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  function handleSelect(type: ContributionType) {
    if (type.disabled) return
    onClose()
    if (onTypeSelect) {
      onTypeSelect(type.id)
    } else {
      navigate(`/contribute?type=${type.id}`)
    }
  }

  /** Rendu des cartes — partagé entre dropdown et bottom sheet */
  const cards = (
    <div role="menu" aria-label="Type de contribution" className="flex flex-col gap-1">
      {CONTRIBUTION_TYPES.map((type, i) => {
        const { Icon } = type

        // Carte désactivée (bientôt disponible) — rendu en <div> non cliquable
        if (type.disabled) {
          return (
            <div
              key={type.id}
              role="menuitem"
              aria-disabled="true"
              className="flex items-center gap-5 p-4 rounded-lg opacity-60 cursor-not-allowed select-none"
              style={{ backgroundColor: type.cardBg }}
            >
              {/* Cercle icône */}
              <div
                className="size-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: type.iconBg }}
                aria-hidden="true"
              >
                <Icon className="size-7 text-white" strokeWidth={1.75} />
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-title font-bold text-[17px] leading-snug text-foreground">
                    {type.title}
                  </p>
                  <SoonBadge />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {type.description}
                </p>
              </div>
            </div>
          )
        }

        // Carte active — bouton cliquable
        return (
          <button
            key={type.id}
            ref={i === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => handleSelect(type)}
            className="w-full flex items-center gap-5 p-4 rounded-lg text-left transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            style={{ backgroundColor: type.cardBg }}
          >
            {/* Cercle icône */}
            <div
              className="size-14 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: type.iconBg }}
              aria-hidden="true"
            >
              <Icon className="size-7 text-white" strokeWidth={1.75} />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="font-title font-bold text-[17px] leading-snug text-foreground">
                {type.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {type.description}
              </p>
            </div>
          </button>
        )
      })}
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
        aria-label="Partager une contribution"
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[400px] max-w-[calc(100vw-24px)] bg-[var(--color-bg-primary)] border border-border/70 rounded-lg shadow-xl z-50 overflow-hidden p-1"
      >
        {cards}
      </div>

      {/* ── Mobile : bottom sheet positionné au-dessus de la MobileBottomNav
              (h-14 + safe-area) — sinon les cartes "Rencontre nature" / "Instant nature"
              tombent sous la navbar et leurs clics sont interceptés.
              z-[60] > navbar z-50 pour ne pas laisser la navbar capturer les taps. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partager une contribution"
        className="md:hidden fixed inset-x-0 z-[60] bg-[var(--color-bg-primary)] border-t border-border rounded-t-xl shadow-xl overflow-hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {/* Titre */}
        <p className="px-5 pt-3 pb-2 text-base font-title font-bold text-foreground">Partager</p>
        <div className="px-2 pb-4">{cards}</div>
      </div>
    </>
  )
}
