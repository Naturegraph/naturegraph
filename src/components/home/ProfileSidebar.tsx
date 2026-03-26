/**
 * ProfileSidebar — Colonne gauche en mode connecté
 *
 * Affiche :
 * - Bannière + avatar + username
 * - Centres d'intérêts (badges depuis profile.interests)
 * - Statistiques simples (observations, espèces, streak)
 * - Objectif personnel (progression hebdomadaire)
 * - Suggestions de migrateurs basées sur les intérêts communs
 *
 * Accessibilité :
 * - progressbar avec aria-valuenow / aria-valuemin / aria-valuemax
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, User, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getSuggestedUsersByInterests, INTEREST_LABELS } from '@/data/mockUsers'
import { getBadgeEmoji } from '@/utils/badgeHelpers'

// ─── Mock stats ───────────────────────────────────────────────────────────────
// TODO [BACKEND] — Stats utilisateur :
//   observations  → profile.posts_count (déjà dispo sur la table `profiles`, mis à jour par trigger)
//   species       → COUNT DISTINCT de species_identified sur la table `posts` pour cet user
//   streak        → calculé côté back-end (trigger ou edge function) → stocker dans `profiles.streak`
//   Ref: profileService.getProfileById() → étendre le retour avec ces champs agrégés

// TODO [BACKEND] — Objectif personnel (progression hebdomadaire) :
//   current → COUNT de posts de l'utilisateur sur les 7 derniers jours
//   goal    → champ `profiles.weekly_goal` (à ajouter au schéma, valeur par défaut 5)
//   Brancher via useQuery avec clé ['weekProgress', userId], staleTime: 1 heure

const WEEK_PROGRESS_CURRENT = 20 // TODO [BACKEND] — remplacer par données réelles
const WEEK_PROGRESS_GOAL = 24 // TODO [BACKEND] — remplacer par profile.weekly_goal

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProfileSidebar() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  // Intérêts → labels français pour les badges et le matching
  const interestLabels = (profile?.interests ?? []).map((i) => INTEREST_LABELS[i] ?? i)

  // TODO [BACKEND] — Remplacer par profileService.getUserStats(profile.id)
  // Retourne { observations, species, streak, weekProgress: { current, goal } }
  const stats = {
    observations: profile?.posts_count ?? 0,
    species: 48, // TODO [BACKEND] — COUNT DISTINCT species_identified depuis `posts`
    streak: 14, // TODO [BACKEND] — depuis profiles.streak (calculé par trigger)
  }

  const progressPercent = Math.round((WEEK_PROGRESS_CURRENT / WEEK_PROGRESS_GOAL) * 100)

  // TODO [BACKEND] — Remplacer par profileService.getSuggestedUsers(userId, { interests, limit: 3 })
  // Logique back-end : utilisateurs avec le plus d'intérêts communs + dans la même région
  // Table `follows` pour exclure les déjà suivis. Requête : RPC Supabase ou edge function.
  const suggestions = getSuggestedUsersByInterests(interestLabels, 3, profile?.id)

  return (
    <div className="flex flex-col gap-4">
      {/* Carte profil */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card overflow-hidden">
        {/* Bannière */}
        <div className="h-20 bg-gradient-to-br from-primary/30 to-teal-dark/40 relative">
          <div className="absolute left-6 bottom-[-24px]">
            <div className="size-14 rounded-full border-2 border-cream-lighter overflow-hidden bg-primary-light">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={t('home.profile.avatarAlt', { name: profile.username })}
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <User className="size-7 text-primary" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-10 pb-6 px-6 flex flex-col gap-4">
          {/* Nom + email */}
          <div>
            <p className="font-bold text-foreground truncate">
              {profile?.username ?? 'Utilisateur'}
            </p>
            {profile?.email && (
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            )}
          </div>

          {/* Centres d'intérêts */}
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

          {/* Stats : observations / espèces / streak */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground">{stats.observations}</p>
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.obs')}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground">{stats.species}</p>
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.species')}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground">{stats.streak}</p>
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.days')}
              </p>
            </div>
          </div>

          {/* Objectif personnel — progression hebdomadaire */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.thisWeek')}
              </p>
              <p className="text-xs font-bold text-foreground">
                {WEEK_PROGRESS_CURRENT}/{WEEK_PROGRESS_GOAL}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={WEEK_PROGRESS_CURRENT}
              aria-valuemin={0}
              aria-valuemax={WEEK_PROGRESS_GOAL}
              aria-label={t('home.profile.progressLabel', {
                current: WEEK_PROGRESS_CURRENT,
                goal: WEEK_PROGRESS_GOAL,
              })}
              className="h-2 rounded-full bg-border overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Migrateurs à suivre — basés sur les intérêts */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
            <Users className="size-4 text-white" aria-hidden="true" />
          </div>
          <p className="font-bold">{t('home.sidebar.migratorsTitle')}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-5 pl-11">
          {t('home.sidebar.migratorsInterests')}
        </p>

        <div className="flex flex-col gap-4">
          {suggestions.map((user) => (
            <Link
              key={user.id}
              to={`/profile/${user.username}`}
              className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              {/* Avatar */}
              <div className="size-10 shrink-0 relative">
                <div className="size-full rounded-full overflow-hidden">
                  <img src={user.avatar} alt={user.username} className="size-full object-cover" />
                </div>
                {user.badges.length > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute bg-cream-lighter bottom-[-2px] right-[-2px] flex items-center justify-center rounded-full size-[18px]"
                  >
                    <span className="text-[12px] leading-none">
                      {getBadgeEmoji(user.badges[0])}
                    </span>
                  </div>
                )}
              </div>

              {/* Nom + badges */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-foreground truncate mb-1">{user.username}</p>
                <div className="flex gap-1 flex-wrap">
                  {user.badges.slice(0, 2).map((badge, i) => (
                    <span
                      key={i}
                      className="bg-primary-light text-foreground text-xs px-2 py-0.5 rounded-button whitespace-nowrap"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chevron */}
              <div className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center shrink-0">
                <ChevronRight className="size-4 text-foreground" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
