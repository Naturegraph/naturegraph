/**
 * ProfileTabs : Navigation horizontale scrollable et contenu des onglets du profil
 *
 * Onglets Figma :
 *   - Mobile  (5) : À propos | Journal nature (count) | Inspirations (count) | Communauté | Statistiques
 *   - Desktop (4) : Journal nature | Inspirations | Communauté | Statistiques
 *     (le tab "À propos" est remplacé par 2 cards visibles directement -
 *      ProfileAboutCard + ProfileDNACard : au-dessus des tabs.)
 *
 * Accessibilité : role tablist/tab/tabpanel, aria-selected, navigation clavier.
 * L'onglet actif a un border-bottom primary + texte primary.
 * Scroll horizontal masqué sur mobile pour accéder à tous les onglets.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound, Camera, Bookmark, Users } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'
import type { MockPost } from '@/components/home/FeedPost'
import { ProfileAboutCard } from './ProfileAboutCard'
import { ProfileDNACard } from './ProfileDNACard'
import { ProfileFeed } from './tabs/ProfileFeed'
import { ProfileInspirations } from './tabs/ProfileInspirations'
import { ProfileCommunity } from './tabs/ProfileCommunity'
import { ProfileStats } from './tabs/ProfileStats'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'about' | 'journal' | 'inspirations' | 'community' | 'stats'

interface ProfileTabsProps {
  /** ID du profil affiché : requis pour l'onglet Communauté (queries follows) */
  profileId: string
  /** Données complètes du profil affiché */
  profile: ProfileDisplayData
  /** Posts de cet utilisateur pour l'onglet Journal */
  userPosts: MockPost[]
  /** Posts sauvegardés par l'utilisateur (collection : table saved_posts) */
  savedPosts: MockPost[]
  /** L'utilisateur connecté regarde-t-il son propre profil ?
   *  → propagé à ProfileFeed pour activer l'option "Supprimer" sur les posts. */
  isOwnProfile: boolean
  /** NG-002 : callback edition d observation, propage a ProfileFeed. */
  onEditPost?: (postId: string, postType: 'nature_encounter' | 'nature_instant') => void
  /** V1.1.4 NG-026 : pagination scroll infini posts user.
   *  Si fourni, ProfileFeed active le sentinel pour charger la suite. */
  hasMoreUserPosts?: boolean
  isFetchingMoreUserPosts?: boolean
  fetchMoreUserPosts?: () => void
}

// ─── Configuration des onglets ────────────────────────────────────────────────

/** Définition d'un onglet : icône, clé i18n, count optionnel, badge "Bientôt" */
interface TabDef {
  id: TabId
  labelKey: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  getBadge?: (props: { userPosts: MockPost[]; savedPosts: MockPost[] }) => number | null
  soonBadge?: boolean
  /** Si true, ce tab est masqué sur desktop (cards visibles direct au-dessus) */
  mobileOnly?: boolean
}

const TABS: TabDef[] = [
  { id: 'about', labelKey: 'profile.tabs.about', icon: UserRound, mobileOnly: true },
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
    getBadge: ({ savedPosts }) => savedPosts.length,
  },
  { id: 'community', labelKey: 'profile.tabs.community', icon: Users },
  // Nicolas 2026-05-22 : onglet « Statistiques » retiré du listing tant que
  // la page dédiée n'est pas livrée. Tant qu'elle est en « Bientôt », autant
  // ne pas afficher l'item pour ne pas créer d'attente côté utilisateur.
  // À réactiver quand la vue Stats sera prête (cf. ProfileStats.tsx).
  // { id: 'stats', labelKey: 'profile.tabs.stats', icon: BarChart2, soonBadge: true },
]

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Barre d'onglets horizontale scrollable + rendu du contenu de l'onglet actif.
 * L'onglet "À propos" est sélectionné par défaut.
 */
