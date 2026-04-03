/**
 * ProfileCommunity — Onglet "Communauté" du profil
 *
 * Toggle pills : "Migrateurs [count]" | "Migrations [count]"
 * Affiche des cartes utilisateurs avec bannière, avatar, username et bouton Migrer.
 *
 * Les données sont issues des mockUsers — en production, remplacer par
 * followService.getFollowers(userId) / followService.getFollowing(userId).
 *
 * TODO [BACKEND] — Pagination server-side (max 20 par page)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { mockUsers } from '@/data/mock/mockUsers'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

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
  username: string
  avatar: string
  banner: string
}

/**
 * Carte utilisateur : bannière (cropped), avatar + username + bouton Migrer.
 */
function UserCard({ username, avatar, banner }: UserCardProps) {
  const { t } = useTranslation()
  const [isFollowing, setIsFollowing] = useState(false)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-cream-lighter">
      {/* Bannière cropped (~80px) */}
      <div className="h-16 relative overflow-hidden bg-gradient-to-br from-primary/20 to-teal-dark/30">
        {banner && (
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        )}
      </div>

      {/* Contenu sous la bannière */}
      <div className="p-3 flex items-center gap-2">
        {/* Avatar */}
        <div className="size-10 rounded-full border-2 border-cream-lighter overflow-hidden bg-primary-light shrink-0 -mt-7">
          {avatar ? (
            <img src={avatar} alt={username} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="size-full flex items-center justify-center">
              <User className="size-5 text-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Username + bouton */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{username}</p>
          <button
            type="button"
            onClick={() => setIsFollowing((f) => !f)}
            aria-pressed={isFollowing}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isFollowing
                ? 'bg-cream border border-border text-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {isFollowing ? t('profile.migrating') : t('profile.migrer')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Onglet Communauté : toggle Migrateurs/Migrations + liste de cartes utilisateurs.
 */
export function ProfileCommunity({ followersCount, followingCount }: ProfileCommunityProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<CommunityTab>('migrateurs')

  // Pour le mock, on affiche les mêmes utilisateurs dans les deux listes
  const displayedUsers = mockUsers.slice(0, 4)

  const isEmpty = displayedUsers.length === 0

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* ── Toggle pills Migrateurs / Migrations ── */}
      <div
        className="flex items-center gap-2 p-1 bg-cream rounded-full self-start"
        role="group"
        aria-label="Afficher Migrateurs ou Migrations"
      >
        <button
          type="button"
          onClick={() => setActiveTab('migrateurs')}
          aria-pressed={activeTab === 'migrateurs'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === 'migrateurs'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('profile.community.migrateursList')}
          <span className="text-xs text-muted-foreground">{followersCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('migrations')}
          aria-pressed={activeTab === 'migrations'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === 'migrations'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('profile.community.migrationsList')}
          <span className="text-xs text-muted-foreground">{followingCount}</span>
        </button>
      </div>

      {/* ── Liste des utilisateurs ── */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <img
            src={hermineEmptyState}
            alt=""
            className="w-28 h-28 opacity-60"
            loading="lazy"
            width={112}
            height={112}
          />
          <p className="text-sm text-muted-foreground text-center">
            {activeTab === 'migrateurs'
              ? t('profile.community.noMigrateurs')
              : t('profile.community.noMigrations')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" role="list">
          {displayedUsers.map((user) => (
            <div key={user.id} role="listitem">
              <UserCard username={user.username} avatar={user.avatar} banner={user.banner} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
