/**
 * ProfileSidebar : Colonne gauche en mode connecté
 *
 * Layout pixel-perfect Figma (node 6385-92647) :
 *   - Avatar sur bannière + badge emoji du centre d'intérêt principal (absolute)
 *   - Nom d'utilisateur seul (pas d'email)
 *   - 2 centres d'intérêt secondaires (ordre des préférences)
 *   - Stats cards blanches avec icône Lucide + valeur + label
 *   - Objectif semaine avec progress bar en gradient de chaleur
 *     (bleu froid → violet → orange → rouge selon la proximité de l'objectif)
 *
 * Données :
 *   - Toutes dynamiques depuis AuthContext + hooks Supabase (useUserStats,
 *     useUserStreak, useWeekProgress)
 *   - Update automatique via React Query invalidation
 *
 * Accessibilité :
 *   - progressbar avec aria-valuenow / aria-valuemin / aria-valuemax
 *   - Cards stats : icônes aria-hidden (décoratives), label lisible
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UsersRound, ChevronRight, Bird, ClipboardList, Flame } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { INTEREST_CONFIG } from '@/constants/interests'
import { useUserStats, useUserStreak, useWeekProgress } from '@/hooks/useStats'
import { useSuggestedUsers } from '@/hooks/useProfile'

// ─── Sous-composants ──────────────────────────────────────────────────────────

/**
 * Stat card : fond blanc, icône colorée, valeur en gros, label discret.
 * Utilisée pour observations / espèces / streak.
 */
