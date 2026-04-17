/**
 * ProfileMenu — Menu déroulant du profil utilisateur
 * ====================================================
 * Sections :
 *   - Entête       : avatar + username + @handle
 *   - Principal    : Mon profil (mis en avant teal) | Paramètres (feature-gated)
 *   - Accessibilité : Taille du texte (Petit/Moyen/Grand) | Contraste renforcé | Thème (feature-gated)
 *   - Déconnexion  : ouvre LogoutModal avec message saisonnier
 *   - Version      : dynamique depuis package.json via __APP_VERSION__
 *
 * Responsive :
 *   - Desktop : dropdown absolue ancrée au bouton profil (parent relative)
 *   - Mobile  : bottom sheet avec handle bar et backdrop
 *
 * Accessibilité :
 *   - role="dialog" + aria-modal + aria-label
 *   - Escape pour fermer, clic backdrop ferme
 *   - aria-pressed sur les options radio, aria-checked sur les toggles
 *
 * Feature gating :
 *   - Items marqués "coming soon" : badge visible, non cliquables, aria-disabled
 *   - Aucune navigation vers un écran vide
 *
 * TODO [BACKEND] — synchroniser textSize / highContrast avec profiles.preferences
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, Type, Eye, LogOut, Palette, Lock } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useAuth } from '@/contexts/AuthContext'
import { useAccessibility, type TextSize } from '@/contexts/AccessibilityContext'
import { LogoutModal } from './LogoutModal'

// ─── Sous-composants ─────────────────────────────────────────────────────────

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

/** Badge "Bientôt" pour les features non disponibles */
function SoonBadge() {
  return (
    <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
      Bientôt
    </span>
  )
}

/** Ligne de menu — navigation ou action */
function MenuItem({
  icon,
  label,
  onClick,
  href,
  highlighted = false,
  danger = false,
  disabled = false,
}: {
  icon?: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  highlighted?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  const baseClass = [
    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
    highlighted && !disabled ? 'bg-teal-light/20 hover:bg-teal-light/30' : '',
    !highlighted && !disabled ? 'hover:bg-muted/30' : '',
    danger ? 'text-[var(--color-error-action)]' : 'text-foreground',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ')

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
    </>
  )

  if (disabled) {
    return (
      <div className={baseClass} aria-disabled="true">
        {content}
        <SoonBadge />
      </div>
    )
  }

  if (href) {
    return (
      <Link to={href} className={baseClass} onClick={onClick}>
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

/** Sélecteur 3 options taille du texte (Petit / Moyen / Grand) */
function TextSizeSelector({
  value,
  onChange,
}: {
  value: TextSize
  onChange: (v: TextSize) => void
}) {
  const options: { key: TextSize; label: string; short: string }[] = [
    { key: 'small', label: 'Petit', short: 'A' },
    { key: 'medium', label: 'Moyen', short: 'A' },
    { key: 'large', label: 'Grand', short: 'A' },
  ]

  return (
    <div className="px-4 py-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          <Type className="size-4" />
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">Taille du texte</span>
      </div>

      {/* Boutons radio inline */}
      <div role="group" aria-label="Taille du texte" className="flex gap-2 ml-6">
        {options.map(({ key, label, short }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(key)}
            title={label}
            className={[
              'flex-1 flex items-center justify-center h-9 rounded-lg border text-sm font-bold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              value === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-foreground border-border hover:border-foreground/40',
              key === 'small' ? 'text-xs' : '',
              key === 'large' ? 'text-base' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {short}
            <span className="sr-only"> — {label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Toggle on/off (contraste renforcé) */
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
        aria-hidden="true"
        className={[
          'relative shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
        style={{ width: '40px', height: '22px' }}
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
      {/* ── Entête profil ──────────────────────────────────────────────────── */}
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

      {/* ── Section Principal ───────────────────────────────────────────────── */}
      <SectionLabel label="Principal" />

      <MenuItem
        icon={<User className="size-4" />}
        label="Mon profil"
        href={`/profile/${profile?.username ?? ''}`}
        highlighted
        onClick={onClose}
      />

      {/* Paramètres — feature gated (page globale en cours de construction) */}
      <MenuItem icon={<Settings className="size-4" />} label="Paramètres" disabled />

      <Divider />

      {/* ── Section Accessibilité ───────────────────────────────────────────── */}
      <SectionLabel label="Accessibilité" />

      {/* Taille du texte — FONCTIONNEL */}
      <TextSizeSelector value={textSize} onChange={setTextSize} />

      {/* Contraste renforcé — FONCTIONNEL */}
      <ToggleItem
        icon={<Eye className="size-4" />}
        label="Contraste renforcé"
        checked={highContrast}
        onChange={setHighContrast}
      />

      {/* Thème — feature gated (dark mode non implémenté) */}
      <div
        className="w-full flex items-center gap-3 px-4 py-3 opacity-50 cursor-not-allowed"
        aria-disabled="true"
      >
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          <Palette className="size-4" />
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">Thème</span>
        <SoonBadge />
      </div>

      <Divider />

      {/* ── Déconnexion ─────────────────────────────────────────────────────── */}
      <MenuItem
        icon={<LogOut className="size-4" />}
        label="Déconnexion"
        onClick={() => setShowLogoutModal(true)}
        danger
      />

      {/* ── Version dynamique ─────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground/50 py-3 flex items-center justify-center gap-1">
        <Lock className="size-3" aria-hidden="true" />v{__APP_VERSION__}
      </p>
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
        className="hidden md:block absolute top-[calc(100%+8px)] right-0 w-[288px] bg-[var(--color-bg-primary)] border border-border rounded-xl shadow-xl z-50 overflow-hidden"
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
