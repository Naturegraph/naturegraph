/**
 * ProfileHeader — En-tete de la page profil
 *
 * Affiche la banniere, l'avatar avec badge emoji, le username,
 * la bio, la localisation, la date d'inscription, les stats,
 * les boutons d'action, les interets et les liens sociaux.
 *
 * Utilise en mode "own" (son propre profil) ou "visitor" (profil d'un autre).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MapPin,
  Calendar,
  Settings,
  UserPlus,
  UserCheck,
  MessageCircle,
  Instagram,
  ExternalLink,
  User,
  Edit3,
} from 'lucide-react'
import { INTEREST_LABELS } from '@/data/mockUsers'
import { getBadgeEmoji } from '@/utils/badgeHelpers'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  city: string | null
  region: string | null
  interests: string[]
  instagram: string | null
  twitter: string | null
  website: string | null
  followers_count: number
  following_count: number
  created_at: string
  badges: string[]
  stats: { observations: number; species: number; streak: number }
}

interface ProfileHeaderProps {
  /** Donnees du profil a afficher */
  profile: ProfileData
  /** True si c'est le profil de l'utilisateur connecte */
  isOwnProfile: boolean
}

// ─── Composant ───────────────────────────────────────────────────────────────

/** En-tete complet du profil : banniere, avatar, infos, stats, actions */
export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isFollowing, setIsFollowing] = useState(false)

  // Labels des interets pour l'affichage
  const interestLabels = profile.interests.map((i) => INTEREST_LABELS[i] ?? i)

  // Date d'inscription formatee
  const joinDate = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  // Localisation composee (ville, region)
  const location = [profile.city, profile.region].filter(Boolean).join(', ')

  return (
    <div className="bg-cream-lighter border-[0.5px] border-border rounded-card overflow-hidden">
      {/* Banniere — image ou gradient par defaut */}
      <div className="h-32 sm:h-44 relative">
        {profile.banner_url ? (
          <img
            src={profile.banner_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-teal-dark/40" />
        )}

        {/* Avatar positionne a cheval sur la banniere */}
        <div className="absolute left-6 bottom-[-32px]">
          <div className="size-20 sm:size-24 rounded-full border-3 border-cream-lighter overflow-hidden bg-primary-light relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={t('home.profile.avatarAlt', { name: profile.username })}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center">
                <User className="size-10 text-primary" aria-hidden="true" />
              </div>
            )}
            {/* Badge emoji sur l'avatar */}
            {profile.badges.length > 0 && (
              <div
                aria-hidden="true"
                className="absolute bottom-0 right-0 bg-cream-lighter rounded-full size-7 flex items-center justify-center"
              >
                <span className="text-base leading-none">{getBadgeEmoji(profile.badges[0])}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu sous la banniere */}
      <div className="pt-12 pb-6 px-6 flex flex-col gap-4">
        {/* Ligne username + compteurs */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile.username}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">{profile.followers_count}</strong>{' '}
                {t('profile.followers')}
              </span>
              <span>
                <strong className="text-foreground">{profile.following_count}</strong>{' '}
                {t('profile.following')}
              </span>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-button hover:opacity-90 transition-opacity"
                >
                  <Edit3 className="size-4" aria-hidden="true" />
                  {t('profile.editProfile')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  aria-label={t('nav.settings')}
                  className="size-9 flex items-center justify-center rounded-button border-[0.5px] border-border hover:bg-cream transition-colors"
                >
                  <Settings className="size-4 text-foreground" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-button transition-colors ${
                    isFollowing
                      ? 'bg-cream border-[0.5px] border-border text-foreground hover:bg-cream-lighter'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {isFollowing ? (
                    <UserCheck className="size-4" aria-hidden="true" />
                  ) : (
                    <UserPlus className="size-4" aria-hidden="true" />
                  )}
                  {isFollowing ? t('profile.following') : t('profile.follow')}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-button border-[0.5px] border-border hover:bg-cream transition-colors"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {t('profile.message')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>}

        {/* Localisation + date d'inscription */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" aria-hidden="true" />
            {t('profile.joinedDate', { date: joinDate })}
          </span>
        </div>

        {/* Stats : Observations / Especes / Jours */}
        <div className="grid grid-cols-3 gap-2 text-center py-3 border-y-[0.5px] border-border">
          <div className="flex flex-col gap-0.5">
            <p className="text-lg font-bold text-foreground">{profile.stats.observations}</p>
            <p className="text-xs text-muted-foreground">{t('home.profile.obs')}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-lg font-bold text-foreground">{profile.stats.species}</p>
            <p className="text-xs text-muted-foreground">{t('home.profile.species')}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-lg font-bold text-foreground">{profile.stats.streak}</p>
            <p className="text-xs text-muted-foreground">{t('home.profile.days')}</p>
          </div>
        </div>

        {/* Centres d'interets */}
        {interestLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interestLabels.map((label) => (
              <span
                key={label}
                className="bg-teal-dark/10 text-teal-dark text-xs px-2.5 py-0.5 rounded-button whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Liens sociaux */}
        {(profile.instagram || profile.twitter || profile.website) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="size-4" aria-hidden="true" />@{profile.instagram}
              </a>
            )}
            {profile.twitter && (
              <a
                href={`https://x.com/${profile.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span aria-hidden="true" className="text-xs font-bold">
                  𝕏
                </span>
                @{profile.twitter}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
