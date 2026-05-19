/**
 * MobileNavLayer — Couche complète de navigation mobile (DRY pour Home + Profile + autres).
 *
 * Wrapper qui encapsule la MobileBottomNav et orchestre les bottom sheets associés :
 *   - Recherche (SearchPanel) — déclenché par l'icône loupe
 *   - Menu (MobileNavDrawer) — déclenché par l'icône burger
 *   - Profil (ProfileMenu) — déclenché par l'avatar (cohérence desktop)
 *   - Paramètres (SettingsPanel) — déclenché depuis le ProfileMenu
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

import { useState, lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MobileBottomNav } from './MobileBottomNav'
import { SearchPanel } from './SearchPanel'
import { ProfileMenu } from './ProfileMenu'
import { MobileNavDrawer } from './MobileNavDrawer'

// SettingsPanel est lazy car volumineux (settings forms + sous-vues CGU/Privacy).
// On ne charge le chunk que si l'utilisateur ouvre les paramètres.
const SettingsPanel = lazy(() =>
  import('@/components/settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)

interface MobileNavLayerProps {
  /** Callback contribution — délégué à la page (Home ouvre ContributeModal). */
  onContributeClick?: () => void
}

export function MobileNavLayer({ onContributeClick }: MobileNavLayerProps) {
  const { isAuthenticated } = useAuth()

  const [showSearch, setShowSearch] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <MobileBottomNav
        onContributeClick={onContributeClick}
        onSearchClick={() => setShowSearch(true)}
        onMenuClick={() => setShowDrawer(true)}
        // onProfileClick seulement si authentifié — la MobileBottomNav navigue
        // d'elle-même vers /login en mode invité.
        onProfileClick={isAuthenticated ? () => setShowProfile(true) : undefined}
      />

      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}

      {showDrawer && <MobileNavDrawer onClose={() => setShowDrawer(false)} />}

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
