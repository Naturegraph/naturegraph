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
 * Style boutons :
 *   - Icônes seules et pills secondaires → btn-press btn-press-secondary rounded-full
 *   - Contribuer (CTA primaire)          → btn-press btn-press-primary  rounded-full
 *   Les effets hover/active/focus-visible sont gérés par _buttons.scss (pas d'inline custom).
 */

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Bell,
  Plus,
  MapPin,
  Locate,
  ChevronDown,
  User,
  LayoutList,
  LayoutGrid,
  Filter,
  Flame,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useUserStreak } from '@/hooks/useStats'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useLocation } from '@/contexts/LocationContext'
import { SearchPanel } from './SearchPanel'
import { NotificationsPanel } from './NotificationsPanel'
import { ContributeModal } from './ContributeModal'
import { LocationModal } from './LocationModal'
import { ProfileMenu } from './ProfileMenu'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
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
  /**
   * Rappelé quand l'utilisateur choisit un type de contribution dans le menu desktop.
   * Si fourni, ouvre le panneau inline (panel overlay) plutôt que de naviguer.
   */
  onContributeTypeSelect?: (type: string) => void
}

// ─── Classes réutilisables ────────────────────────────────────────────────────

/** Bouton icône seule (48×48) — style secondaire avec effet 3D press */
const btnIcon =
  'btn-press btn-press-secondary flex items-center justify-center size-12 rounded-full'

/** Bouton pill avec label (h-48) — style secondaire avec effet 3D press */
const btnPill =
  'btn-press btn-press-secondary flex gap-3 h-12 items-center justify-center px-6 rounded-full'

/** Bouton CTA primaire (h-48) — style primaire avec effet 3D press */
const btnPrimary =
  'btn-press btn-press-primary bg-primary flex items-center justify-center gap-3 h-12 rounded-full text-primary-foreground'

// ─── Composant ───────────────────────────────────────────────────────────────

