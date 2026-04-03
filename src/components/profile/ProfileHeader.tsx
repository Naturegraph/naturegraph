/**
 * ProfileHeader — En-tête de la page profil
 *
 * Design Figma : bannière pleine largeur (~160px), avatar centré chevauchant
 * le bas de la bannière, username centré, stats Migrateurs/Migrations,
 * boutons d'action en ligne.
 *
 * Modes :
 *  - isOwnProfile = true  → bouton "Modifier le profil" (crayon) + partage + options
 *  - isOwnProfile = false → bouton "Migrer" / "Tu migres avec" + partage + options
 *
 * Les callbacks onEditProfile, onShare, onOptions sont gérés dans Profile.tsx.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Share2, MoreHorizontal, User } from 'lucide-react'
import { getBadgeEmoji } from '@/utils/badgeHelpers'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Données minimales nécessaires pour afficher l'en-tête du profil */
export interface ProfileDisplayData {
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  city: string | null
  region: string | null
  interests: Array<{ id: string; percent: number }>
  instagram: string | null
  website: string | null
  followers_count: number
  following_count: number
  created_at: string
  badges: string[]
  stats: { observations: number; species: number; streak: number }
  weekProgress?: { current: number; goal: number }
}

interface ProfileHeaderProps {
  /** Données du profil à afficher */
  profile: ProfileDisplayData
  /** True si c'est le profil de l'utilisateur connecté */
  isOwnProfile: boolean
  /** Callback ouverture panneau édition */
  onEditProfile?: () => void
  /** Callback ouverture feuille de partage */
  onShare?: () => void
  /** Callback ouverture menu options */
  onOptions?: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * En-tête complète du profil : bannière, avatar avec badge, username centré,
 * compteurs Migrateurs/Migrations, boutons d'action.
 */
export function ProfileHeader({
  profile,
  isOwnProfile,
  onEditProfile,
  onShare,
  onOptions,
}: ProfileHeaderProps) {
  const { t } = useTranslation()
  const [isFollowing, setIsFollowing] = useState(false)

  /** Emoji badge de la première catégorie d'intérêt */
  const badgeEmoji = profile.badges.length > 0 ? getBadgeEmoji(profile.badges[0]) : null

  return (
    <div className="w-full">
      {/* ── Bannière ── */}
      <div className="h-40 relative overflow-hidden bg-gradient-to-br from-primary/30 via-primary/20 to-teal-dark/40">
        {profile.banner_url && (
          <img
            src={profile.banner_url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Avatar chevauchant la bannière — centré horizontalement */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
          <div className="relative">
            {/* Cercle avatar 80px avec bordure cream */}
            <div className="size-20 rounded-full border-2 border-cream-lighter overflow-hidden bg-primary-light">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={t('home.profile.avatarAlt', { name: profile.username })}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <User className="size-8 text-primary" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Badge emoji en bas à droite de l'avatar */}
            {badgeEmoji && (
              <div
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 bg-cream-lighter rounded-full size-6 flex items-center justify-center shadow-sm"
              >
                <span className="text-sm leading-none">{badgeEmoji}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu sous la bannière ── */}
      <div className="pt-14 pb-4 px-4 flex flex-col items-center gap-3">
        {/* Username */}
        <h1 className="text-xl font-bold text-foreground text-center">{profile.username}</h1>

        {/* Stats Migrateurs | Migrations */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground font-semibold">{profile.followers_count}</strong>{' '}
            {t('profile.migrateurs')}
          </span>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <span>
            <strong className="text-foreground font-semibold">{profile.following_count}</strong>{' '}
            {t('profile.migrations')}
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            /* Propre profil : modifier + partager + options */
            <>
              <button
                type="button"
                onClick={onEditProfile}
                className="flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Pencil className="size-4" aria-hidden="true" />
                {t('profile.editProfile')}
              </button>
              <button
                type="button"
                onClick={onShare}
                aria-label={t('profile.share')}
                className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Share2 className="size-4 text-foreground" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOptions}
                aria-label={t('profile.options')}
                className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MoreHorizontal className="size-4 text-foreground" aria-hidden="true" />
              </button>
            </>
          ) : (
            /* Profil visiteur : migrer + partager + options */
            <>
              <button
                type="button"
                onClick={() => setIsFollowing((f) => !f)}
                className={`flex items-center gap-2 h-10 px-5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isFollowing
                    ? 'bg-cream border border-border text-foreground hover:bg-cream-lighter'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
                aria-pressed={isFollowing}
              >
                {isFollowing ? <>🦅 {t('profile.migrating')}</> : <>🦅 {t('profile.migrer')}</>}
              </button>
              <button
                type="button"
                onClick={onShare}
                aria-label={t('profile.share')}
                className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Share2 className="size-4 text-foreground" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOptions}
                aria-label={t('profile.options')}
                className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MoreHorizontal className="size-4 text-foreground" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
