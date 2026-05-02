/**
 * ProfileCommunity — Onglet "Communauté" du profil
 *
 * Toggle pills : Migrateurs (followers) | Migrations (following).
 * Liste de cartes utilisateurs avec :
 *   - Banner cover (image en haut, ratio paysage 16:7 environ)
 *   - Avatar + username + "{N} migrateurs" en bas
 *   - Bouton circulaire "Migrer" (TreeDeciduous icon) à droite
 *
 * Layout :
 *   - Mobile (< 768px) : 1 colonne, edge-to-edge
 *   - Tablet (md ≥ 768px) : 2 colonnes
 *   - Desktop (lg ≥ 1024px) : 3 colonnes
 *
 * État vide : card centrée (même style que ProfileFeed / ProfileInspirations)
 *   avec hermine + titre + sous-titre.
 *
 * Figma : 6385:76903 (desktop) / 6385:74108 (mobile).
 *
 * TODO [BACKEND] — Phase 2
 *   - followService.getFollowers(profileId, { cursor, limit: 20 })
 *   - followService.getFollowing(profileId, { cursor, limit: 20 })
 *   - useToggleFollow() pour le bouton (optimistic update sur followers_count)
 *   - Source de vérité : table `follows` + JOIN sur `profiles`
 *   - Voir second-agent/03-profil-backend-notes.md §1.2 et §5
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TreeDeciduous } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ProfileEmptyState } from '../ProfileEmptyState'
import {
  PROFILE_MOCK_FOLLOWERS,
  PROFILE_MOCK_FOLLOWING,
  type CommunityUser,
} from '@/data/mock/profileMock'

// ─── Types ────────────────────────────────────────────────────────────────────

type CommunityTab = 'migrateurs' | 'migrations'

interface ProfileCommunityProps {
  /** Nombre de Migrateurs (followers) */
  followersCount: number
  /** Nombre de Migrations (following) */
  followingCount: number
}

// ─── Sous-composant : carte utilisateur ──────────────────────────────────────

interface UserCardProps {
  user: CommunityUser
}

/**
 * Carte d'un utilisateur de la communauté — Figma 6385:76903.
 *   - Banner haut (cover, ratio ≈ 5:2)
 *   - Bottom : avatar + username + count, bouton Migrer à droite
 *   - Bordure 0.5px + rounded-md, fond background
 */