export function HomeNavbar({
  feedViewMode = 'list',
  onToggleFeedView,
  onOpenFeedFilters,
  feedHasActiveFilters = false,
  onContributeTypeSelect,
}: HomeNavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()

  // Streak consécutif (jours d'observation) — calculé depuis Supabase
  const { data: streakDays } = useUserStreak(profile?.id)

  // Localisation partagée via LocationContext (pas de géoloc locale ici)
  const { locationLabel } = useLocation()

  // Compteur de notifications non lues — alimente le badge
  const { data: unreadCount } = useUnreadCount(profile?.id)

  // ── États des panels / modals ─────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  // SettingsPanel ouvert depuis le ProfileMenu (item "Paramètres") — son
  // state vit dans HomeNavbar (et non ProfileMenu) pour survivre à la
  // fermeture du ProfileMenu : on ferme le menu profil ET on ouvre les
  // paramètres en parallèle, sans superposition visuelle.
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

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
          <div className="w-full xl:max-w-[1440px] mx-auto flex items-center justify-between md:px-6 px-4 h-full">
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
                  className={btnIcon}
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

                {/* Filtres — badge rouge si filtres actifs */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={onOpenFeedFilters}
                    className={btnIcon}
                    aria-label={t('home.feed.filterObs')}
                  >
                    <Filter className="size-5 text-foreground" aria-hidden="true" />
                  </button>
                  {feedHasActiveFilters && (
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-2 size-2 rounded-full bg-primary pointer-events-none"
                    />
                  )}
                </div>

                {/* Bell — connecté seulement */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => setShowNotifications((v) => !v)}
                      className={btnIcon}
                      aria-label={t('home.navbar.notifications')}
                      aria-expanded={showNotifications}
                      aria-haspopup="dialog"
                    >
                      <Bell className="size-5 text-foreground" aria-hidden="true" />
                    </button>
                    {(unreadCount ?? 0) > 0 && (
                      <span
                        aria-label={`${unreadCount} notifications non lues`}
                        className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none pointer-events-none"
                      >
                        {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                      </span>
                    )}
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
                {/* ── Localisation — pill avec label de ville ou invite ── */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal((v) => !v)}
                    aria-expanded={showLocationModal}
                    aria-haspopup="dialog"
                    aria-label={
                      locationLabel ? t('home.navbar.changeLocation') : t('home.navbar.setLocation')
                    }
                    className={btnPill}
                  >
                    {locationLabel ? (
                      <MapPin className="size-5 text-foreground shrink-0" aria-hidden="true" />
                    ) : (
                      <Locate className="size-5 text-foreground shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-foreground text-nowrap text-sm">
                      {/* ?? ne couvre pas '' (string vide) — || est nécessaire ici */}
                      {locationLabel || t('home.navbar.setLocation')}
                    </span>
                  </button>

                  {showLocationModal && (
                    <LocationModal onClose={() => setShowLocationModal(false)} />
                  )}
                </div>

                {/* ── Recherche ─────────────────────────────────────────── */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSearch((v) => !v)}
                    className={btnIcon}
                    aria-label={t('home.navbar.search')}
                    aria-expanded={showSearch}
                    aria-haspopup="dialog"
                  >
                    <Search className="size-5 text-foreground" aria-hidden="true" />
                  </button>
                  {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
                </div>

                {/* ── Notifications — connecté seulement ───────────────── */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => setShowNotifications((v) => !v)}
                      className={btnIcon}
                      aria-label={t('home.navbar.notifications')}
                      aria-expanded={showNotifications}
                      aria-haspopup="dialog"
                    >
                      <Bell className="size-5 text-foreground" aria-hidden="true" />
                    </button>
                    {(unreadCount ?? 0) > 0 && (
                      <span
                        aria-label={`${unreadCount} notifications non lues`}
                        className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none pointer-events-none"
                      >
                        {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                      </span>
                    )}
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
                  {/* XL Desktop : label + icône */}
                  <button
                    type="button"
                    onClick={handleContribute}
                    className={[btnPrimary, 'hidden xl:flex px-6'].join(' ')}
                    aria-expanded={showContribute}
                    aria-haspopup={isAuthenticated ? 'dialog' : undefined}
                  >
                    <Plus className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t('home.navbar.contribute')}</span>
                  </button>

                  {/* Tablet : icône seule */}
                  <button
                    type="button"
                    onClick={handleContribute}
                    className={[btnPrimary, 'xl:hidden size-12'].join(' ')}
                    aria-label={t('home.navbar.contribute')}
                    aria-expanded={showContribute}
                    aria-haspopup={isAuthenticated ? 'dialog' : undefined}
                  >
                    <Plus className="size-5" aria-hidden="true" />
                  </button>

                  {showContribute && isAuthenticated && (
                    <ContributeModal
                      onClose={() => setShowContribute(false)}
                      onTypeSelect={onContributeTypeSelect}
                    />
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
                          <img
                            src={hermineIcon}
                            alt={profile?.username ?? 'Profil'}
                            className="size-full object-cover"
                          />
                        )}
                      </div>

                      {/* Username + streak — XL Desktop uniquement */}
                      <div className="hidden xl:flex flex-col gap-0.5 items-start">
                        <span className="text-foreground text-sm text-nowrap leading-tight font-bold">
                          {profile?.username}
                        </span>
                        {/* Streak — affiché même à 0 pour inciter à l'engagement quotidien */}
                        <span className="text-xs text-nowrap leading-tight flex items-center gap-0.5 text-[var(--color-warning)]">
                          <Flame className="size-3 shrink-0" aria-hidden="true" />
                          {streakDays ?? 0} {t('home.profile.days')}
                        </span>
                      </div>
                      <ChevronDown
                        className={[
                          'hidden xl:block size-4 text-muted-foreground transition-transform duration-200',
                          showProfileMenu ? 'rotate-180' : '',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                    </button>

                    {showProfileMenu && (
                      <ProfileMenu
                        onClose={() => setShowProfileMenu(false)}
                        onOpenSettings={() => {
                          // Ferme le menu profil ET ouvre le panel settings.
                          // Le state `showSettingsPanel` vit dans HomeNavbar
                          // pour survivre au démontage du ProfileMenu.
                          setShowProfileMenu(false)
                          setShowSettingsPanel(true)
                        }}
                      />
                    )}
                  </div>
                ) : (
                  /* Lien "Se connecter" — style secondaire pill */
                  <Link to="/login" className={[btnPill, 'text-foreground text-sm'].join(' ')}>
                    <User className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t('home.navbar.login')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Settings panel global — ouvert depuis le ProfileMenu (item Paramètres),
          accessible depuis n'importe quelle page via la navbar. */}
      {showSettingsPanel && <SettingsPanel onClose={() => setShowSettingsPanel(false)} />}
    </>
  )
}
