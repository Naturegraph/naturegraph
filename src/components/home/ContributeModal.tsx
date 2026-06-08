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
import { Bird, MountainSnow, BookOpen } from 'lucide-react'

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
  /** V1.2.0 : si true, la carte n est rendue que sur mobile (md:hidden).
   *  Utilise pour le carnet d observations, dont le mode terrain n a de
   *  sens que sur smartphone. */
  mobileOnly?: boolean
}

// Ordre Figma 6385:97403 (Nicolas 2026-06-08) : Carnet -> Instant -> Rencontre.
const CONTRIBUTION_TYPES: ContributionType[] = [
  {
    // V1.2.0 (NG-005/006) : mode terrain dedie. MOBILE-ONLY.
    // Decision Nicolas 2026-06-02 : un PC ne se balade pas en nature, le
    // mode terrain (timer + brouillon persistant + ajout rapide d especes)
    // n a de sens que sur smartphone. Sur desktop, l user peut quand meme
    // creer un post multi-especes via "Rencontre nature".
    // Rendu visuel : la carte est filtree au render via mobileOnly = true.
    id: 'nature_notebook',
    title: "Carnet d'observations",
    description: 'Démarre une sortie nature : ajoute progressivement les espèces observées.',
    /** Background/Neutral/Secondary — gris clair (#F4F4F4, Figma Frame 2985). */
    cardBg: '#f4f4f4',
    /** Content/Neutral/Secondary — bleu nuit (#20203D = $greyscale-800). */
    iconBg: '#20203d',
    Icon: BookOpen,
    disabled: false,
    mobileOnly: true,
  },
  {
    id: 'nature_instant',
    title: 'Instant nature',
    description: "Partage un paysage ou un phénomène naturel qui t'a marqué.",
    /** Background/Neutral/Tertiary (--color-bg-tertiary = #FFF4E0). */
    cardBg: 'var(--color-bg-tertiary)',
    /** Amber brand primary (--color-amber-primary = #CC7A00). */
    iconBg: 'var(--color-amber-primary)',
    Icon: MountainSnow,
    // Nicolas 2026-05-23 : activé en preview, branche feat/instant-nature-preview.
    disabled: false,
  },
  {
    id: 'nature_encounter',
    title: 'Rencontre nature',
    description: 'Contribue en ajoutant une observation animale, avec ou sans photo.',
    /** Background/Highlight/Secondary — teal-50 (#E5F7F7, $brand-highlight-50). */
    cardBg: '#e5f7f7',
    /** Background/Highlight/Primary (--color-highlight-primary = #006666). */
    iconBg: 'var(--color-highlight-primary)',
    Icon: Bird,
    disabled: false,
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

  // Fermer si clic en dehors du dropdown/sheet.
  // 2026-05-19 : même pattern que ProfileMenu/NotificationsPanel — `click`
  // post-React + `closest()` qui matche desktop dropdown ET mobile sheet
  // (sinon le ref desktop seul ferme le menu avant que onTypeSelect ne fire
  // sur le tap d'une carte en mobile).
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[role="dialog"][aria-label="Partager une contribution"]')) return
      // V1.1.4 (Nicolas 2026-06-01) : cumul panels navbar.
      // Click sur un autre bouton toggle ou un autre dialog -> ne ferme pas.
      if (target.closest('button[aria-haspopup="dialog"]')) return
      if (target.closest('[role="dialog"]')) return
      onClose()
    }
    const timer = setTimeout(() => document.addEventListener('click', fn), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', fn)
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

  // Focus initial : premier item NON desactive ET visible en desktop (le
  // Carnet est mobileOnly/md:hidden -> on ne focus pas un element cache).
  const firstFocusableIndex = CONTRIBUTION_TYPES.findIndex((t) => !t.disabled && !t.mobileOnly)

  /** Rendu des cartes — partagé entre dropdown et bottom sheet */
  const cards = (
    <div role="menu" aria-label="Type de contribution" className="flex flex-col gap-1">
      {CONTRIBUTION_TYPES.map((type, i) => {
        const { Icon } = type

        // V1.2.0 : carte cachee sur desktop (md+) si mobileOnly = true
        const mobileOnlyClass = type.mobileOnly ? 'md:hidden' : ''

        // Carte désactivée (bientôt disponible) — rendu en <div> non cliquable
        if (type.disabled) {
          return (
            <div
              key={type.id}
              role="menuitem"
              aria-disabled="true"
              className={`flex items-center gap-4 p-3 rounded-xl opacity-60 cursor-not-allowed select-none ${mobileOnlyClass}`}
              style={{ backgroundColor: type.cardBg }}
            >
              {/* Cercle icône — 48px (Figma Frame 4448) */}
              <div
                className="size-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: type.iconBg }}
                aria-hidden="true"
              >
                <Icon className="size-6 text-white" strokeWidth={2} />
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-title font-bold text-base leading-[1.2] text-foreground">
                    {type.title}
                  </p>
                  <SoonBadge />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-normal">
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
            ref={i === firstFocusableIndex ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => handleSelect(type)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${mobileOnlyClass}`}
            style={{ backgroundColor: type.cardBg }}
          >
            {/* Cercle icône — 48px (Figma Frame 4448) */}
            <div
              className="size-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: type.iconBg }}
              aria-hidden="true"
            >
              <Icon className="size-6 text-white" strokeWidth={2} />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="font-title font-bold text-base leading-[1.2] text-foreground">
                {type.title}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-normal">
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
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[400px] max-w-[calc(100vw-24px)] bg-[var(--color-bg-primary)] border-[0.5px] border-border rounded-lg shadow-[0px_6px_16px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden p-1"
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
        className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-[var(--color-bg-primary)] border-t border-border rounded-t-xl shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {/* Titre "Partager" retiré sur mobile (Nicolas 2026-05-19) — pas
            d'intérêt sur sheet compacte, les cartes parlent d'elles-mêmes. */}
        <div className="px-2 pt-2 pb-4">{cards}</div>
      </div>
    </>
  )
}
