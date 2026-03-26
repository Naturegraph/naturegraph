/**
 * HomeNavbar — Barre de navigation de la page Home
 *
 * Comportements :
 *   - Logo    → /home (page produit, jamais la landing)
 *   - Localisation → navigator.geolocation + reverse geocoding Nominatim
 *   - Recherche → SearchPanel (utilisateurs + espèces)
 *   - Notifications → NotificationsPanel (si connecté)
 *   - Contribuer → ContributeModal (si connecté) ou /signup (invité)
 *   - Compte → profil (connecté) ou Se connecter (invité)
 *
 * Responsive : Desktop / Tablet / Mobile.
 * Accessibilité : aria-labels, focus-visible, skip link cible #main-content.
 */

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Bell, Plus, LocateFixed, ChevronDown, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SearchPanel } from './SearchPanel'
import { NotificationsPanel } from './NotificationsPanel'
import { ContributeModal } from './ContributeModal'
import logoColor from '@/assets/logos/logo-wordmark-color.svg'

// ─── Géolocalisation ──────────────────────────────────────────────────────────
// TODO [BACKEND] — Partager le locationLabel avec GuestSidebar via un LocationContext
//   pour éviter deux appels géoloc séparés (navbar + sidebar).
//   Créer src/contexts/LocationContext.tsx : { coords, label, isLoading, requestLocation }
//   La position servira aussi à filtrer le feed (observations à proximité).

/** Reverse geocoding via Nominatim OSM (gratuit, sans clé)
 * TODO [BACKEND] — En production, envisager un proxy côté serveur pour masquer l'origine
 * et éviter le rate-limiting Nominatim (1 req/sec). Alternative : Mapbox Geocoding API.
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  const city =
    data.address?.city ??
    data.address?.town ??
    data.address?.village ??
    data.address?.municipality ??
    ''
  const region = data.address?.state ?? ''
  return city ? (region ? `${city}, ${region}` : city) : region || 'Ma position'
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function HomeNavbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()

  // ── État localisation ────────────────────────────────────────────────────
  // TODO [BACKEND] — Valeur initiale 'Ploërmel, Bretagne' = mock.
  // Remplacer par : lecture depuis profile.city + profile.region (si connecté)
  // ou localStorage (si invité a déjà accepté la géoloc lors d'une session précédente).
  const [locationLabel, setLocationLabel] = useState('Ploërmel, Bretagne')
  const [locationLoading, setLocationLoading] = useState(false)

  async function handleLocate() {
    if (locationLoading) return
    if (!navigator.geolocation) return

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          setLocationLabel(label)
        } catch {
          setLocationLabel('Ma position')
        } finally {
          setLocationLoading(false)
        }
      },
      () => {
        // Refus ou erreur — on ne touche pas au label actuel
        setLocationLoading(false)
      },
    )
  }

  // ── Panels / modals ──────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showContribute, setShowContribute] = useState(false)

  const notifBtnRef = useRef<HTMLButtonElement>(null)

  function handleContribute() {
    if (!isAuthenticated) {
      navigate('/signup')
    } else {
      setShowContribute(true)
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
            {/* Logo → /home (page produit) */}
            <Link
              to="/home"
              aria-label="Naturegraph — Retour au fil d'actualité"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              <img src={logoColor} alt="Naturegraph" className="h-8 w-auto" />
            </Link>

            {/* Actions droite */}
            <div className="flex md:gap-4 gap-3 items-center">
              {/* Localisation — desktop seulement */}
              <div className="hidden md:flex">
                <button
                  type="button"
                  onClick={handleLocate}
                  disabled={locationLoading}
                  className="flex gap-3 h-12 items-center justify-center px-6 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70"
                  aria-label={t('home.navbar.changeLocation')}
                >
                  {locationLoading ? (
                    <Loader2
                      className="size-5 text-foreground shrink-0 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LocateFixed className="size-5 text-foreground shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-foreground text-nowrap">{locationLabel}</span>
                </button>
              </div>

              {/* Recherche */}
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="flex items-center justify-center size-12 rounded-full border border-border hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t('home.navbar.search')}
                aria-expanded={showSearch}
              >
                <Search className="size-5 text-foreground" aria-hidden="true" />
              </button>

              {/* Notifications — uniquement si authentifié */}
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
                    {/* Badge non-lu */}
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

              {/* Contribuer */}
              <div className="hidden xl:flex">
                <button
                  type="button"
                  onClick={handleContribute}
                  className="bg-primary flex gap-3 h-12 items-center justify-center px-6 rounded-button text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:scale-[0.98]"
                >
                  <Plus className="size-5 shrink-0" aria-hidden="true" />
                  <span>{t('home.navbar.contribute')}</span>
                </button>
              </div>
              <div className="xl:hidden flex">
                <button
                  type="button"
                  onClick={handleContribute}
                  className="bg-primary flex items-center justify-center size-12 rounded-button text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t('home.navbar.contribute')}
                >
                  <Plus className="size-5" aria-hidden="true" />
                </button>
              </div>

              {/* Profil ou Se connecter */}
              {isAuthenticated ? (
                <button
                  type="button"
                  className="flex gap-3 h-12 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
                  aria-label={t('home.navbar.profileMenu')}
                >
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
                  <div className="hidden xl:flex flex-col gap-1 items-start">
                    <span className="text-foreground text-nowrap leading-tight">
                      {profile?.username}
                    </span>
                  </div>
                  <ChevronDown
                    className="hidden xl:block size-5 text-foreground"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex gap-2 h-12 items-center justify-center px-6 rounded-button border border-border hover:border-foreground/40 transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <User className="size-5 shrink-0" aria-hidden="true" />
                  <span>{t('home.navbar.login')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Panels / modals montés en dehors du header pour éviter les z-index conflicts */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
      {showContribute && <ContributeModal onClose={() => setShowContribute(false)} />}
    </>
  )
}
