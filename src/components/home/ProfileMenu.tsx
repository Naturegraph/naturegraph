/**
 * ProfileMenu — Menu déroulant du profil utilisateur (v2 — pixel-perfect Figma)
 * ================================================================================
 * Redesign selon Figma node 6385:97828.
 *
 * Sections :
 *   - Entête       : avatar 56px + border + username + @handle
 *   - Principal    : Mon profil (bientôt) | Paramètres (bientôt)
 *   - Thème        : Apparence (bientôt)
 *   - Accessibilité: Taille (row → valeur courante + expand) | Contraste renforcé (toggle 40×20px)
 *   - Déconnexion  : ouvre LogoutModal saisonnière
 *   - Version      : "App version X.X.X" (caption, aligné gauche)
 *
 * Changements vs v1 (Figma spec) :
 *   - Avatar : 56px outer avec border border-border + padding 4px
 *   - Labels de section : sans uppercase, tracking-[0.04em], poids normal
 *   - Items : h-12 (48px), gap-2 (8px), icône dans conteneur 33.6px rounded-full
 *   - Item actif → bg-primary/10 rounded-lg (lavande #E7E9F7)
 *   - Taille : row "Taille → Petite/Moyenne/Grande >" expandable inline
 *   - Toggle contraste : 40×20px, thumb 16px (Figma spec)
 *   - Thème section déplacée avant Accessibilité
 *   - Divider uniquement avant Déconnexion
 *   - Version : texte caption simple sans icône cadenas
 *   - Mon profil : feature-gated (bientôt disponible)
 *
 * Responsive :
 *   - Desktop : dropdown absolue ancrée au bouton profil (parent relative)
 *   - Mobile  : bottom sheet avec handle bar et backdrop
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop ferme
 *   - aria-disabled sur les items inactifs, aria-checked sur les radios/switch
 *
 * TODO [BACKEND] — synchroniser textSize / highContrast avec profiles.preferences
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, LogOut, Palette, Eye, ChevronRight, Type } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useAuth } from '@/contexts/AuthContext'
import { useAccessibility, type TextSize } from '@/contexts/AccessibilityContext'
import { LogoutModal } from './LogoutModal'

// ─── Types & constantes ───────────────────────────────────────────────────────

/** Mapping TextSize → libellé affiché dans la row "Taille" */
const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: 'Petite',
  medium: 'Moyenne',
  large: 'Grande',
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/** Trait séparateur full-bleed entre blocs */
function Divider() {
  return <div className="h-px bg-border" aria-hidden="true" />
}

/**
 * Label de section — caption style Figma.
 * Pas d'uppercase : correspond au design Figma (Principal, Thème, Accessibilité).
 */
function SectionLabel({ label }: { label: string }) {
  return <p className="px-1 text-xs text-muted-foreground tracking-[0.04em]">{label}</p>
}

/** Badge "Bientôt" pour les features non disponibles */
function SoonBadge() {
  return (
    <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
      Bientôt
    </span>
  )
}

/**
 * Conteneur d'icône — 33.6px rounded-full (Figma spec).
 * Centralise l'icône et applique la couleur selon le contexte.
 */
