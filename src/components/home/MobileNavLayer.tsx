/**
 * MobileNavLayer : Couche complète de navigation mobile (DRY pour Home + Profile + autres).
 *
 * Wrapper qui encapsule la MobileBottomNav et orchestre les bottom sheets associés :
 *   - Recherche (SearchPanel) : déclenché par l'icône loupe
 *   - Menu (MobileNavDrawer) : déclenché par l'icône burger
 *   - Profil (ProfileMenu) : déclenché par l'avatar (cohérence desktop)
 *   - Paramètres (SettingsPanel) : déclenché depuis le ProfileMenu
 *
 * Pourquoi ce wrapper :
 *   - Évite de dupliquer le state + le rendu des sheets dans Home.tsx et Profile.tsx.
 *   - Centralise la logique mobile dans un seul endroit (lisibilité + maintenabilité).
 *   - Permet à toute page future d'avoir une navigation mobile cohérente avec 1 ligne :
 *     `<MobileNavLayer />` (ou `<MobileNavLayer onContributeClick={...} />`).
 *
 * Le prop `onContributeClick` reste piloté par la page (le contexte de contribution
 * dépend de la page : Home ouvre un panel, Profile pourrait ne pas l'avoir).
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import { MobileBottomNav } from './MobileBottomNav'
import { SearchPanel } from './SearchPanel'
import { ProfileMenu } from './ProfileMenu'
import { MobileNavDrawer } from './MobileNavDrawer'
import { LocationModal } from './LocationModal'
import { ContributeModal } from './ContributeModal'

// SettingsPanel est lazy car volumineux (settings forms + sous-vues CGU/Privacy).
// On ne charge le chunk que si l'utilisateur ouvre les paramètres.
const SettingsPanel = lazy(() =>
  import('@/components/settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)

interface MobileNavLayerProps {
  /**
   * Callback contribution : délégué à la page hôte. Si non fourni, le bouton +
   * ouvre la `ContributeModal` interne (cohérence Home / Profile / etc.).
   * La Home le câble pour ouvrir directement un panel inline ; les autres
   * pages laissent le défaut (modale).
   */
  onContributeClick?: () => void
}

export function MobileNavLayer({ onContributeClick }: MobileNavLayerProps) {
  const { isAuthenticated } = useAuth()
  // V1.1.4 QA Nicolas : indicateur visuel sur l icone Search mobile quand
  // une espece est active dans le Species Context Layer.
  const { activeSpecies } = useSpecies()

  const [showSearch, setShowSearch] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  // Nicolas 2026-05-22 : LocationModal exposée depuis le bouton dédié de
  // la bottom nav (qui remplace l'ancien Home).
  const [showLocation, setShowLocation] = useState(false)
  // Nicolas 2026-05-22 : ContributeModal interne : fallback quand la page
  // hôte ne passe pas `onContributeClick`. Avant ce fix, le bouton + était
  // mort sur Profile (et toute page sans Home).
  const [showContribute, setShowContribute] = useState(false)

  // Si la page fournit un callback, on l'utilise. Sinon on ouvre la modale
  // interne : c'est le cas par défaut hors Home.
  const handleContribute = onContributeClick ?? (() => setShowContribute(true))

  // V1.1.4 QA round 6 (Nicolas 2026-06-01) : le pill recherche dans FeedSection
  // emet un event custom pour ouvrir le SearchPanel mobile. Permet a l user
  // de modifier l espece active sans avoir a fermer puis re-cliquer Search.
  useEffect(() => {
    const handler = () => setShowSearch(true)
    window.addEventListener('naturegraph:open-search', handler)
    return () => window.removeEventListener('naturegraph:open-search', handler)
  }, [])

  return (
    <>
      <MobileBottomNav
        onContributeClick={handleContribute}
        onSearchClick={() => setShowSearch(true)}
        onMenuClick={() => setShowDrawer(true)}
        onLocationClick={() => setShowLocation(true)}
        // onProfileClick seulement si authentifié : la MobileBottomNav navigue
        // d'elle-même vers /login en mode invité.
        onProfileClick={isAuthenticated ? () => setShowProfile(true) : undefined}
        searchActive={!!activeSpecies}
      />

      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}

      {showDrawer && <MobileNavDrawer onClose={() => setShowDrawer(false)} />}

      {showLocation && <LocationModal onClose={() => setShowLocation(false)} />}

      {showContribute && <ContributeModal onClose={() => setShowContribute(false)} />}

      {showProfile && (
        <ProfileMenu
          onClose={() => setShowProfile(false)}
          onOpenSettings={() => {
            // Ferme le menu profil ET ouvre le panel paramètres.
            // Le state vit ici (pas dans ProfileMenu) pour survivre au démontage du menu.
            setShowProfile(false)
            setShowSettings(true)
          }}
        />
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
    </>
  )
}
