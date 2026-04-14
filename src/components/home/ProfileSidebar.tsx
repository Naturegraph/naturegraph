/**
 * ProfileSidebar — Colonne gauche en mode connecté
 *
 * Affiche :
 * - Bannière + avatar + username
 * - Centres d'intérêts (badges depuis profile.interests)
 * - Statistiques réelles (observations, espèces, streak) via Supabase
 * - Objectif personnel (progression hebdomadaire réelle)
 * - Section "Migrateurs à suivre" (suggestions personnalisées >= 3 disponibles)
 *
 * Accessibilité :
 * - progressbar avec aria-valuenow / aria-valuemin / aria-valuemax
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { INTEREST_LABELS } from '@/constants/interests'
import { useUserStats, useUserStreak, useWeekProgress } from '@/hooks/useStats'
import { useSuggestedUsers } from '@/hooks/useProfile'

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProfileSidebar() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const { locationLabel } = useLocation()

  // IDs des intérêts pour l'affichage
  const interestIds = profile?.interests ?? []
  const interestLabels = interestIds.map((i) => INTEREST_LABELS[i] ?? i)

  // Extraire la région du locationLabel ("Ville, Région" → "Région")
  const region = locationLabel.includes(',')
    ? (locationLabel.split(',').pop()?.trim() ?? null)
    : null

  // ── Données Supabase ──────────────────────────────────────────────────────
  const { data: userStats } = useUserStats(profile?.id)
  const { data: streak } = useUserStreak(profile?.id)
  const { data: weekProgress } = useWeekProgress(profile?.id)
  const { data: suggestedUsers, isLoading: suggestionsLoading } = useSuggestedUsers(
    profile?.id,
    interestIds,
    region,
  )

  const observations = userStats?.postsCount ?? profile?.posts_count ?? 0
  const species = userStats?.uniqueSpeciesCount ?? 0
  const streakDays = streak ?? 0

  const weekCurrent = weekProgress?.current ?? 0
  const weekGoal = weekProgress?.goal ?? 5
  const progressPercent =
    weekGoal > 0 ? Math.min(100, Math.round((weekCurrent / weekGoal) * 100)) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Carte profil */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card overflow-hidden">
        {/* Bannière */}
        <div className="h-20 bg-[var(--color-action-light)] relative">
          <div className="absolute left-6 bottom-[-24px]">
            <div className="size-14 rounded-full border-2 border-cream-lighter overflow-hidden bg-primary-light">
              <img
                src={profile?.avatar_url ?? hermineIcon}
                alt={t('home.profile.avatarAlt', { name: profile?.username })}
                className="size-full object-cover"
              />
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
              <p className="font-bold text-foreground">{observations}</p>
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.obs')}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground">{species}</p>
              <p className="text-xs text-muted-foreground tracking-[0.48px]">
                {t('home.profile.species')}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground">{streakDays}</p>
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
                {weekCurrent}/{weekGoal}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={weekCurrent}
              aria-valuemin={0}
              aria-valuemax={weekGoal}
              aria-label={t('home.profile.progressLabel', {
                current: weekCurrent,
                goal: weekGoal,
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

      {/* Migrateurs à suivre — suggestions personnalisées ou état vide */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
            <Users className="size-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold">{t('home.sidebar.migratorsTitle')}</p>
            {/* Sous-titre contextuel : région si localisé, sinon global */}
            {suggestedUsers && suggestedUsers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {region
                  ? t('home.sidebar.migratorsTerritory', { region })
                  : t('home.sidebar.migratorsDaily')}
              </p>
            )}
          </div>
        </div>

        {/* Skeleton de chargement */}
        {suggestionsLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions (>= 3 disponibles) */}
        {!suggestionsLoading && suggestedUsers && suggestedUsers.length >= 3 && (
          <div className="flex flex-col gap-3">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link
                  to={`/profile/${user.username}`}
                  className="size-10 rounded-full overflow-hidden bg-primary-light shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <img
                    src={user.avatar_url ?? hermineIcon}
                    alt={user.username}
                    className="size-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${user.username}`}
                    className="font-bold text-sm text-foreground truncate block hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    {user.username}
                  </Link>
                  <p className="text-xs text-muted-foreground tracking-[0.48px]">
                    {t('home.sidebar.migratorsObsCount', { count: user.posts_count })}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 h-7 px-3 rounded-button bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  aria-label={`${t('home.sidebar.migratorsFollow')} ${user.username}`}
                >
                  <UserPlus className="size-3" aria-hidden="true" />
                  {t('home.sidebar.migratorsFollow')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* État vide — moins de 3 suggestions */}
        {!suggestionsLoading && (!suggestedUsers || suggestedUsers.length < 3) && (
          <p className="text-xs text-muted-foreground pl-11">{t('home.sidebar.migratorsEmpty')}</p>
        )}
      </div>
    </div>
  )
}
