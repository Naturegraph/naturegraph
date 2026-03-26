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
 */

import { useAuth } from '@/contexts/AuthContext'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'
import { FeedSection } from '@/components/home/FeedSection'
import { StatsSidebar } from '@/components/home/StatsSidebar'

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      {/* Navbar */}
      <HomeNavbar />

      {/* Layout principal */}
      <div className="flex flex-1 w-full">
        <div className="w-full xl:max-w-[1728px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 py-4">
          {/* Colonne gauche — visible uniquement XL desktop */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            {isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}
          </aside>

          {/* Colonne centrale — Feed */}
          <main id="main-content" className="flex-1 min-w-0">
            <FeedSection />
          </main>

          {/* Colonne droite — Stats & Tendances — visible uniquement XL desktop */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <StatsSidebar />
          </aside>
        </div>
      </div>
    </div>
  )
}
