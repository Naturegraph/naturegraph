/**
 * HomeNavbar — Barre de navigation de la page Home
 *
 * Comportements :
 *   - Logo            → /home
 *   - Localisation    → ouvre LocationModal (label lu depuis LocationContext)
 *   - Recherche       → ouvre SearchPanel (md+ uniquement ; mobile = bottom nav)
 *   - Notifications   → ouvre NotificationsPanel (si connecté)
 *   - Contribuer      → ouvre ContributeModal (md+ uniquement ; mobile = FAB bottom nav)
 *   - Profil          → ouvre ProfileMenu (md+ uniquement ; mobile = bottom nav avatar)
 *
 * Responsive :
 *   - XL Desktop (≥1280px) : localisation + recherche + bell + contribuer (label) + avatar + username + streak + chevron
 *   - Desktop/Tablet (≥768px) : localisation + recherche + bell + contribuer (icône) + avatar
 *   - Mobile (<768px) : logo + vue grille + filtre + bell — le reste est dans MobileBottomNav
 *
 * Sur mobile, les callbacks feedViewMode / onToggleFeedView / onOpenFeedFilters
 * permettent de contrôler le feed depuis la navbar (état levé dans Home.tsx).
 *
 * Accessibilité : aria-labels, focus-visible, skip link cible #main-content.
 */

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Bell,
  Plus,
  MapPin,
  ChevronDown,
  User,
  LayoutList,
  LayoutGrid,
  Filter,
  Flame,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { SearchPanel } from './SearchPanel'
import { NotificationsPanel } from './NotificationsPanel'
import { ContributeModal } from './ContributeModal'
import { LocationModal } from './LocationModal'
import { ProfileMenu } from './ProfileMenu'
import logoColor from '@/assets/logos/logo-wordmark-color.svg'

// ─── Props ───────────────────────────────────────────────────────────────────

