/**
 * ContributeModal : Sélection du type de contribution (v2 : pixel-perfect Figma 6385:97403)
 *
 * Options :
 *   - Rencontre nature  : observation documentée d'une espèce : icône oiseau teal (disponible)
 *   - Instant nature    : capture spontanée paysage/ambiance : icône montagne orange (disponible)
 *
 * Design (couleurs theme-aware, Figma dark 6858:13212, Nicolas 2026-07-28) :
 *   - Conteneur : bg surface, border gris-clair 0.5px, rounded-lg, shadow-lg
 *   - Cartes    : teinte de l'accent, PASTEL en clair / TRES FONCEE en sombre
 *     (teal #E5F7F7->#032222, ambre #FFF4E0->#281203) via tokens
 *     `--color-contribute-*`. Le glyphe de l'icone reprend le fond de carte.
 *   - Icône     : cercle 48px (teal #006666->#33B6B6 | amber #CC7A00)
 *   - Titre/Desc: tokens `--color-contribute-title` / `-desc` (clair -> sombre)
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
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bird, MountainSnow, BookOpen } from 'lucide-react'

// ─── Types de contribution ────────────────────────────────────────────────────

interface ContributionType {
  id: string
  title: string
  description: string
  /** Couleur CSS du fond de la carte (token theme-aware) */
  cardBg: string
  /** Retiree de l'affichage sans etre supprimee du code. */
  hidden?: boolean
  /** Couleur CSS du fond du cercle-icône (token theme-aware) */
  iconBg: string
  /**
   * Couleur du GLYPHE de l'icone (token theme-aware dedie). En clair : blanc.
   * En sombre : la teinte foncee de la carte, si bien que l'icone se decoupe
   * dans la pastille vive (design Figma 6858:13212).
   */
  glyph: string
  /** Composant Lucide pour l'icône */
  Icon: React.ElementType
  /** Si true, carte grisée + badge "Bientôt" : non cliquable */
  disabled: boolean
}

import { NOTEBOOKS_ENABLED } from '@/lib/featureFlags'

// Ordre Figma 6385:97403 (Nicolas 2026-06-08) : Carnet -> Instant -> Rencontre.
const CONTRIBUTION_TYPES: ContributionType[] = [
  {
    // V1.2.0 (NG-005/006) : carnet d'observations.
    // Nicolas 2026-06-08 : disponible PARTOUT (desktop, tablette, mobile). Deux
    // usages : (1) mode terrain au fil d'une sortie sur smartphone, (2) saisie
    // au calme sur PC pour reporter des notes papier. On ne restreint plus au
    // mobile pour couvrir l'ensemble des cas d'usage.
    // Masque le 2026-07-23 (Nicolas) : plus utile pour le moment. L'entree est
    // conservee mais filtree a l'affichage, pour pouvoir la remettre sans avoir
    // a la reecrire.
    hidden: true,
    id: 'nature_notebook',
    title: "Carnet d'observations",
    description: 'Démarre une sortie nature : ajoute progressivement les espèces observées.',
    /** Carte masquee : couleurs laissees en dur (non affichee). */
    cardBg: '#f4f4f4',
    iconBg: '#20203d',
    glyph: '#ffffff',
    Icon: BookOpen,
    disabled: false,
  },
  {
    id: 'nature_instant',
    title: 'Instant nature',
    description: "Partage un paysage ou un phénomène naturel qui t'a marqué.",
    // Tokens theme-aware (Figma 6858:13212) : ambre pastel #FFF4E0 en clair,
    // ambre quasi noir #281203 en sombre. Le glyphe reprend le fond.
    cardBg: 'var(--color-contribute-instant-bg)',
    iconBg: 'var(--color-contribute-instant-circle)',
    glyph: 'var(--color-contribute-instant-glyph)',
    Icon: MountainSnow,
    // Nicolas 2026-05-23 : activé en preview, branche feat/instant-nature-preview.
    disabled: false,
  },
  {
    id: 'nature_encounter',
    title: 'Rencontre nature',
    description: 'Contribue en ajoutant une observation animale, avec ou sans photo.',
    // Tokens theme-aware (Figma 6858:13212) : teal pastel #E5F7F7 + pastille
    // #006666 en clair ; teal quasi noir #032222 + pastille vive #33B6B6 en
    // sombre. Le glyphe reprend le fond de carte.
    cardBg: 'var(--color-contribute-encounter-bg)',
    iconBg: 'var(--color-contribute-encounter-circle)',
    glyph: 'var(--color-contribute-encounter-glyph)',
    Icon: Bird,
    disabled: false,
  },
]

// ─── Badge "Bientôt" ─────────────────────────────────────────────────────────