function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Bird
  value: number
  label: string
  tone: 'primary' | 'teal' | 'warning'
}) {
  // Figma : primary + teal = action-light (#E7E9F7) ; streak = warning-bg (#FEE1C8)
  const toneCls: Record<typeof tone, string> = {
    primary: 'bg-[var(--color-action-light)] text-primary',
    teal: 'bg-[var(--color-action-light)] text-teal-dark',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  }
  return (
    <div className="bg-white rounded-md p-2 flex flex-col items-center justify-center gap-2 text-center">
      <span
        aria-hidden="true"
        className={`size-7 rounded-full flex items-center justify-center ${toneCls[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-col items-center gap-1">
        <p className="font-heading font-bold text-lg leading-none text-foreground">{value}</p>
        <p className="text-[10px] text-foreground tracking-[0.04em] leading-none">{label}</p>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProfileSidebar() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { locationLabel } = useLocation()

  // ── Centres d'intérêt ──────────────────────────────────────────────────────
  // Ordre = ordre de sélection côté profil (préférence utilisateur)
  const interestIds = profile?.interests ?? []
  const primaryInterest = interestIds[0]
  const secondaryInterests = interestIds.slice(1, 3) // 2 centres secondaires max

  // ── Extraction région depuis locationLabel ("Ville, Région" → "Région") ───
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

  // Obs = CUMUL d'observations d'especes (carnets inclus), Nicolas 2026-06-09.
  // Fallback posts_count si la stat n'est pas encore chargee.
  const observations = userStats?.obsCount ?? profile?.posts_count ?? 0
  const species = userStats?.uniqueSpeciesCount ?? 0
  const streakDays = streak ?? 0

  const weekCurrent = weekProgress?.current ?? 0
  const weekGoal = weekProgress?.goal ?? 5
  const progressPercent =
    weekGoal > 0 ? Math.min(100, Math.round((weekCurrent / weekGoal) * 100)) : 0

  /**
   * Gradient de chaleur : Figma : jaune → orange.
   * Clip-path révèle le fill à `progressPercent%` ; la teinte au bord droit
   * du fill reflète l'intensité de progression vers l'objectif.
   *   0%   : jaune  (#FFDF20)
   *   100% : orange (#FF8904)
   */
  const heatGradient = 'linear-gradient(90deg, #FFDF20 0%, #FF8904 100%)'

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Carte profil ─────────────────────────────────────────────────── */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card overflow-hidden">
        {/* Bannière + avatar avec badge d'intérêt principal.
            Affiche `profile.banner_url` si l'utilisateur en a uploadé une,
            sinon fallback sur le bleu violet doux du DS (Nicolas 2026-05-23). */}
        <div
          className="h-20 bg-[var(--color-action-light)] relative bg-cover bg-center"
          style={
            profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : undefined
          }
        >
          <div className="absolute left-6 bottom-[-32px]">
            <div className="relative">
              <div className="size-16 rounded-full border-4 border-cream-lighter overflow-hidden bg-primary-light">
                <img
                  src={profile?.avatar_url ?? hermineIcon}
                  alt={t('home.profile.avatarAlt', { name: profile?.username })}
                  className="size-full object-cover"
                />
              </div>
              {/* Badge centre d'intérêt #1 : toujours visible, jamais clippé */}
              {primaryInterest && INTEREST_CONFIG[primaryInterest] && (
                <span
                  aria-label={INTEREST_CONFIG[primaryInterest].label}
                  title={INTEREST_CONFIG[primaryInterest].label}
                  className="absolute -bottom-0.5 -right-0.5 size-6 rounded-full bg-cream-lighter flex items-center justify-center text-sm shadow-sm"
                >
                  <span aria-hidden="true">{INTEREST_CONFIG[primaryInterest].emoji}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-12 pb-6 px-6 flex flex-col gap-4">
          {/* Nom (sans email) : H5 Quicksand 18px bold */}
          <p className="font-heading font-bold text-lg leading-tight text-foreground truncate">
            {profile?.username ?? 'Utilisateur'}
          </p>

          {/* Centres d'intérêt secondaires (2 max) : bg action-light */}
          {secondaryInterests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {secondaryInterests.map((id) => {
                const cfg = INTEREST_CONFIG[id]
                if (!cfg) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center bg-[var(--color-action-light)] text-foreground text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap tracking-[0.04em]"
                  >
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Stats cards : fond cream-lighter, icône pastille + valeur + label */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon={Bird}
              value={observations}
              label={t('home.profile.obs')}
              tone="primary"
            />
            <StatCard
              icon={ClipboardList}
              value={species}
              label={t('home.profile.species')}
              tone="teal"
            />
            <StatCard
              icon={Flame}
              value={streakDays}
              // FR : 0/1 -> singulier, 2+ -> pluriel (retour QA Nicolas)
              label={streakDays <= 1 ? 'Semaine' : 'Semaines'}
              tone="warning"
            />
          </div>

          {/* Objectif semaine : carte cream-lighter contenant barre gradient */}
          <div className="bg-cream-lighter rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground tracking-[0.04em]">
                {t('home.profile.thisWeek')}
              </p>
              <p className="text-xs text-foreground tracking-[0.04em]">
                {weekCurrent}/{weekGoal} {t('home.profile.obs').toLowerCase()}
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
              className="h-2 rounded-full bg-cream-lighter border-[0.5px] border-border overflow-hidden relative"
            >
              {/*
                Gradient figé sur 100% de largeur, révélé via clip-path à
                `progressPercent%`. Le bord droit visible du fill indique la
                "chaleur" (jaune = début, orange = objectif atteint).
              */}
              <div
                className="absolute inset-0 rounded-full transition-[clip-path] duration-500 motion-reduce:transition-none"
                style={{
                  backgroundImage: heatGradient,
                  clipPath: `inset(0 ${100 - progressPercent}% 0 0)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Migrateurs à suivre : suggestions personnalisées ───────────────
          Specs Figma node 6385-92712 :
           - Container : border 0.5px, rounded-card, padding 24px 0 (vertical)
             avec padding horizontal 24px appliqué au contenu uniquement.
           - Header : pastille teal-dark 32px + icon UsersRound 20px, titre
             Muli 400 16px (pas bold).
           - Items : gap vertical 16px, avatar 40px avec border 4px cream-lighter,
             badge intérêt principal 20px absolute en bas-droite de l'avatar,
             2 tags intérêts secondaires bg action-light, chevron droit dans
             cercle 32px border 0.5px.
           - 2 états : 3 migrateurs OU vide (pas d'état "moins de 3"). */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card py-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3 px-6">
          <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
            <UsersRound className="size-5 text-white" aria-hidden="true" />
          </div>
          <p className="text-base text-foreground">{t('home.sidebar.migratorsTitle')}</p>
        </div>

        {/* Loader : skeleton 3 items, même layout que l'état rempli */}
        {suggestionsLoading && (
          <div className="flex flex-col gap-4 px-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="size-8 rounded-full bg-muted shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* V1.1.4 QA round 11 (Nicolas 2026-06-02) : accepte 1, 2 ou 3
            migrateurs. Avant : exigeait exactement 3 -> Mobile affichait
            toujours vide car le service retournait parfois 1 ou 2. */}
        {!suggestionsLoading && suggestedUsers && suggestedUsers.length > 0 && (
          <ul className="flex flex-col gap-4 px-6">
            {suggestedUsers.slice(0, 3).map((user) => {
              // Intérêt principal (#1) → badge sur l'avatar
              const primaryId = user.interests?.[0]
              const primaryCfg = primaryId ? INTEREST_CONFIG[primaryId] : null
              // 2 centres d'intérêt secondaires (ordre préférence du migrateur)
              const secondaries = (user.interests ?? []).slice(1, 3)

              return (
                <li key={user.id}>
                  <Link
                    to={`/profile/${user.username}`}
                    aria-label={`${t('home.sidebar.migratorsOpenProfile', { username: user.username, defaultValue: 'Voir le profil de {{username}}' })}`}
                    className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 group"
                  >
                    {/* Avatar + badge intérêt principal */}
                    <div className="relative shrink-0">
                      <div className="size-10 rounded-full overflow-hidden bg-primary-light border-[3px] border-cream-lighter">
                        <img
                          src={user.avatar_url ?? hermineIcon}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                      {primaryCfg && (
                        <span
                          aria-label={primaryCfg.label}
                          title={primaryCfg.label}
                          className="absolute -right-1 -bottom-1 size-5 rounded-full bg-cream flex items-center justify-center text-[11px] leading-none shadow-sm"
                        >
                          <span aria-hidden="true">{primaryCfg.emoji}</span>
                        </span>
                      )}
                    </div>

                    {/* Colonne centrale : username + tags secondaires */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <p className="text-sm font-bold text-foreground truncate group-hover:underline">
                        {user.username}
                      </p>
                      {secondaries.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {secondaries.map((id) => {
                            const cfg = INTEREST_CONFIG[id]
                            if (!cfg) return null
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center bg-[var(--color-action-light)] text-foreground text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap tracking-[0.04em] leading-tight"
                              >
                                {cfg.label}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Chevron : indicateur navigation vers profil */}
                    <span
                      aria-hidden="true"
                      className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center shrink-0 text-foreground group-hover:bg-white transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/* État vide : 0 migrateur (rare, seulement si DB vide) */}
        {!suggestionsLoading && (!suggestedUsers || suggestedUsers.length === 0) && (
          <p className="text-xs text-muted-foreground px-6">{t('home.sidebar.migratorsEmpty')}</p>
        )}
      </div>
    </div>
  )
}
