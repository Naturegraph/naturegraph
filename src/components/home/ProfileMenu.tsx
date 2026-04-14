/**
 * ProfileMenu — Menu déroulant du profil utilisateur
 *
 * Sections :
 *   - Entête   : avatar + username + @handle
 *   - Principal : Mon profil (mis en avant teal), Paramètres
 *   - Thème    : Apparence (Clair / Sombre)
 *   - Accessibilité : Taille du texte (Petite / Moyenne / Grande), Contraste renforcé
 *   - Déconnexion (rouge)
 *   - Version de l'app
 *
 * Responsive :
 *   - Desktop : dropdown absolue ancrée au bouton profil (parent relative)
 *   - Mobile  : bottom sheet avec handle bar et backdrop
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop (mobile) ferme
 *   - aria-checked sur les options de type radio/toggle
 *
 * TODO [BACKEND] — refreshProfile() après modification des préférences
 * TODO [BACKEND] — Stocker textSize / highContrast dans profile.preferences (Supabase)
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, Type, Eye, LogOut } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types accessibilité ──────────────────────────────────────────────────────

type TextSize = 'small' | 'medium' | 'large'
const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: 'Petite',
  medium: 'Moyenne',
  large: 'Grande',
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/** Ligne de menu cliquable (navigation ou action) */
function MenuItem({
  icon,
  label,
  valueLabel,
  onClick,
  href,
  highlighted = false,
  danger = false,
}: {
  icon?: React.ReactNode
  label: string
  valueLabel?: string
  onClick?: () => void
  href?: string
  highlighted?: boolean
  danger?: boolean
}) {
  const baseClass = [
    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
    highlighted ? 'bg-teal-light/20 hover:bg-teal-light/30' : 'hover:bg-muted/30',
    danger ? 'text-[var(--color-error-action)]' : 'text-foreground',
  ].join(' ')

  const content = (
    <>
      {icon && (
        <span
          className={[
            'shrink-0',
            danger ? 'text-[var(--color-error-action)]' : 'text-muted-foreground',
          ].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span
        className={[
          'flex-1 text-sm font-medium',
          danger ? 'text-[var(--color-error-action)]' : '',
        ].join(' ')}
      >
        {label}
      </span>
      {valueLabel && <span className="text-xs text-muted-foreground shrink-0">{valueLabel}</span>}
    </>
  )

  if (href) {
    return (
      <Link to={href} className={baseClass}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  )
}

/** Ligne toggle (on/off) */
function ToggleItem({
  icon,
  label,
  checked,
  onChange,
}: {
  icon?: React.ReactNode
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      {icon && (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>

      {/* Toggle visuel */}
      <div
        className={[
          'relative w-10 h-5.5 rounded-full transition-colors shrink-0',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
        aria-hidden="true"
        style={{ height: '22px', width: '40px' }}
      >
        <div
          className={[
            'absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </div>
    </button>
  )
}

/** Séparateur de section avec label */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-4 pt-3 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
  )
}

/** Trait séparateur */
function Divider() {
  return <div className="h-px bg-border mx-4 my-1" aria-hidden="true" />
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ProfileMenuProps {
  onClose: () => void
}

export function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { profile, signOut } = useAuth()
  // Préférences accessibilité (état local en attendant le backend)
  const [textSize, setTextSize] = useState<TextSize>('medium')
  const [highContrast, setHighContrast] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fermer si clic en dehors (desktop)
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  /** Cycle : small → medium → large → small */
  function cycleTextSize() {
    const order: TextSize[] = ['small', 'medium', 'large']
    const next = order[(order.indexOf(textSize) + 1) % order.length]
    setTextSize(next)
  }

  async function handleSignOut() {
    onClose()
    await signOut()
  }

  /** Contenu partagé entre desktop dropdown et mobile bottom sheet */
  const menuContent = (
    <>
      {/* ── Entête profil ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="size-11 rounded-full overflow-hidden bg-primary-light shrink-0 flex items-center justify-center">
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
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {profile?.username ?? 'Utilisateur'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{profile?.username ?? 'utilisateur'}
          </p>
        </div>
      </div>

      {/* ── Section Principal ─────────────────────────────────────────────── */}
      <SectionLabel label="Principal" />

      <MenuItem
        icon={<User className="size-4" />}
        label="Mon profil"
        href={`/profile/${profile?.username ?? ''}`}
        highlighted
        onClick={onClose}
      />
      <MenuItem
        icon={<Settings className="size-4" />}
        label="Paramètres"
        href="/settings"
        onClick={onClose}
      />

      <Divider />

      {/* ── Section Accessibilité ─────────────────────────────────────────── */}
      <SectionLabel label="Accessibilité" />

      <MenuItem
        icon={<Type className="size-4" />}
        label="Taille du texte"
        valueLabel={TEXT_SIZE_LABELS[textSize]}
        onClick={cycleTextSize}
      />
      <ToggleItem
        icon={<Eye className="size-4" />}
        label="Contraste renforcé"
        checked={highContrast}
        onChange={setHighContrast}
      />

      <Divider />

      {/* ── Déconnexion ───────────────────────────────────────────────────── */}
      <MenuItem
        icon={<LogOut className="size-4" />}
        label="Déconnexion"
        onClick={handleSignOut}
        danger
      />

      {/* ── Version ───────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground/50 py-3">App version 0.0.1</p>
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
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[280px] bg-cream-lighter border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      >
        {menuContent}
      </div>

      {/* Mobile : bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu profil"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-cream-lighter border-t border-border rounded-t-2xl shadow-xl overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {menuContent}
        <div className="h-4" aria-hidden="true" />
      </div>
    </>
  )
}