function SoonBadge() {
  return (
    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-link)] bg-primary/10 px-2 py-0.5 rounded-full">
      Bientôt
    </span>
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface ContributeModalProps {
  onClose: () => void
  /**
   * Si fourni, appelé à la sélection d'un type : ouvre le panneau inline
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
  // 2026-05-19 : même pattern que ProfileMenu/NotificationsPanel : `click`
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

  // Ordre Figma selon le viewport (Nicolas 2026-06-08) : le Carnet est
  // desormais disponible PARTOUT (desktop, tablette, mobile) pour couvrir les
  // deux usages : mode terrain sur smartphone OU saisie au calme sur PC.
  //  - Mobile (bottom sheet) : Carnet -> Instant -> Rencontre (terrain en 1er,
  //    pouce a portee).
  //  - Desktop / tablette (dropdown) : Rencontre -> Instant -> Carnet (l'action
  //    de contribution principale en haut).
  // NG (Nicolas 2026-06-11) : carnets masques en prod -> on retire l'option
  // "Carnet d'observations" du menu de contribution (reversible via le flag).
  const availableTypes = NOTEBOOKS_ENABLED
    ? CONTRIBUTION_TYPES
    : CONTRIBUTION_TYPES.filter((t) => t.id !== 'nature_notebook')
  const mobileOrder = availableTypes
  const desktopOrder = [...availableTypes].reverse()

  /**
   * Rendu des cartes pour un ordre donné.
   * @param types - liste ordonnée à afficher
   * @param attachRef - place le focus initial sur le 1er item actif. Activé
   *   uniquement côté desktop (le dropdown mobile est aussi monté dans le DOM ;
   *   un seul des deux doit porter le ref pour éviter un focus sur un nœud caché).
   */
  function renderCards(tousLesTypes: ContributionType[], attachRef: boolean) {
    // Le filtre vit ICI, au rendu : les entrees masquees restent declarees
    // (donc faciles a remettre) mais ne sont ni affichees ni focalisables.
    const types = tousLesTypes.filter((t) => !t.hidden)
    const firstFocusableIndex = types.findIndex((t) => !t.disabled)
    return (
      <div role="menu" aria-label="Type de contribution" className="flex flex-col gap-1">
        {types.map((type, i) => {
          const { Icon } = type

          // Carte désactivée (bientôt disponible) : rendu en <div> non cliquable
          if (type.disabled) {
            return (
              <div
                key={type.id}
                role="menuitem"
                aria-disabled="true"
                className="flex items-center gap-4 p-3 rounded-md opacity-60 cursor-not-allowed select-none"
                style={{ backgroundColor: type.cardBg }}
              >
                {/* Cercle icône : 48px (Figma Frame 4448) */}
                <div
                  className="size-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: type.iconBg }}
                  aria-hidden="true"
                >
                  <Icon className="size-6" style={{ color: type.glyph }} strokeWidth={2} />
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-title font-bold text-base leading-[1.2] text-[var(--color-contribute-title)]">
                      {type.title}
                    </p>
                    <SoonBadge />
                  </div>
                  <p className="text-sm text-[var(--color-contribute-desc)] mt-1 leading-normal">
                    {type.description}
                  </p>
                </div>
              </div>
            )
          }

          // Carte active : bouton cliquable
          return (
            <button
              key={type.id}
              ref={attachRef && i === firstFocusableIndex ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(type)}
              className="w-full flex items-center gap-4 p-3 rounded-md text-left transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              style={{ backgroundColor: type.cardBg }}
            >
              {/* Cercle icône : 48px (Figma Frame 4448) */}
              <div
                className="size-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: type.iconBg }}
                aria-hidden="true"
              >
                <Icon className="size-6" style={{ color: type.glyph }} strokeWidth={2} />
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <p className="font-title font-bold text-base leading-[1.2] text-[var(--color-contribute-title)]">
                  {type.title}
                </p>
                <p className="text-sm text-[var(--color-contribute-desc)] mt-1 leading-normal">
                  {type.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* ── Backdrop mobile uniquement ──────────────────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : dropdown absolue (positionnée par le parent relative) ── */}
      <div
        ref={dropdownRef}
        role="dialog"
        aria-modal="true"
        aria-label="Partager une contribution"
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[400px] max-w-[calc(100vw-24px)] bg-[var(--color-bg-primary)] border-[0.5px] border-border rounded-sm shadow-[0px_6px_16px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden p-1"
      >
        {renderCards(desktopOrder, true)}
      </div>

      {/* ── Mobile : bottom sheet positionné au-dessus de la MobileBottomNav
              (h-14 + safe-area) : sinon les cartes "Rencontre nature" / "Instant nature"
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
        {/* Titre "Partager" retiré sur mobile (Nicolas 2026-05-19) : pas
            d'intérêt sur sheet compacte, les cartes parlent d'elles-mêmes. */}
        <div className="px-2 pt-2 pb-4">{renderCards(mobileOrder, false)}</div>
      </div>
    </>
  )
}
