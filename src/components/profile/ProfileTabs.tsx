/**
 * ProfileTabs — Navigation horizontale scrollable et contenu des onglets du profil
 *
 * Onglets Figma :
 *   À propos | Journal nature (count) | Inspirations (count) | Communauté | Statistiques
 *
 * Accessibilité : role tablist/tab/tabpanel, aria-selected, navigation clavier.
 * L'onglet actif a un border-bottom primary + texte primary.
 * Scroll horizontal masqué sur mobile pour accéder à tous les onglets.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound, Camera, Bookmark, Users, BarChart2 } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'
import type { MockPost } from '@/data/mockPosts'
import { ProfileAbout } from './tabs/ProfileAbout'
import { ProfileFeed } from './tabs/ProfileFeed'
import { ProfileInspirations } from './tabs/ProfileInspirations'
import { ProfileCommunity } from './tabs/ProfileCommunity'
import { ProfileStats } from './tabs/ProfileStats'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'about' | 'journal' | 'inspirations' | 'community' | 'stats'

interface ProfileTabsProps {
  /** Données complètes du profil affiché */
  profile: ProfileDisplayData
  /** Posts de cet utilisateur pour l'onglet Journal */
  userPosts: MockPost[]
  /** Photos d'inspiration sauvegardées */
  inspirationPhotos: string[]
}

// ─── Configuration des onglets ────────────────────────────────────────────────

/** Définition d'un onglet — icône, clé i18n, count optionnel, badge "Bientôt" */
interface TabDef {
  id: TabId
  labelKey: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  getBadge?: (props: { userPosts: MockPost[]; inspirationPhotos: string[] }) => number | null
  soonBadge?: boolean
}

const TABS: TabDef[] = [
  { id: 'about', labelKey: 'profile.tabs.about', icon: UserRound },
  {
    id: 'journal',
    labelKey: 'profile.tabs.journal',
    icon: Camera,
    getBadge: ({ userPosts }) => userPosts.length,
  },
  {
    id: 'inspirations',
    labelKey: 'profile.tabs.inspirations',
    icon: Bookmark,
    getBadge: ({ inspirationPhotos }) => inspirationPhotos.length,
  },
  { id: 'community', labelKey: 'profile.tabs.community', icon: Users },
  { id: 'stats', labelKey: 'profile.tabs.stats', icon: BarChart2, soonBadge: true },
]

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Barre d'onglets horizontale scrollable + rendu du contenu de l'onglet actif.
 * L'onglet "À propos" est sélectionné par défaut.
 */
export function ProfileTabs({ profile, userPosts, inspirationPhotos }: ProfileTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('about')

  return (
    <div className="w-full">
      {/* ── Barre d'onglets scrollable ── */}
      <div
        role="tablist"
        aria-label={t('profile.tabs.label')}
        className="flex overflow-x-auto scrollbar-none border-b border-border"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          const count = tab.getBadge?.({ userPosts, inspirationPhotos }) ?? null

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden={true} />
              <span>{t(tab.labelKey)}</span>

              {/* Badge compteur (Journal, Inspirations) */}
              {count !== null && count > 0 && (
                <span
                  aria-hidden="true"
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}

              {/* Badge "Bientôt" pour Statistiques */}
              {tab.soonBadge && (
                <span
                  aria-label="Bientôt disponible"
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-dark/10 text-teal-dark font-medium"
                >
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Contenu de l'onglet actif ── */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="pt-4"
      >
        {activeTab === 'about' && <ProfileAbout profile={profile} />}
        {activeTab === 'journal' && <ProfileFeed userPosts={userPosts} />}
        {activeTab === 'inspirations' && (
          <ProfileInspirations photos={inspirationPhotos} username={profile.username} />
        )}
        {activeTab === 'community' && (
          <ProfileCommunity
            followersCount={profile.followers_count}
            followingCount={profile.following_count}
          />
        )}
        {activeTab === 'stats' && <ProfileStats />}
      </div>
    </div>
  )
}
