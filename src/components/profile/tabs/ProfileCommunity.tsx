/**
 * ProfileCommunity, Onglet "Communauté" du profil
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
 * Source de vérité : table `follows` + JOIN sur `profiles` (cf. followService).
 * Hooks utilisés : useFollowers / useFollowing / useToggleFollow.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TreeDeciduous } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ProfileEmptyState } from '../ProfileEmptyState'
import { useFollowers, useFollowing, useToggleFollow } from '@/hooks/useFollow'
import type { CommunityProfile } from '@/services/followService'

// ─── Types ────────────────────────────────────────────────────────────────────

type CommunityTab = 'migrateurs' | 'migrations'

interface ProfileCommunityProps {
  /** ID du profil affiché (pour requêter ses followers / following) */
  profileId: string
  /** Nombre de Migrateurs (followers) */
  followersCount: number
  /** Nombre de Migrations (following) */
  followingCount: number
}

// ─── Sous-composant : carte utilisateur ──────────────────────────────────────

interface UserCardProps {
  user: CommunityProfile
}

/**
 * Carte d'un utilisateur de la communauté, Figma 6385:76903.
 *   - Banner haut (cover, ratio ≈ 5:2)
 *   - Bottom : avatar + username + count, bouton Migrer à droite
 *   - Bordure 0.5px + rounded-md, fond background
 *
 * Le state local `isFollowing` est initialisé depuis `user.is_followed_by_me`
 * et synchronisé via `useToggleFollow` (optimistic + invalidation).
 */
function UserCard({ user }: UserCardProps) {
  const { t } = useTranslation()
  const [isFollowing, setIsFollowing] = useState(user.is_followed_by_me)
  const toggleFollow = useToggleFollow()

  async function handleToggle() {
    const previous = isFollowing
    setIsFollowing(!previous) // optimistic UI
    try {
      await toggleFollow.mutateAsync({
        targetUserId: user.id,
        currentlyFollowing: previous,
      })
    } catch {
      setIsFollowing(previous) // rollback
    }
  }

  return (
    <article className="flex flex-col rounded-md border-[0.5px] border-border bg-background overflow-hidden">
      {/* ── Banner cover ── (Nicolas 2026-05-24 : fallback bg-action-light
          au lieu de bg-cream pour que le bloc paraisse intentionnel quand
          l'user n'a pas encore uploadé de bannière, plutôt qu'un trou gris). */}
      <div className="aspect-[5/2] w-full overflow-hidden bg-[var(--color-action-light)] relative">
        {user.banner_url ? (
          <img
            src={user.banner_url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* ── Bottom row : avatar + username + count + bouton Migrer ── */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar circulaire, pas de débord, juste à côté du texte */}
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

        {/* Bouton Migrer / Migrating, circulaire, icône TreeDeciduous (cohérent
            avec le bouton Migrer du ProfileHeader). */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleFollow.isPending}
          aria-pressed={isFollowing}
          aria-label={
            isFollowing
              ? t('profile.migrating', { defaultValue: 'Vous migrez ensemble' })
              : t('profile.migrer', { defaultValue: 'Migrer avec ce profil' })
          }
          className={`shrink-0 size-9 rounded-full border-[0.5px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
            isFollowing
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              : 'bg-background text-foreground border-border hover:text-[var(--color-link)] hover:border-primary'
          }`}
        >
          {/* Même icône arbre dans les deux états, pleine quand on suit
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

export function ProfileCommunity({
  profileId,
  followersCount,
  followingCount,
}: ProfileCommunityProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<CommunityTab>('migrateurs')

  // BATCH 16 / T-079 : lazy load, charge UNIQUEMENT la liste de l'onglet
  // actif. Avant : 2 requetes en parallele toujours. Apres : 1 requete au
  // mount + 1 supplementaire au premier switch d'onglet (puis cache).
  const { data: followers, isLoading: loadingFollowers } = useFollowers(
    profileId,
    activeTab === 'migrateurs',
  )
  const { data: following, isLoading: loadingFollowing } = useFollowing(
    profileId,
    activeTab === 'migrations',
  )

  const displayedUsers: CommunityProfile[] =
    activeTab === 'migrateurs' ? (followers ?? []) : (following ?? [])
  const isLoading = activeTab === 'migrateurs' ? loadingFollowers : loadingFollowing
  const isEmpty = !isLoading && displayedUsers.length === 0

  return (
    // Pas de padding latéral ici : le parent (Profile.tsx → md:px-12) gère
    // l'alignement avec les cards et l'avatar, éviter le double padding.
    <div className="flex flex-col gap-6 pb-4 pt-2">
      {/* ── Toggle pills "Migrateurs / Migrations" ──
          Figma 6385:76904 :
            - active   : pill primary-light + texte primary + count primary
            - inactive : pill bordered cream + texte foreground + count muted
          Pills indépendantes (pas de container groupé), espace 12px. */}
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
                    "Ce profil n'a encore rejoint la migration de personne, reviens plus tard pour découvrir ses inspirations.",
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
 * Pill toggle individuelle, Figma 6385:77009.
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
      {/* Count : violet primary quand actif, muted sinon, Figma 6385:77009.
          Le label reste foreground dans les 2 cas. */}
      <span
        aria-hidden="true"
        className={`font-bold ${active ? 'text-[var(--color-link)]' : 'text-muted-foreground'}`}
      >
        {count}
      </span>
    </button>
  )
}
