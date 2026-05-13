/**
 * Home — Page principale avec le feed
 *
 * Layout 3 colonnes (XL desktop uniquement) :
 *   - Gauche : GuestSidebar (invité) ou ProfileSidebar (connecté)
 *   - Centre : FeedSection
 *   - Droite : StatsSidebar
 *
 * Accessible sans authentification (mode invité).
 * La sidebar gauche et la navbar s'adaptent selon l'état auth.
 *
 * L'état viewMode + showFilters est levé ici pour être partagé entre
 * HomeNavbar (contrôles mobiles) et FeedSection (contrôles desktop).
 *
 * Le panneau de contribution (ContributeEncounterForm) est chargé à la
 * demande et rendu en overlay au-dessus du feed — design Figma v2.
 */

import { useState, lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'
import { FeedSection } from '@/components/home/FeedSection'
import { MobileBottomNav } from '@/components/home/MobileBottomNav'
import { ContributeModal } from '@/components/home/ContributeModal'

// Chargé à la demande — chunk séparé (éco-conception : ne charge que si besoin)
const ContributeEncounterForm = lazy(() =>
  import('@/components/contribute/ContributeEncounterForm').then((m) => ({
    default: m.ContributeEncounterForm,
  })),
)

// StatsSidebar lazy (QW-I2 / T-082) — affichée uniquement xl:block (>=1280px).
// Avant : 311 lignes chargees dans le bundle initial meme sur mobile/tablet.
// Apres : chunk separe, telecharge uniquement quand l'utilisateur a un ecran XL.
// Gain : -2 KB initial sur mobile + meilleur LCP.
const StatsSidebar = lazy(() =>
  import('@/components/home/StatsSidebar').then((m) => ({
    default: m.StatsSidebar,
  })),
)

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [showContributeModal, setShowContributeModal] = useState(false)

  /** Type actif dans le panneau inline — null = panneau fermé */
  const [activePanelType, setActivePanelType] = useState<
    'nature_encounter' | 'nature_instant' | null
  >(null)

  // État partagé feed — contrôlable depuis la navbar mobile ET le header desktop
  const [feedViewMode, setFeedViewMode] = useState<'list' | 'grid'>('list')
  const [feedShowFilters, setFeedShowFilters] = useState(false)
  const [feedHasActiveFilters, setFeedHasActiveFilters] = useState(false)

  /** Appelé depuis ContributeModal (desktop via navbar et mobile via FAB) */
  function handleContributeTypeSelect(type: string) {
    setShowContributeModal(false)
    if (type === 'nature_encounter' || type === 'nature_instant') {
      setActivePanelType(type)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      {/* Navbar — reçoit les callbacks pour les contrôles mobiles */}
      <HomeNavbar
        feedViewMode={feedViewMode}
        onToggleFeedView={() => setFeedViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
        onOpenFeedFilters={() => setFeedShowFilters(true)}
        feedHasActiveFilters={feedHasActiveFilters}
        onContributeTypeSelect={handleContributeTypeSelect}
      />

      {/* Layout principal
       *
       * Cap XL = 1440px → inner 1392px (avec px-6).
       * Maths d'alignement Figma : asides 320×2 + gaps 24×2 + main = 1392
       *   → main column = 704px = Figma post column (656 inner + p-6 padding).
       * Sur écran > 1440px : marges automatiques (mx-auto) centrent le tout.
       */}
      <div className="flex flex-1 w-full">
        <div className="w-full xl:max-w-[1440px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 py-4 pb-20 md:pb-6">
          {/* Colonne gauche — visible uniquement XL desktop */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            {isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}
          </aside>

          {/* Colonne centrale — Feed */}
          <main id="main-content" className="flex-1 min-w-0">
            <FeedSection
              viewMode={feedViewMode}
              onViewModeChange={setFeedViewMode}
              showFilters={feedShowFilters}
              onShowFiltersChange={setFeedShowFilters}
              onHasActiveFiltersChange={setFeedHasActiveFilters}
              // Empty state CTA "Partager une observation" → ouvre directement
              // le panel Rencontre Nature (même flow que la navbar).
              onContributeClick={() => setActivePanelType('nature_encounter')}
            />
          </main>

          {/* Colonne droite — Stats & Tendances — visible uniquement XL desktop.
              Lazy-loaded : ne charge le chunk que si l'ecran est >=1280px (QW-I2). */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <Suspense fallback={<div className="w-[320px] h-96 bg-muted/20 rounded-lg" />}>
              <StatsSidebar />
            </Suspense>
          </aside>
        </div>
      </div>

      {/* Navigation mobile — visible md:hidden */}
      <MobileBottomNav onContributeClick={() => setShowContributeModal(true)} />

      {/* Sélection du type de contribution — dropdown desktop / bottom sheet mobile */}
      {showContributeModal && (
        <ContributeModal
          onClose={() => setShowContributeModal(false)}
          onTypeSelect={handleContributeTypeSelect}
        />
      )}

      {/* Panneau Rencontre Nature — overlay latéral droit */}
      {activePanelType === 'nature_encounter' && (
        <Suspense fallback={null}>
          <ContributeEncounterForm onClose={() => setActivePanelType(null)} />
        </Suspense>
      )}
    </div>
  )
}
