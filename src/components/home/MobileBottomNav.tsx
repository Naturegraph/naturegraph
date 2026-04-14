/**
 * MobileBottomNav — Barre de navigation mobile fixée en bas de l'écran
 *
 * Affiche 5 éléments : Accueil | Explorer | [FAB Contribuer] | Recherche | Profil.
 * Le bouton Contribuer est un FAB surélevé, masqué en mode invité (spacer vide).
 * Masqué sur écrans md+ (desktop/tablette ont la HomeNavbar).
 *
 * Accessibilité : aria-labels traduits, aria-current sur l'onglet actif,
 * safe-area padding pour iPhone (encoche / barre Home).
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { House, Menu, Plus, Search, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import hermineIcon from '@/assets/images/hermine-icon.png'

/** Props du composant MobileBottomNav */
interface MobileBottomNavProps {
  /** Callback pour ouvrir la ContributeModal au lieu de naviguer */
  onContributeClick?: () => void
  /** Callback pour ouvrir le panneau de recherche */
  onSearchClick?: () => void
  /** Callback pour ouvrir le menu de navigation mobile (hamburger) */
  onMenuClick?: () => void
}

/**
 * Barre de navigation mobile — fixée en bas, visible uniquement sur petits écrans.
 * Gère la navigation entre les sections principales et l'état actif.
 */
export function MobileBottomNav({
  onContributeClick,
  onSearchClick,
  onMenuClick,
}: MobileBottomNavProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, profile } = useAuth()

  /** Détermine si un chemin correspond à l'onglet actif */
  function isActive(path: string): boolean {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  /** Classes CSS pour un item de navigation (actif vs inactif) */
  function itemClasses(active: boolean): string {
    return [
      'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
      active ? 'text-primary' : 'text-muted-foreground',
    ].join(' ')
  }

  /** Taille des icônes standard (20px, légèrement plus grand si actif via strokeWidth) */
  const iconSize = 'size-5'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-cream-lighter border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.home')}
    >
      <div className="flex items-end justify-around h-14">
        {/* ── Menu navigation ──────────────────────────────────────────────── */}
        {/* TODO [UX] — Ouvre un drawer de navigation latéral sur mobile (remplace la sidebar desktop) */}
        <button
          type="button"
          onClick={onMenuClick}
          className={itemClasses(false)}
          aria-label={t('nav.explore')}
        >
          <Menu className={iconSize} strokeWidth={2} aria-hidden="true" />
          <span className="text-[10px] leading-tight font-medium">{t('nav.explore')}</span>
        </button>

        {/* ── Accueil ──────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className={itemClasses(isActive('/home'))}
          aria-label={t('nav.home')}
          aria-current={isActive('/home') ? 'page' : undefined}
        >
          <House
            className={iconSize}
            strokeWidth={isActive('/home') ? 2.5 : 2}
            aria-hidden="true"
          />
          <span className="text-[10px] leading-tight font-medium">{t('nav.home')}</span>
        </button>

        {/* ── Contribuer (FAB) — masqué pour les invités ───────────────────── */}
        <div className="flex items-center justify-center flex-1" aria-hidden={!isAuthenticated}>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onContributeClick}
              className="relative -top-4 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:scale-95"
              aria-label={t('nav.contribute')}
            >
              <Plus className="size-7" strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : (
            /* Spacer vide pour maintenir l'espacement en mode invité */
            <div className="size-14" />
          )}
        </div>

        {/* ── Recherche ────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onSearchClick}
          className={itemClasses(false)}
          aria-label={t('common.search')}
        >
          <Search className={iconSize} strokeWidth={2} aria-hidden="true" />
          <span className="text-[10px] leading-tight font-medium">{t('common.search')}</span>
        </button>

        {/* ── Profil ───────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}
          className={itemClasses(isActive('/profile'))}
          aria-label={t('nav.profile')}
          aria-current={isActive('/profile') ? 'page' : undefined}
        >
          {isAuthenticated ? (
            <img
              src={profile?.avatar_url ?? hermineIcon}
              alt={profile?.username ?? t('nav.profile')}
              className={`${iconSize} rounded-full object-cover border ${isActive('/profile') ? 'border-primary' : 'border-border'}`}
            />
          ) : (
            <User
              className={iconSize}
              strokeWidth={isActive('/profile') ? 2.5 : 2}
              aria-hidden="true"
            />
          )}
          <span className="text-[10px] leading-tight font-medium">{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  )
}
