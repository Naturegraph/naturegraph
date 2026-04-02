/**
 * ProfileTabs — Navigation par onglets et contenu de la page profil
 *
 * Onglets disponibles :
 * - Publications : posts de l'utilisateur (FeedPost)
 * - Carnets : placeholder avec illustration hermine
 * - Identifications : placeholder avec illustration hermine
 *
 * Accessibilite : role tablist/tab/tabpanel, aria-selected, navigation clavier
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Search, Camera } from 'lucide-react'
import { FeedPost } from '@/components/home/FeedPost'
import type { MockPost } from '@/data/mockPosts'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'publications' | 'carnets' | 'identifications'

interface Tab {
  id: TabId
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

interface ProfileTabsProps {
  /** Posts de l'utilisateur a afficher dans l'onglet Publications */
  userPosts: MockPost[]
  /** Username affiche dans les placeholders */
  username: string
}

// ─── Configuration des onglets ───────────────────────────────────────────────

const TABS: Tab[] = [
  { id: 'publications', labelKey: 'profile.tabs.publications', icon: Camera },
  { id: 'carnets', labelKey: 'profile.tabs.notebooks', icon: BookOpen },
  { id: 'identifications', labelKey: 'profile.tabs.identifications', icon: Search },
]

// ─── Placeholder pour les onglets non implementes ────────────────────────────

/** Illustration hermine + message quand l'onglet est vide ou en construction */
function EmptyTabPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <img
        src={hermineEmptyState}
        alt=""
        className="w-32 h-32 opacity-60"
        loading="lazy"
        width={128}
        height={128}
      />
      <p className="text-sm text-muted-foreground text-center max-w-xs">{message}</p>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

/** Onglets du profil : Publications, Carnets, Identifications */
export function ProfileTabs({ userPosts, username }: ProfileTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('publications')

  return (
    <div>
      {/* Barre d'onglets */}
      <div
        role="tablist"
        aria-label={t('profile.tabs.label')}
        className="flex border-b-[0.5px] border-border"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(tab.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="pt-4"
      >
        {activeTab === 'publications' && (
          <div className="flex flex-col gap-4">
            {userPosts.length > 0 ? (
              userPosts.map((post) => <FeedPost key={post.id} {...post} />)
            ) : (
              <EmptyTabPlaceholder message={t('profile.tabs.noPosts', { name: username })} />
            )}
          </div>
        )}

        {activeTab === 'carnets' && (
          <EmptyTabPlaceholder message={t('profile.tabs.notebooksEmpty')} />
        )}

        {activeTab === 'identifications' && (
          <EmptyTabPlaceholder message={t('profile.tabs.identificationsEmpty')} />
        )}
      </div>
    </div>
  )
}
