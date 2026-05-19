/**
 * MobileNavDrawer — Drawer "Menu" déclenché par l'icône burger de la MobileBottomNav.
 *
 * Objectif : exposer sur mobile le contenu jusqu'ici réservé aux sidebars desktop
 * (GuestSidebar / ProfileSidebar) + une navigation rapide vers les sections clés.
 * Sans ce drawer, le user mobile n'a aucun accès à : suggestions de migrateurs,
 * stats personnelles, objectif semaine, localisation, raccourcis légaux.
 *
 * Structure (bottom sheet plein écran ≈ 88vh) :
 *   1. Handle bar + header "Menu" + X
 *   2. Section "Naviguer" : Accueil, Recherche, Notifications, Mon profil
 *   3. Section "Localisation" : pill ouvrant LocationModal (si dispo)
 *   4. Section "Mon espace" : ProfileSidebar (connecté) OU GuestSidebar (invité)
 *   5. Footer : liens légaux (CGU, Confidentialité, Aide, Contact) + version
 *
 * Positionnement : sheet au-dessus de la MobileBottomNav (h-14 + safe-area).
 * z-[60] passe au-dessus de la navbar (z-50). Backdrop semi-transparent ferme
 * au clic. Escape ferme. Focus piégé sur le bouton close à l'ouverture.
 *
 * Aucune nouvelle dépendance. Réutilise 100 % du Design System existant.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation as useRouterLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  House,
  Search,
  Bell,
  User,
  MapPin,
  Locate,
  FileText,
  ShieldCheck,
  HelpCircle,
  Mail,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useUnreadCount } from '@/hooks/useNotifications'
import { GuestSidebar } from './GuestSidebar'
import { ProfileSidebar } from './ProfileSidebar'
import { LocationModal } from './LocationModal'

interface MobileNavDrawerProps {
  /** Callback fermeture du drawer (mis à jour par le parent). */
  onClose: () => void
  /** Callback optionnel pour ouvrir le panneau de recherche depuis le drawer. */
  onSearchClick?: () => void
}

/**
 * Item de navigation rapide — bouton ou lien avec icône + label + chevron implicite.
 * Style aligné sur ProfileMenu (item h-12 px-3, hover bg-muted/30).
 */