function UserCard({ user }: UserCardProps) {
  const { t } = useTranslation()
  const [isFollowing, setIsFollowing] = useState(user.is_followed_by_me)

  return (
    <article className="flex flex-col rounded-md border-[0.5px] border-border bg-background overflow-hidden">
      {/* ── Banner cover ── */}
      <div className="aspect-[5/2] w-full overflow-hidden bg-cream relative">
        <img
          src={user.banner_url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* ── Bottom row : avatar + username + count + bouton Migrer ── */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar circulaire — pas de débord, juste à côté du texte */}
        <img
          src={user.avatar_url || hermineIcon}
          alt={user.username}
          loading="lazy"
          className="size-10 rounded-full object-cover border border-border shrink-0"
        />

        {/* Nom + nombre de migrateurs */}
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="font-body font-bold text-sm text-foreground truncate">
            {user.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('profile.community.migrateursCount', {
              count: user.followers_count,
              defaultValue: `${user.followers_count} migrateurs`,
            })}
          </span>
        </div>

        {/* Bouton Migrer / Migrating — circulaire, icône TreeDeciduous (cohérent
            avec le bouton Migrer du ProfileHeader). */}
        <button
          type="button"
          onClick={() => setIsFollowing((f) => !f)}
          aria-pressed={isFollowing}
          aria-label={
            isFollowing
              ? t('profile.migrating', { defaultValue: 'Vous migrez ensemble' })
              : t('profile.migrer', { defaultValue: 'Migrer avec ce profil' })
          }
          className={`shrink-0 size-9 rounded-full border-[0.5px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            isFollowing
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              : 'bg-background text-foreground border-border hover:text-primary hover:border-primary'
          }`}
        >
          {/* Même icône arbre dans les deux états — pleine quand on suit
              (fill currentColor), creuse sinon. Communique visuellement
              "tu fais partie de la migration". */}
          <TreeDeciduous
            className="size-4"
            aria-hidden="true"
            fill={isFollowing ? 'currentColor' : 'none'}
          />
        </button>
      </div>
    </article>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProfileCommunity({ followersCount, followingCount }: ProfileCommunityProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<CommunityTab>('migrateurs')

  // TODO [BACKEND] — Remplacer par les hooks React Query (cf. doc backend) :
  //   const { data: followers } = useFollowers(profileId)
  //   const { data: following } = useFollowing(profileId)
  // En attendant : mocks pour itérer la UI au pixel-près sans Supabase.
  const displayedUsers: CommunityUser[] =
    activeTab === 'migrateurs' ? PROFILE_MOCK_FOLLOWERS : PROFILE_MOCK_FOLLOWING

  const isEmpty = displayedUsers.length === 0

  return (
    // Pas de padding latéral ici : le parent (Profile.tsx → md:px-12) gère
    // l'alignement avec les cards et l'avatar — éviter le double padding.
    <div className="flex flex-col gap-6 pb-4 pt-2">
      {/* ── Toggle pills "Migrateurs / Migrations" ──
          Figma 6385:76904 :
            - active   : pill primary-light + texte primary + count primary
            - inactive : pill bordered cream + texte foreground + count muted
          Pills indépendantes (pas de container groupé) — espace 12px. */}
      <div
        className="flex items-center gap-3 flex-wrap"
        role="group"
        aria-label={t('profile.community.toggleAria', {
          defaultValue: 'Afficher les migrateurs ou les migrations',
        })}
      >
        <PillToggle
          active={activeTab === 'migrateurs'}
          onClick={() => setActiveTab('migrateurs')}
          label={t('profile.community.migrateursList', { defaultValue: 'Migrateurs' })}
          count={followersCount}
        />
        <PillToggle
          active={activeTab === 'migrations'}
          onClick={() => setActiveTab('migrations')}
          label={t('profile.community.migrationsList', { defaultValue: 'Migrations' })}
          count={followingCount}
        />
      </div>

      {/* ── Liste / Grille / État vide ──────────────────────────────────────── */}
      {isEmpty ? (
        <ProfileEmptyState
          title={
            activeTab === 'migrateurs'
              ? t('profile.community.noMigrateursTitle', {
                  defaultValue: 'Pas encore de migrateurs',
                })
              : t('profile.community.noMigrationsTitle', {
                  defaultValue: 'Aucune migration partagée',
                })
          }
          subtitle={
            activeTab === 'migrateurs'
              ? t('profile.community.noMigrateursSubtitle', {
                  defaultValue:
                    "Les naturalistes qui suivent ce profil apparaîtront ici dès qu'ils rejoindront sa migration.",
                })
              : t('profile.community.noMigrationsSubtitle', {
                  defaultValue:
                    "Ce profil n'a encore rejoint la migration de personne — reviens plus tard pour découvrir ses inspirations.",
                })
          }
        />
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          role="list"
          aria-label={
            activeTab === 'migrateurs'
              ? t('profile.community.migrateursListAria', { defaultValue: 'Liste des migrateurs' })
              : t('profile.community.migrationsListAria', { defaultValue: 'Liste des migrations' })
          }
        >
          {displayedUsers.map((user) => (
            <div key={user.id} role="listitem">
              <UserCard user={user} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sous-composant : pill toggle (Migrateurs / Migrations) ───────────────────

interface PillToggleProps {
  active: boolean
  onClick: () => void
  label: string
  count: number
}

/**
 * Pill toggle individuelle — Figma 6385:77009.
 *
 * Style léger : count inline (pas de badge), typo medium (pas bold), pill
 * compacte. La couleur du compteur suit celle du label.
 *   - active   : bg-primary-light, texte primary
 *   - inactive : bg-background border 0.5px, texte foreground
 */
function PillToggle({ active, onClick, label, count }: PillToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        active
          ? 'bg-primary-light'
          : 'bg-background border-[0.5px] border-border hover:border-primary'
      }`}
    >
      <span>{label}</span>
      {/* Count : violet primary quand actif, muted sinon — Figma 6385:77009.
          Le label reste foreground dans les 2 cas. */}
      <span
        aria-hidden="true"
        className={`font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {count}
      </span>
    </button>
  )
}
