/**
 * HomeNavbar, Barre de navigation de la page Home
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
 *   - Mobile (<768px) : logo + vue grille + filtre + bell, le reste est dans MobileBottomNav
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
  Locate,
  ChevronDown,
  User,
  LayoutList,
  LayoutGrid,
  Filter,
  Flame,
  BarChart3,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ImagePresets } from '@/lib/supabaseImage'
import { useUserStreak } from '@/hooks/useStats'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useLocation } from '@/contexts/LocationContext'
// V1.1.4 NG-023 ext final : indique le filtre actif (espece ou categorie)
// directement dans le bouton recherche au lieu d un bandeau separe.
import { useSpecies } from '@/contexts/SpeciesContext'
import { SearchPanel } from './SearchPanel'
import { NotificationsPanel } from './NotificationsPanel'
import { ContributeModal } from './ContributeModal'
import { LocationModal } from './LocationModal'
import { ProfileMenu } from './ProfileMenu'
import { StatsSheet } from './StatsSheet'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { LogoWordmark } from '@/components/ui/LogoWordmark'

// ─── Props ───────────────────────────────────────────────────────────────────

interface HomeNavbarProps {
  /** Vue liste/grille du feed, contrôlée depuis Home.tsx, affichée sur mobile */
  feedViewMode?: 'list' | 'grid'
  /** Toggle vue liste ↔ grille depuis la navbar mobile */
  onToggleFeedView?: () => void
  /** Ouvre le panel filtres depuis la navbar mobile */
  onOpenFeedFilters?: () => void
  /**
   * V1.1.4 QA round 4 : nombre de filtres actifs (0..N) pour afficher un
   * vrai badge chiffre sur l icone entonnoir, coherent desktop/mobile.
   */
  feedActiveFiltersCount?: number
  /**
   * Rappelé quand l'utilisateur choisit un type de contribution dans le menu desktop.
   * Si fourni, ouvre le panneau inline (panel overlay) plutôt que de naviguer.
   */
  onContributeTypeSelect?: (type: string) => void
}

// ─── Classes réutilisables ────────────────────────────────────────────────────

/** Bouton icône seule (48×48), style secondaire avec effet 3D press */
const btnIcon =
  'btn-press btn-press-secondary flex items-center justify-center size-12 rounded-full'

/** Bouton pill avec label (h-48), style secondaire avec effet 3D press */
const btnPill =
  'btn-press btn-press-secondary flex gap-3 h-12 items-center justify-center px-6 rounded-full'

/** Bouton CTA primaire (h-48), style primaire avec effet 3D press */
const btnPrimary =
  'btn-press btn-press-primary bg-primary flex items-center justify-center gap-3 h-12 rounded-full text-primary-foreground'

// ─── Composant ───────────────────────────────────────────────────────────────