function NavItem({
  icon,
  label,
  to,
  onClick,
  badge,
  active = false,
}: {
  icon: React.ReactNode
  label: string
  to?: string
  onClick?: () => void
  badge?: number
  active?: boolean
}) {
  const cls = [
    'w-full flex items-center gap-3 px-3 h-12 rounded-md text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
    active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/30 text-foreground',
  ].join(' ')

  const content = (
    <>
      <span
        className={[
          'shrink-0 flex items-center justify-center size-9 rounded-full',
          active ? 'text-primary' : 'text-muted-foreground',
        ].join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span
          className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none"
          aria-label={`${badge} non lu${badge > 1 ? 's' : ''}`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

/**
 * Label de section — caption discret pour structurer le drawer.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground tracking-[0.04em]">{children}</p>
  )
}

export function MobileNavDrawer({ onClose, onSearchClick }: MobileNavDrawerProps) {
  const { t } = useTranslation()
  const { isAuthenticated, profile } = useAuth()
  const { locationLabel } = useLocation()
  const { data: unreadCount } = useUnreadCount(profile?.id)
  const routerLocation = useRouterLocation()

  // Modal localisation déclenchée depuis le drawer (state local).
  const [showLocationModal, setShowLocationModal] = useState(false)

  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Focus initial sur le bouton fermer (a11y modal).
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Escape ferme le drawer.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  /** Helper pour cibler l'item actif selon l'URL courante. */
  function isActive(path: string): boolean {
    return routerLocation.pathname === path || routerLocation.pathname.startsWith(path + '/')
  }

  /** Le drawer doit se fermer après chaque navigation interne pour libérer l'écran. */
  function handleNavigate() {
    onClose()
  }

  return (
    <>
      {/* Backdrop — clique pour fermer */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[55]"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Bottom sheet — positionné au-dessus de la MobileBottomNav (h-14 + safe-area).
          z-[60] > navbar (z-50) pour passer devant en cas de chevauchement. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu', { defaultValue: 'Menu' })}
        className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-cream-lighter border-t border-border rounded-t-2xl shadow-xl flex flex-col max-h-[95vh] pb-[calc(3.5rem+env(safe-area-inset-bottom))]"
      >
        {/* Handle bar (drag indicator visuel) */}
        <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header — Titre + close */}
        <div className="flex items-center justify-between px-5 py-2 shrink-0">
          <h2 className="font-heading text-lg font-bold text-foreground">
            {t('nav.menu', { defaultValue: 'Menu' })}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-3 pb-4">
          {/* ── 1. Naviguer ─────────────────────────────────────────────── */}
          <SectionLabel>{t('nav.navigate', { defaultValue: 'Naviguer' })}</SectionLabel>
          <div className="flex flex-col gap-1 mb-4">
            <NavItem
              icon={<House className="size-5" />}
              label={t('nav.home')}
              to="/home"
              active={isActive('/home')}
              onClick={handleNavigate}
            />
            <NavItem
              icon={<Search className="size-5" />}
              label={t('common.search', { defaultValue: 'Recherche' })}
              onClick={() => {
                onClose()
                onSearchClick?.()
              }}
            />
            {isAuthenticated && (
              <NavItem
                icon={<Bell className="size-5" />}
                label={t('home.navbar.notifications')}
                to="/notifications"
                badge={unreadCount ?? 0}
                onClick={handleNavigate}
              />
            )}
            {isAuthenticated && (
              <NavItem
                icon={<User className="size-5" />}
                label={t('nav.profile')}
                to="/profile"
                active={isActive('/profile')}
                onClick={handleNavigate}
              />
            )}
          </div>

          {/* ── 2. Localisation ─────────────────────────────────────────── */}
          <SectionLabel>
            {t('home.navbar.locationSection', { defaultValue: 'Localisation' })}
          </SectionLabel>
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="w-full flex items-center gap-3 px-3 h-12 rounded-md text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary mb-4"
          >
            <span className="shrink-0 flex items-center justify-center size-9 rounded-full text-muted-foreground">
              {locationLabel ? (
                <MapPin className="size-5" aria-hidden="true" />
              ) : (
                <Locate className="size-5" aria-hidden="true" />
              )}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {locationLabel || t('home.navbar.setLocation')}
            </span>
          </button>

          {/* ── 3. Mon espace — sidebar desktop transposée ──────────────── */}
          <SectionLabel>
            {isAuthenticated
              ? t('home.sidebar.mySpace', { defaultValue: 'Mon espace' })
              : t('home.sidebar.discover', { defaultValue: 'Découvrir' })}
          </SectionLabel>
          <div className="px-1 mb-4">{isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}</div>

          {/* ── 4. Footer légal & support ───────────────────────────────── */}
          <SectionLabel>{t('footer.support', { defaultValue: 'Aide & infos' })}</SectionLabel>
          <div className="flex flex-col gap-1 mb-2">
            <NavItem
              icon={<HelpCircle className="size-5" />}
              label={t('footer.help', { defaultValue: 'Aide & support' })}
              to="/contact"
              onClick={handleNavigate}
            />
            <NavItem
              icon={<Mail className="size-5" />}
              label={t('footer.contact', { defaultValue: 'Contact' })}
              to="/contact"
              onClick={handleNavigate}
            />
            <NavItem
              icon={<FileText className="size-5" />}
              label={t('footer.legal', { defaultValue: 'Mentions légales' })}
              to="/legal"
              onClick={handleNavigate}
            />
            <NavItem
              icon={<ShieldCheck className="size-5" />}
              label={t('footer.privacy', { defaultValue: 'Confidentialité' })}
              to="/privacy"
              onClick={handleNavigate}
            />
          </div>

          {/* Version */}
          <p className="text-xs text-muted-foreground/60 text-center pt-2 pb-1">
            App version {__APP_VERSION__}
          </p>
        </div>
      </aside>

      {/* Modal localisation — rendue par le drawer pour vivre tant qu'il est ouvert.
          Note : LocationModal a son propre overlay z-index, donc elle s'affiche
          correctement par-dessus le drawer. */}
      {showLocationModal && <LocationModal onClose={() => setShowLocationModal(false)} />}
    </>
  )
}
