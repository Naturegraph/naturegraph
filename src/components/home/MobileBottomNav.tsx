/**
 * MobileBottomNav — Barre de navigation mobile fixée en bas de l'écran
 *
 * Affiche 5 éléments : Menu | Localisation | [FAB Contribuer] | Recherche | Profil.
 *
 * Nicolas 2026-05-22 : ancien bouton « Home » remplacé par « Localisation ».
 * Le logo Naturegraph dans le header du haut sert déjà de retour Accueil,
 * donc le Home en bas faisait doublon. La localisation est l'action mobile
 * la plus critique pour un feed geo-aware. L'avatar est passé à 40px
 * (size-10) pour la lisibilité (avant size-6 = 24px, peu cliquable).
 *
 * Le bouton Contribuer est un FAB surélevé, masqué sur écrans md+
 * (desktop/tablette ont la HomeNavbar).
 *
 * Accessibilité : aria-labels traduits, aria-current sur l'onglet actif,
 * safe-area padding pour iPhone (encoche / barre Home).
 */

import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Locate, Menu, Plus, Search, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ImagePresets } from '@/lib/supabaseImage'

/** Props du composant MobileBottomNav */
interface MobileBottomNavProps {
  /** Callback pour ouvrir la ContributeModal au lieu de naviguer */
  onContributeClick?: () => void
  /** Callback pour ouvrir le panneau de recherche */
  onSearchClick?: () => void
  /** Callback pour ouvrir le menu de navigation mobile (hamburger) */
  onMenuClick?: () => void
  /**
   * Callback pour ouvrir la LocationModal. Le bouton remplace l'ancien Home
   * (qui faisait doublon avec le logo du header). La localisation est
   * l'action mobile la plus critique pour un feed geo-aware.
   */
  onLocationClick?: () => void
  /**
   * Callback pour ouvrir le menu profil (bottom sheet) en mode authentifié.
   * Cohérence desktop : on ouvre d'abord le menu (Mon profil / Paramètres / Thème),
   * et la navigation vers /profile se fait depuis ce menu.
   * Si non fourni → fallback navigation directe vers /profile (rétrocompat).
   * En mode invité, on navigue toujours vers /login (jamais ce callback).
   */
  onProfileClick?: () => void
}

/**
 * Barre de navigation mobile — fixée en bas, visible uniquement sur petits écrans.
 * Gère la navigation entre les sections principales et l'état actif.
 */
export function MobileBottomNav({
  onContributeClick,
  onSearchClick,
  onMenuClick,
  onLocationClick,
  onProfileClick,
}: MobileBottomNavProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const routerLocation = useRouterLocation()
  const { isAuthenticated, profile } = useAuth()
  // Label de ville pour le bouton Localisation (icône remplie + couleur active
  // si une ville est configurée, outline gris sinon).
  const { locationLabel } = useLocation()

  /** Détermine si un chemin correspond à l'onglet actif */
  function isActive(path: string): boolean {
    return routerLocation.pathname === path || routerLocation.pathname.startsWith(path + '/')
  }

  /** Classes CSS pour un item de navigation (actif vs inactif).
      Figma 6385:70645 : icônes seules, sans label, taille 24px (size-6). */
  function itemClasses(active: boolean): string {
    return [
      'flex items-center justify-center flex-1 h-full transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full',
      active ? 'text-primary' : 'text-foreground',
    ].join(' ')
  }

  /** Taille des icônes — 24px Figma (size-6). Stroke 2 par défaut. */
  const iconSize = 'size-6'

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
        </button>

        {/* ── Localisation ─────────────────────────────────────────────────
            Nicolas 2026-05-22 : on garde TOUJOURS la même icône `Locate`
            pour la cohérence visuelle — seul le style change quand
            l'utilisateur est localisé (couleur primary via itemClasses +
            strokeWidth plus épais pour effet « solid violet »). Plus de
            switch MapPin/Locate qui cassait la mémoire visuelle. */}
        <button
          type="button"
          onClick={onLocationClick}
          className={itemClasses(!!locationLabel)}
          aria-label={
            locationLabel
              ? t('home.navbar.changeLocation', { defaultValue: 'Changer la localisation' })
              : t('home.navbar.setLocation', { defaultValue: 'Définir la localisation' })
          }
          aria-haspopup="dialog"
        >
          <Locate className={iconSize} strokeWidth={locationLabel ? 3 : 2} aria-hidden="true" />
        </button>

        {/* ── Contribuer (FAB) — toujours visible ──────────────────────────────
            Invité : click → navigate('/login') (incite à se connecter avant de partager).
            Authentifié : click → onContributeClick (ouvre ContributeModal).
            On garde le FAB violet dans les deux cas pour éviter un vide moche
            au centre de la navbar (retour terrain Nicolas). */}
        <div className="flex items-center justify-center flex-1">
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                onContributeClick?.()
              } else {
                navigate('/login')
              }
            }}
            className="relative -top-4 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:scale-95"
            aria-label={t('nav.contribute')}
          >
            <Plus className="size-7" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* ── Recherche ────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onSearchClick}
          className={itemClasses(false)}
          aria-label={t('common.search')}
        >
          <Search className={iconSize} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* ── Profil ───────────────────────────────────────────────────────────
            Authentifié : ouvre le ProfileMenu (bottom sheet) — cohérence desktop.
            Le menu contient Mon profil / Paramètres / Thème / Accessibilité / Déconnexion.
            Si onProfileClick non fourni, fallback navigation directe (rétrocompat).
            Invité : navigation directe vers /login. */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/login')
              return
            }
            if (onProfileClick) {
              onProfileClick()
            } else {
              navigate('/profile')
            }
          }}
          className={itemClasses(isActive('/profile'))}
          aria-label={t('nav.profile')}
          aria-current={isActive('/profile') ? 'page' : undefined}
          aria-haspopup={isAuthenticated && onProfileClick ? 'dialog' : undefined}
        >
          {isAuthenticated ? (
            /* Avatar 40 px (size-10) — Nicolas 2026-05-22 : agrandi depuis
               size-6 (24 px) pour une meilleure lisibilité et un hit target
               plus confortable sur mobile (WCAG 2.5.5). */
            <img
              src={profile?.avatar_url ? ImagePresets.avatarSmall(profile.avatar_url) : hermineIcon}
              alt={profile?.username ?? t('nav.profile')}
              loading="lazy"
              decoding="async"
              className={`size-10 rounded-full object-cover border-2 ${isActive('/profile') ? 'border-primary' : 'border-border'}`}
            />
          ) : (
            <User
              className={iconSize}
              strokeWidth={isActive('/profile') ? 2.5 : 2}
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </nav>
  )
}
