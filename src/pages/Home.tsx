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
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'
import { FeedSection } from '@/components/home/FeedSection'
import { StatsSidebar } from '@/components/home/StatsSidebar'
import { MobileBottomNav } from '@/components/home/MobileBottomNav'
import { ContributeModal } from '@/components/home/ContributeModal'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [showContributeModal, setShowContributeModal] = useState(false)

  // État partagé feed — contrôlable depuis la navbar mobile ET le header desktop
  const [feedViewMode, setFeedViewMode] = useState<'list' | 'grid'>('list')
  const [feedShowFilters, setFeedShowFilters] = useState(false)
  const [feedHasActiveFilters, setFeedHasActiveFilters] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      {/* Navbar — reçoit les callbacks pour les contrôles mobiles */}
      <HomeNavbar
        feedViewMode={feedViewMode}
        onToggleFeedView={() => setFeedViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
        onOpenFeedFilters={() => setFeedShowFilters(true)}
        feedHasActiveFilters={feedHasActiveFilters}
      />

      {/* Layout principal */}
      <div className="flex flex-1 w-full">
        <div className="w-full xl:max-w-[1728px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 py-4 pb-20 md:pb-6">
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
            />
          </main>

          {/* Colonne droite — Stats & Tendances — visible uniquement XL desktop */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <StatsSidebar />
          </aside>
        </div>
      </div>

      {/* Navigation mobile — visible md:hidden */}
      <MobileBottomNav onContributeClick={() => setShowContributeModal(true)} />

      {/* Modale de contribution — ouverte via le FAB mobile */}
      {showContributeModal && <ContributeModal onClose={() => setShowContributeModal(false)} />}
    </div>
  )
}