export function HomeNavbar({
  feedViewMode = 'list',
  onToggleFeedView,
  onOpenFeedFilters,
  feedActiveFiltersCount = 0,
  onContributeTypeSelect,
}: HomeNavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()

  // Streak consécutif (jours d'observation), calculé depuis Supabase
  const { data: streakDays } = useUserStreak(profile?.id)

  // Localisation partagée via LocationContext (pas de géoloc locale ici)
  // `locationDistance` alimente la pastille « 200 km » affichée à droite du
  // nom de ville pour rappeler à l'utilisateur quel rayon est actif sur le feed.
  const { locationLabel, locationDistance } = useLocation()

  // Compteur de notifications non lues, alimente le badge visuel de la cloche.
  // (La pastille de l'icône PWA est gérée globalement par AppBadgeSync dans App.)
  const { data: unreadCount } = useUnreadCount(profile?.id)

  // V1.1.4 NG-023 ext final : pill espece active dans le bouton recherche.
  // La categorie a un flow distinct (FeedFilterPanel + badge compteur).
  const { activeSpecies, clearActiveSpecies } = useSpecies()
  const activeFilterLabel = activeSpecies
    ? (activeSpecies.common_name ?? activeSpecies.scientific_name)
    : null

  // ── État unique pour TOUS les panels / modals ────────────────────────────
  // V1.1.4 QA round 4 (Nicolas 2026-06-01) : exclusivite garantie par design.
  // Un seul state -> impossible d avoir plusieurs panels ouverts en meme
  // temps. Les wrappers separes precedents souffraient d un bug de batch
  // React (state stale). Avec un seul state, ouvrir un panel ferme
  // mecaniquement les autres car la valeur change.
  type ActivePanel = 'search' | 'notifications' | 'contribute' | 'location' | 'profile' | null
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const showSearch = activePanel === 'search'
  const showNotifications = activePanel === 'notifications'
  const showContribute = activePanel === 'contribute'
  const showLocationModal = activePanel === 'location'
  const showProfileMenu = activePanel === 'profile'

  // Helpers : toggle ouvre/ferme le panel (si deja ouvert -> close)
  const togglePanel = (panel: NonNullable<ActivePanel>) =>
    setActivePanel((prev) => (prev === panel ? null : panel))
  const closePanel = () => setActivePanel(null)
  // SettingsPanel ouvert depuis le ProfileMenu (item "Paramètres"), son
  // state vit dans HomeNavbar (et non ProfileMenu) pour survivre à la
  // fermeture du ProfileMenu : on ferme le menu profil ET on ouvre les
  // paramètres en parallèle, sans superposition visuelle.
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  // Nicolas 2026-05-22 : sheet "Tendances & communauté" exposé sur lg
  // (1024-1279 px) où la sidebar droite n'est pas affichée en permanence.
  const [showStatsSheet, setShowStatsSheet] = useState(false)

  // Refs pour ancrer les dropdowns
  const notifBtnRef = useRef<HTMLButtonElement>(null)

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleContribute() {
    if (!isAuthenticated) {
      navigate('/signup')
    } else {
      togglePanel('contribute')
    }
  }

  function handleProfileClick() {
    if (isAuthenticated) {
      togglePanel('profile')
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
              aria-label="Naturegraph, Retour au fil d'actualité"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              {/* Mobile : h-6 (24px) pour laisser de la place aux boutons d'action.
                  Desktop md+ : h-8 (32px), taille de base inchangée. */}
              <LogoWordmark className="h-6 md:h-8 w-auto" />
            </Link>

            {/* Actions droite */}
            <div className="flex md:gap-4 gap-3 items-center">
              {/* ════════════════════════════════════════════════════════
                  MOBILE (<768px), contrôles du feed + bell
                  (search, contribute et profil sont dans MobileBottomNav)
                  ════════════════════════════════════════════════════════ */}
              <div className="flex md:hidden items-center gap-2">
                {/* Vue liste/grille, masqué quand la page hôte ne câble pas
                    `onToggleFeedView` (Profile a son propre toggle, Home
                    expose ce callback). Évite un bouton mort sur les pages
                    sans contrôle de vue. */}
                {onToggleFeedView && (
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
                )}

                {/* Filtres, affichés UNIQUEMENT quand la page hôte expose
                    un callback `onOpenFeedFilters` (= la Home). Sur Profile
                    ou autres pages sans filtres, le bouton est masqué pour
                    éviter une icône morte (Nicolas 2026-05-22). */}
                {onOpenFeedFilters && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={onOpenFeedFilters}
                      className={btnIcon}
                      aria-label={t('home.feed.filterObs')}
                    >
                      <Filter className="size-5 text-foreground" aria-hidden="true" />
                    </button>
                    {feedActiveFiltersCount > 0 && (
                      <span
                        aria-label={`${feedActiveFiltersCount} filtres actifs`}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-[var(--color-link)] text-[11px] font-bold leading-none pointer-events-none border border-cream-lighter"
                      >
                        {feedActiveFiltersCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Bell, connecté seulement */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => togglePanel('notifications')}
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
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none pointer-events-none ring-2 ring-cream-lighter"
                      >
                        {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {showNotifications && (
                      <NotificationsPanel anchorRef={notifBtnRef} onClose={() => closePanel()} />
                    )}
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════════════════
                  TABLET + DESKTOP (≥768px)
                  ════════════════════════════════════════════════════════ */}
              <div className="hidden md:flex items-center md:gap-4 gap-3">
                {/* ── Localisation, pill avec label de ville ou invite ── */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel('location')}
                    aria-expanded={showLocationModal}
                    aria-haspopup="dialog"
                    aria-label={
                      locationLabel ? t('home.navbar.changeLocation') : t('home.navbar.setLocation')
                    }
                    className={btnPill}
                  >
                    {/* Cohérence avec la bottom-nav mobile (Nicolas 2026-05-22) :
                        on garde l'icône Locate dans les deux états, plus épaisse
                        quand l'utilisateur est localisé pour effet « solid ». */}
                    <Locate
                      className={[
                        'size-5 shrink-0',
                        locationLabel ? 'text-[var(--color-link)]' : 'text-foreground',
                      ].join(' ')}
                      strokeWidth={locationLabel ? 3 : 2}
                      aria-hidden="true"
                    />
                    <span className="text-foreground text-sm truncate max-w-[140px] md:max-w-[200px]">
                      {/* ?? ne couvre pas '' (string vide), || est nécessaire ici.
                          BATCH 114 : truncate au lieu de text-nowrap pour éviter overflow navbar. */}
                      {locationLabel || t('home.navbar.setLocation')}
                    </span>
                    {/* Pastille rayon, rappelle à l'utilisateur la portée de
                        son filtre pour comprendre pourquoi le feed est vide
                        ou réduit (Nicolas 2026-05-22). */}
                    {locationLabel && (
                      <span
                        className="shrink-0 text-[11px] font-bold leading-none px-2 py-1 rounded-full bg-primary-light text-[var(--color-link)]"
                        aria-label={t('home.navbar.radiusKm', {
                          defaultValue: 'Rayon {{km}} km',
                          km: locationDistance,
                        })}
                      >
                        {locationDistance} km
                      </span>
                    )}
                  </button>

                  {showLocationModal && <LocationModal onClose={() => closePanel()} />}
                </div>

                {/* ── Recherche ───────────────────────────────────────────
                    V1.1.4 NG-023 ext final : si un filtre est actif (espece ou
                    categorie), le bouton devient un pill affichant le label
                    du filtre + une croix X pour le clear. Cliquer sur le pill
                    (hors croix) ouvre le SearchPanel pour modifier le filtre.
                    Pas de filtre actif -> icone loupe seule (comportement par defaut). */}
                {activeFilterLabel ? (
                  <div
                    className={`${btnPill} relative bg-primary-light border border-primary/20`}
                    aria-label={t('home.navbar.activeFilter', {
                      defaultValue: 'Filtre actif',
                    })}
                  >
                    <Search
                      className="size-4 text-[var(--color-link)] shrink-0"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => togglePanel('search')}
                      className="text-sm font-medium text-foreground truncate max-w-[140px] md:max-w-[200px] focus-visible:outline-none"
                      aria-expanded={showSearch}
                      aria-haspopup="dialog"
                    >
                      {activeFilterLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearActiveSpecies()}
                      aria-label={t('home.navbar.clearFilter', {
                        defaultValue: 'Retirer le filtre',
                      })}
                      className="shrink-0 size-5 flex items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X className="size-3.5 text-foreground" aria-hidden="true" />
                    </button>
                    {showSearch && <SearchPanel onClose={() => closePanel()} />}
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => togglePanel('search')}
                      className={btnIcon}
                      aria-label={t('home.navbar.search')}
                      aria-expanded={showSearch}
                      aria-haspopup="dialog"
                    >
                      <Search className="size-5 text-foreground" aria-hidden="true" />
                    </button>
                    {showSearch && <SearchPanel onClose={() => closePanel()} />}
                  </div>
                )}

                {/* ── Notifications, connecté seulement ───────────────── */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      ref={notifBtnRef}
                      type="button"
                      onClick={() => togglePanel('notifications')}
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
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none pointer-events-none ring-2 ring-cream-lighter"
                      >
                        {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {showNotifications && (
                      <NotificationsPanel anchorRef={notifBtnRef} onClose={() => closePanel()} />
                    )}
                  </div>
                )}

                {/* ── Stats sheet, visible uniquement entre lg et xl ────
                    Sur lg la sidebar droite (tendances + communauté) n'est
                    pas affichée pour préserver la largeur du feed. Ce bouton
                    expose la même info via un tiroir latéral droit. */}
                <div className="relative hidden lg:flex xl:hidden">
                  <button
                    type="button"
                    onClick={() => setShowStatsSheet((v) => !v)}
                    className={btnIcon}
                    aria-label={t('home.navbar.statsSheet', {
                      defaultValue: 'Tendances & communauté',
                    })}
                    aria-expanded={showStatsSheet}
                    aria-haspopup="dialog"
                  >
                    <BarChart3 className="size-5 text-foreground" aria-hidden="true" />
                  </button>
                </div>

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
                      onClose={() => closePanel()}
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
                            src={ImagePresets.avatarSmall(profile.avatar_url)}
                            alt={profile.username ?? 'Profil'}
                            loading="lazy"
                            decoding="async"
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

                      {/* Username + streak, XL Desktop uniquement */}
                      <div className="hidden xl:flex flex-col gap-0.5 items-start">
                        <span className="text-foreground text-sm text-nowrap leading-tight font-bold">
                          {profile?.username}
                        </span>
                        {/* Streak, affiché même à 0 pour inciter à l'engagement quotidien */}
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
                        onClose={() => closePanel()}
                        onOpenSettings={() => {
                          // Ferme le menu profil ET ouvre le panel settings.
                          // Le state `showSettingsPanel` vit dans HomeNavbar
                          // pour survivre au démontage du ProfileMenu.
                          closePanel()
                          setShowSettingsPanel(true)
                        }}
                      />
                    )}
                  </div>
                ) : (
                  /* Lien "Se connecter", style secondaire pill */
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

      {/* Settings panel global, ouvert depuis le ProfileMenu (item Paramètres),
          accessible depuis n'importe quelle page via la navbar. */}
      {showSettingsPanel && <SettingsPanel onClose={() => setShowSettingsPanel(false)} />}

      {/* Stats sheet global, ouvert depuis le bouton Stats sur lg. */}
      {showStatsSheet && <StatsSheet onClose={() => setShowStatsSheet(false)} />}
    </>
  )
}