export function ProfileTabs({
  profileId,
  profile,
  userPosts,
  savedPosts,
  isOwnProfile,
  onEditPost,
  hasMoreUserPosts = false,
  isFetchingMoreUserPosts = false,
  fetchMoreUserPosts,
}: ProfileTabsProps) {
  const { t } = useTranslation()
  // Tab par défaut : "journal" (Journal nature) : règle d'usage Nicolas
  // 2026-05-01 : à l'arrivée sur un profil, l'onglet Journal doit toujours
  // être actif (c'est le contenu principal attendu : la liste des observations).
  // Sur mobile l'utilisateur peut cliquer "À propos" pour voir les 2 cards.
  const [activeTab, setActiveTab] = useState<TabId>('journal')

  return (
    <div className="w-full">
      {/* ── Barre d'onglets scrollable horizontalement ──
          `relative` + scroll natif sur le tablist directement.
          `touch-pan-x` : autorise le swipe horizontal sur mobile sans
          interférer avec le scroll vertical de la page (Nicolas 2026-05-01 :
          fix mobile slider tabs). */}
      <div
        role="tablist"
        aria-label={t('profile.tabs.label')}
        className="flex overflow-x-auto scrollbar-none border-b border-border touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none]"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          const count = tab.getBadge?.({ userPosts, savedPosts }) ?? null
          // Tab "À propos" masqué sur desktop (md+) : les 2 cards le remplacent
          const visibilityClass = tab.mobileOnly ? 'flex md:hidden' : 'flex'

          // Premier tab visible : son icône DOIT s'aligner avec l'avatar et la
          // bordure gauche des cards (= 72px du container = wrapper md:px-12).
          // Sur desktop "about" est masqué donc journal est premier.
          // Sur mobile "about" est premier.
          // On test sur tab.id (pas sur l'index) pour rester robuste si on
          // ajoute/réordonne des tabs plus tard.
          const isFirstDesktop = tab.id === 'journal'
          const isFirstMobile = tab.id === 'about'
          const leftPaddingClass = isFirstDesktop
            ? 'md:pl-0 pl-4'
            : isFirstMobile
              ? 'pl-0 md:pl-4'
              : 'pl-4'

          // Tab "Statistiques" Bientôt = disabled : pas cliquable, cursor not-allowed
          const isDisabled = !!tab.soonBadge

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              // Figma 6385:74515 :
              //  - Active : icon + label en primary (violet), border-bottom primary
              //  - Inactif : icon + label en text-foreground (dark, pas muted)
              //  - Soon (Statistiques) : muted-foreground + cursor not-allowed
              // pr-4 + pl-4 explicites (pas px-4) pour que md:pl-12 sur le
              // premier tab puisse override pl-4 sur desktop sans conflit.
              className={`${visibilityClass} ${leftPaddingClass} items-center gap-2 pr-4 py-3 text-base font-bold whitespace-nowrap transition-colors border-b-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                isActive
                  ? 'border-primary text-primary'
                  : isDisabled
                    ? 'border-transparent text-muted-foreground/60 cursor-not-allowed opacity-60'
                    : 'border-transparent text-foreground hover:text-primary'
              }`}
            >
              <Icon className="size-5" aria-hidden={true} />
              <span>{t(tab.labelKey)}</span>

              {/* Badge compteur :
                  - Active : pill primary light + texte primary violet
                  - Inactive : pill warm-beige (#FFF4E0) + texte foreground */}
              {count !== null && count > 0 && (
                <span
                  aria-hidden="true"
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-primary-light text-primary' : 'bg-warm-beige text-foreground'
                  }`}
                >
                  {count}
                </span>
              )}

              {/* Badge "Bientôt" : même style que MenuItem.disabled de ProfileMenu
                  pour cohérence visuelle (primary light bg + primary text uppercase). */}
              {tab.soonBadge && (
                <span
                  aria-label="Bientôt disponible"
                  className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary-light px-2 py-0.5 rounded-full"
                >
                  Bientôt
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
        {activeTab === 'about' && (
          // Tab "À propos" : MOBILE uniquement (sur desktop les cards sont au-dessus).
          // On rend les 2 cards directement ici en vertical stack.
          <div className="md:hidden flex flex-col gap-4">
            <ProfileAboutCard profile={profile} compact />
            <ProfileDNACard interests={profile.interests} compact />
          </div>
        )}
        {activeTab === 'journal' && (
          <ProfileFeed
            userPosts={userPosts}
            profileId={profileId}
            isOwnProfile={isOwnProfile}
            onEditPost={onEditPost}
            hasNextPage={hasMoreUserPosts}
            isFetchingNextPage={isFetchingMoreUserPosts}
            fetchNextPage={fetchMoreUserPosts}
          />
        )}
        {activeTab === 'inspirations' && (
          <ProfileInspirations savedPosts={savedPosts} username={profile.username} />
        )}
        {activeTab === 'community' && (
          <ProfileCommunity
            profileId={profileId}
            followersCount={profile.followers_count}
            followingCount={profile.following_count}
          />
        )}
        {activeTab === 'stats' && <ProfileStats />}
      </div>
    </div>
  )
}