interface HomeNavbarProps {
  /** Vue liste/grille du feed — contrôlée depuis Home.tsx, affichée sur mobile */
  feedViewMode?: 'list' | 'grid'
  /** Toggle vue liste ↔ grille depuis la navbar mobile */
  onToggleFeedView?: () => void
  /** Ouvre le panel filtres depuis la navbar mobile */
  onOpenFeedFilters?: () => void
  /** Affiche le badge sur l'icône filtre si des filtres actifs */
  feedHasActiveFilters?: boolean
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function HomeNavbar({
  feedViewMode = 'list',
  onToggleFeedView,
  onOpenFeedFilters,
  feedHasActiveFilters = false,
}: HomeNavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()

  // Streak consécutif (jours d'observation) — TODO [BACKEND] profile.streak_days
  // Même valeur que ProfileSidebar en attendant la donnée réelle
  const STREAK_DAYS = 14

  // Localisation partagée via LocationContext (pas de géoloc locale ici)
  const { locationLabel } = useLocation()

  // ── États des panels / modals ─────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Refs pour ancrer les dropdowns
  const notifBtnRef = useRef<HTMLButtonElement>(null)

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleContribute() {
    if (!isAuthenticated) {
      navigate('/signup')
    } else {
      setShowContribute((v) => !v)
    }
  }

  function handleProfileClick() {
    if (isAuthenticated) {
      setShowProfileMenu((v) => !v)
    }
  }

  return (
    <>
      <header className="bg-cream-lighter h-[72px] sticky top-0 z-40 shrink-0 w-full">
        {/* Séparateur bas */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px bg-border pointer-events-none"
        />

        <div className="flex items-center size-full">
          <div className="w-full xl:max-w-[1728px] mx-auto flex items-center justify-between md:px-6 px-4 h-full">
            {/* Logo → /home */}
            <Link
              to="/home"
              aria-label="Naturegraph — Retour au fil d'actualité"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              <img src={logoColor} alt="Naturegraph" className="h-8 w-auto" />
            </Link>

            {/* Actions droite */}
            <div className="flex md:gap-4 gap-3 items-center">
              {/* ════════════════════════════════════════════════════════
                  MOBILE (<768px) — contrôles du feed + bell
                  (search, contribute et profil sont dans MobileBottomNav)
                  ════════════════════════════════════════════════════════ */}
              <div className="flex md:hidden items-center gap-2">
                {/* Vue liste/grille */}
                <button
                  type="button"
                  onClick={onToggleFeedView}
                  className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={
                    feedViewMode === 'list' ? t('home.feed.gridView') : t('home.feed.listView')
                  }
                  aria-pressed={feedViewMode === 'grid'}
                >
                  {feedViewMode === 'list' ? (
                    <LayoutGrid className="size-5 text-foreground" aria-hidden="true" />
                  ) : (
                    <LayoutList className="size-5 text-foreground" aria-hidden="true" />
                  )}
                </button>

                {/* Filtres — badge si filtres actifs */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={onOpenFeedFilters}
                    className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={t('home.feed.filterObs')}
                  >
                    <Filter className="size-5 text-foreground" aria-hidden="true" />
                    {feedHasActiveFilters && (
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 size-2 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </div>

                {/* Bell — connecté seulement */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => setShowNotifications((v) => !v)}
                      className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={t('home.navbar.notifications')}
                      aria-expanded={showNotifications}
                      aria-haspopup="dialog"
                    >
                      <Bell className="size-5 text-foreground" aria-hidden="true" />
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 size-2 rounded-full bg-primary"
                      />
                    </button>
                    {showNotifications && (
                      <NotificationsPanel
                        anchorRef={notifBtnRef}
                        onClose={() => setShowNotifications(false)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════════════════
                  TABLET + DESKTOP (≥768px)
                  ════════════════════════════════════════════════════════ */}
              <div className="hidden md:flex items-center md:gap-4 gap-3">
                {/* ── Localisation — icône MapPin (pin) ─────────────────── */}
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="flex gap-3 h-12 items-center justify-center px-6 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t('home.navbar.changeLocation')}
                >
                  <MapPin className="size-5 text-foreground shrink-0" aria-hidden="true" />
                  <span className="text-foreground text-nowrap text-sm">{locationLabel}</span>
                </button>

                {/* ── Recherche ─────────────────────────────────────────── */}
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t('home.navbar.search')}
                  aria-expanded={showSearch}
                >
                  <Search className="size-5 text-foreground" aria-hidden="true" />
                </button>

                {/* ── Notifications — connecté seulement ───────────────── */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => setShowNotifications((v) => !v)}
                      className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={t('home.navbar.notifications')}
                      aria-expanded={showNotifications}
                      aria-haspopup="dialog"
                    >
                      <Bell className="size-5 text-foreground" aria-hidden="true" />
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 size-2 rounded-full bg-primary"
                      />
                    </button>
                    {showNotifications && (
                      <NotificationsPanel
                        anchorRef={notifBtnRef}
                        onClose={() => setShowNotifications(false)}
                      />
                    )}
                  </div>
                )}

                {/* ── Contribuer ───────────────────────────────────────── */}
                <div className="relative">
                  {/* Bouton XL : label + icône */}
                  <div className="hidden xl:flex">
                    <button
                      type="button"
                      onClick={handleContribute}
                      className="bg-primary flex gap-3 h-12 items-center justify-center px-6 rounded-button text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:scale-[0.98]"
                      aria-expanded={showContribute}
                      aria-haspopup={isAuthenticated ? 'dialog' : undefined}
                    >
                      <Plus className="size-5 shrink-0" aria-hidden="true" />
                      <span>{t('home.navbar.contribute')}</span>
                    </button>
                  </div>

                  {/* Bouton Tablet : icône seule */}
                  <div className="xl:hidden flex">
                    <button
                      type="button"
                      onClick={handleContribute}
                      className="bg-primary flex items-center justify-center size-12 rounded-button text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={t('home.navbar.contribute')}
                      aria-expanded={showContribute}
                      aria-haspopup={isAuthenticated ? 'dialog' : undefined}
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </button>
                  </div>

                  {showContribute && isAuthenticated && (
                    <ContributeModal onClose={() => setShowContribute(false)} />
                  )}
                </div>

                {/* ── Profil ou Se connecter ───────────────────────────── */}
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="flex gap-3 h-12 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
                      aria-label={t('home.navbar.profileMenu')}
                      aria-expanded={showProfileMenu}
                      aria-haspopup="dialog"
                    >
                      {/* Avatar */}
                      <div className="size-12 rounded-full overflow-hidden border border-border shrink-0">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username ?? 'Profil'}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full bg-primary-light flex items-center justify-center">
                            <User className="size-5 text-primary" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Username + streak — XL Desktop uniquement */}
                      <div className="hidden xl:flex flex-col gap-0.5 items-start">
                        <span className="text-foreground text-sm text-nowrap leading-tight font-medium">
                          {profile?.username}
                        </span>
                        {/* Streak (jours consécutifs) — TODO [BACKEND] profile.streak_days */}
                        <span className="text-xs text-nowrap leading-tight flex items-center gap-0.5 text-[var(--color-warning)]">
                          <Flame className="size-3 shrink-0" aria-hidden="true" />
                          {STREAK_DAYS} jours
                        </span>
                      </div>
                      <ChevronDown
                        className="hidden xl:block size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>

                    {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="flex gap-2 h-12 items-center justify-center px-6 rounded-button border border-border hover:border-foreground/40 transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-sm"
                  >
                    <User className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t('home.navbar.login')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Panels montés en dehors du header pour éviter les z-index conflicts ── */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
      {showLocationModal && <LocationModal onClose={() => setShowLocationModal(false)} />}
    </>
  )
}