function IconWrap({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span
      className={[
        'shrink-0 flex items-center justify-center size-[33.6px] rounded-full',
        danger ? 'text-[var(--color-error-action)]' : 'text-muted-foreground',
      ].join(' ')}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

/**
 * Ligne de menu — navigation ou action.
 * disabled → rendu en <div aria-disabled> + SoonBadge automatique.
 * highlighted → fond lavande bg-primary/10 (item principal mis en avant).
 */
function MenuItem({
  icon,
  label,
  onClick,
  href,
  highlighted = false,
  danger = false,
  disabled = false,
  rightContent,
}: {
  icon?: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  highlighted?: boolean
  danger?: boolean
  disabled?: boolean
  rightContent?: React.ReactNode
}) {
  // Classe de base commune — items Figma : h-12 (48px), px-3, gap-2, rounded-lg
  const base = [
    'w-full flex items-center gap-2 px-3 h-12 rounded-md text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : highlighted
        ? 'bg-primary/10 hover:bg-primary/15 cursor-pointer'
        : 'hover:bg-muted/30 cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {icon && <IconWrap danger={danger}>{icon}</IconWrap>}
      <span
        className={[
          'flex-1 text-sm font-medium',
          danger && !disabled ? 'text-[var(--color-error-action)]' : 'text-foreground',
        ].join(' ')}
      >
        {label}
      </span>
      {rightContent}
    </>
  )

  if (disabled) {
    return (
      <div className={base} aria-disabled="true">
        {content}
        <SoonBadge />
      </div>
    )
  }

  if (href) {
    return (
      <Link to={href} className={base} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={base}>
      {content}
    </button>
  )
}

/**
 * Row "Taille du texte" — affiche la valeur courante + chevron.
 * Expandable : déplie les 3 boutons radio inline (Petit / Moyen / Grand).
 * Le chevron pivote 90° à l'ouverture.
 */
function TextSizeRow({ value, onChange }: { value: TextSize; onChange: (v: TextSize) => void }) {
  const [expanded, setExpanded] = useState(false)

  const options: { key: TextSize; label: string; short: string }[] = [
    { key: 'small', label: 'Petite', short: 'A' },
    { key: 'medium', label: 'Moyenne', short: 'A' },
    { key: 'large', label: 'Grande', short: 'A' },
  ]

  return (
    <div>
      {/* Row principale — montre la valeur courante */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="text-size-options"
        className="w-full flex items-center gap-2 px-3 h-12 rounded-md text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <IconWrap>
          <Type className="size-5" />
        </IconWrap>
        <span className="flex-1 text-sm font-medium text-foreground">Taille</span>
        {/* Valeur courante + chevron rotatif */}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {TEXT_SIZE_LABELS[value]}
          <ChevronRight
            className={[
              'size-4 transition-transform duration-200',
              expanded ? 'rotate-90' : '',
            ].join(' ')}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Boutons radio inline — visibles quand expanded */}
      {expanded && (
        <div
          id="text-size-options"
          role="group"
          aria-label="Taille du texte"
          className="flex gap-2 px-3 pb-2"
        >
          {options.map(({ key, label, short }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value === key}
              title={label}
              onClick={() => {
                onChange(key)
                setExpanded(false)
              }}
              className={[
                'flex-1 flex items-center justify-center h-9 rounded-md border font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                value === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-foreground/40',
                key === 'small' ? 'text-xs' : key === 'large' ? 'text-base' : 'text-sm',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {short}
              <span className="sr-only"> — {label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Row "Contraste renforcé" — toggle switch.
 * Dimensions Figma : container 40×20px, thumb 16px.
 */
function ContrastToggleRow({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-2 px-3 h-12 rounded-md text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <IconWrap>
        <Eye className="size-5" />
      </IconWrap>
      <span className="flex-1 text-sm font-medium text-foreground">Contraste renforcé</span>

      {/* Toggle visuel — 40×20px, thumb 16px (Figma spec) */}
      <div
        aria-hidden="true"
        className={[
          'relative shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
        style={{ width: '40px', height: '20px' }}
      >
        <div
          className={[
            'absolute top-[2px] size-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[21px]' : 'translate-x-[2px]',
          ].join(' ')}
        />
      </div>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ProfileMenuProps {
  onClose: () => void
}

export function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { profile, signOut } = useAuth()
  const { textSize, setTextSize, highContrast, setHighContrast } = useAccessibility()

  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // ── Fermeture sur Escape ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showLogoutModal) onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose, showLogoutModal])

  // ── Fermeture sur clic extérieur (desktop) ────────────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    // Délai pour éviter que le clic d'ouverture ne ferme immédiatement
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  // ── Déconnexion ───────────────────────────────────────────────────────────
  async function handleLogoutConfirm() {
    setIsLoggingOut(true)
    await signOut()
    setIsLoggingOut(false)
    setShowLogoutModal(false)
    onClose()
  }

  // ── Contenu partagé dropdown + bottom sheet ───────────────────────────────
  const menuContent = (
    <>
      {/* ── Entête profil ─────────────────────────────────────────────────── */}
      {/* Avatar : 56px outer (border + 4px padding) selon Figma spec */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="size-14 rounded-full border border-border bg-[var(--color-bg-primary)] p-1 shrink-0">
          <div className="size-full rounded-full overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username ?? 'Profil'}
                className="size-full object-cover"
              />
            ) : (
              <img src={hermineIcon} alt="" className="size-full object-cover" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {profile?.username ?? 'Utilisateur'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{profile?.username ?? 'utilisateur'}
          </p>
        </div>
      </div>

      <Divider />

      {/* ── Blocs de sections — gap-4 entre chaque section (Figma : 16px) ─── */}
      <div className="px-3 py-4 flex flex-col gap-4">
        {/* ── Section Principal ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <SectionLabel label="Principal" />
          <div>
            {/* Mon profil — feature gated (page profil en construction) */}
            <MenuItem icon={<User className="size-5" />} label="Mon profil" disabled />
            {/* Paramètres — feature gated (page globale en cours de construction) */}
            <MenuItem icon={<Settings className="size-5" />} label="Paramètres" disabled />
          </div>
        </div>

        {/* ── Section Thème (Figma : avant Accessibilité) ───────────────── */}
        <div className="flex flex-col gap-2">
          <SectionLabel label="Thème" />
          <div>
            {/* Apparence — feature gated (dark mode non implémenté) */}
            <MenuItem icon={<Palette className="size-5" />} label="Apparence" disabled />
          </div>
        </div>

        {/* ── Section Accessibilité ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <SectionLabel label="Accessibilité" />
          <div>
            {/* Taille du texte — FONCTIONNEL : row expandable */}
            <TextSizeRow value={textSize} onChange={setTextSize} />
            {/* Contraste renforcé — FONCTIONNEL : toggle */}
            <ContrastToggleRow checked={highContrast} onChange={setHighContrast} />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Déconnexion + version ─────────────────────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-1">
        <MenuItem
          icon={<LogOut className="size-5" />}
          label="Déconnexion"
          onClick={() => setShowLogoutModal(true)}
          danger
        />
        {/* Version dynamique — "App version X.X.X" (Figma spec, sans icône) */}
        <p className="px-1 py-1 text-xs text-muted-foreground/60">App version {__APP_VERSION__}</p>
      </div>
    </>
  )

  return (
    <>
      {/* Backdrop mobile uniquement */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Desktop : dropdown absolue (positionnée par le parent relative) */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu profil"
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[288px] bg-[var(--color-bg-primary)] border border-border rounded-lg shadow-xl z-50 overflow-hidden"
      >
        {menuContent}
      </div>

      {/* Mobile : bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu profil"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-[var(--color-bg-primary)] border-t border-border rounded-t-2xl shadow-xl overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {menuContent}
        <div className="h-safe-bottom h-4" aria-hidden="true" />
      </div>

      {/* Modal de déconnexion saisonnière */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
          isLoading={isLoggingOut}
        />
      )}
    </>
  )
}
