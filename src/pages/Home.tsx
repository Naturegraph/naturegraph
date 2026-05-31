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
 * Le panneau de contribution est rendu via le hook partagé `useEditPostFlow`
 * qui centralise le state (active type, editing ID) et les lazy imports.
 * Meme behavior dans Home, Profile et PostDetail (coherence produit V1.1.3).
 */

import { useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'
import { FeedSection } from '@/components/home/FeedSection'
import { MobileNavLayer } from '@/components/home/MobileNavLayer'
import { ContributeModal } from '@/components/home/ContributeModal'
import { useEditPostFlow } from '@/hooks/useEditPostFlow'

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
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  // BATCH 10 / QW-UX1 : titre dynamique pour onglet navigateur (SEO + UX)
  usePageTitle(t('nav.home'))
  const [showContributeModal, setShowContributeModal] = useState(false)

  // Hook partage : gere les panels create/edit + leur lazy load.
  // onEditPost -> passe a FeedSection pour les FeedPost.
  // openCreate -> branche sur les boutons Contribuer.
  // panelNode -> a rendre dans le composant racine.
  const { onEditPost, openCreate, panelNode } = useEditPostFlow()

  // État partagé feed — contrôlable depuis la navbar mobile ET le header desktop
  const [feedViewMode, setFeedViewMode] = useState<'list' | 'grid'>('list')
  const [feedShowFilters, setFeedShowFilters] = useState(false)
  const [feedHasActiveFilters, setFeedHasActiveFilters] = useState(false)

  /** Appelé depuis ContributeModal (desktop via navbar et mobile via FAB) */
  function handleContributeTypeSelect(type: string) {
    setShowContributeModal(false)
    if (type === 'nature_encounter' || type === 'nature_instant') {
      openCreate(type)
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
        <div className="w-full xl:max-w-[1440px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 pb-20 md:pb-6">
          {/* Colonne gauche — visible dès LG (≥1024px, Nicolas 2026-05-22).
              Contient les stats user perso (observations, espèces, streak,
              objectif semaine) qui sont l'info la plus engageante. Avant
              elle n'apparaissait qu'à xl et un user sur iPad Air (1180px)
              perdait l'accès à ses propres stats. */}
          <aside className="hidden lg:block w-[320px] shrink-0">
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
              onContributeClick={() => openCreate('nature_encounter')}
              onEditPost={onEditPost}
            />
          </main>

          {/* Colonne droite — Stats & Tendances — visible uniquement XL desktop
              (≥1280px). Sur lg (1024-1279px) on garde main + sidebar gauche
              seule pour ne pas écraser la largeur du feed (photos nature).
              Lazy-loaded : ne charge le chunk que si l'écran est >=1280px. */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <Suspense fallback={<div className="w-[320px] h-96 bg-muted/20 rounded-lg" />}>
              <StatsSidebar />
            </Suspense>
          </aside>
        </div>
      </div>

      {/* Navigation mobile — visible md:hidden.
          MobileNavLayer orchestre la navbar bottom + les sheets (search, menu, profil, settings). */}
      <MobileNavLayer onContributeClick={() => setShowContributeModal(true)} />

      {/* Sélection du type de contribution — dropdown desktop / bottom sheet mobile */}
      {showContributeModal && (
        <ContributeModal
          onClose={() => setShowContributeModal(false)}
          onTypeSelect={handleContributeTypeSelect}
        />
      )}

      {/* Panneau Contribuer (Encounter ou Instant selon le type actif) */}
      {panelNode}
    </div>
  )
}
