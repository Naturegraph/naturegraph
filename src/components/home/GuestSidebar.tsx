/**
 * GuestSidebar — Colonne gauche en mode invité
 *
 * Contient :
 * - CTA pour rejoindre Naturegraph
 * - Section "Migrateurs à suivre" avec deux modes :
 *   - Géolocalisé : utilisateurs populaires dans le territoire
 *   - Par défaut  : rotation quotidienne déterministe (change chaque jour)
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Users } from 'lucide-react'
import { getDailyRotation, getTerritoryUsers } from '@/data/mockUsers'
import type { MockUser } from '@/data/mockUsers'
import { getBadgeEmoji } from '@/utils/badgeHelpers'

// ─── Composant principal ──────────────────────────────────────────────────────

export function GuestSidebar() {
  const { t } = useTranslation()

  // Rotation quotidienne par défaut — stable dans la journée, change le lendemain
  const [migrateurs, setMigrateurs] = useState<MockUser[]>(() => getDailyRotation(3))
  const [regionLabel, setRegionLabel] = useState<string>('')

  // TODO [BACKEND] — Remplacer getDailyRotation et getTerritoryUsers par :
  //   profileService.getSuggestedUsersForGuest({ lat?, lon?, limit: 3 })
  //   Le back-end calcule : si coords → top users de la région, sinon → top daily (cached Redis/Supabase)
  //   Table concernée : `profiles` + agrégats sur `posts` (observations par région)
  //   La rotation quotidienne sera gérée par une edge function Supabase (cron daily).

  // Détection silencieuse de la géolocalisation (pas de demande de permission)
  // Si la permission était déjà accordée → on affiche les utilisateurs du territoire
  useEffect(() => {
    if (!navigator.permissions || !navigator.geolocation) return

    navigator.permissions
      .query({ name: 'geolocation' })
      .then(({ state }) => {
        if (state !== 'granted') return
        navigator.geolocation.getCurrentPosition((pos) => {
          const { users, region } = getTerritoryUsers(pos.coords.latitude, pos.coords.longitude, 3)
          setMigrateurs(users)
          setRegionLabel(region)
        })
      })
      .catch(() => {
        // Permissions API non supportée — on garde la rotation quotidienne
      })
  }, [])

  const subtitle = regionLabel
    ? t('home.sidebar.migratorsTerritory', { region: regionLabel })
    : t('home.sidebar.migratorsDaily')

  return (
    <div className="flex flex-col gap-4">
      {/* CTA — rejoindre Naturegraph */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h5 className="text-foreground">{t('home.sidebar.joinTitle')}</h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('home.sidebar.joinDescription')}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to="/signup"
            className="bg-primary flex items-center justify-center h-12 px-6 rounded-button text-primary-foreground font-bold hover:opacity-90 transition-opacity motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('home.sidebar.createAccount')}
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center h-12 px-6 rounded-button border border-border text-foreground hover:border-foreground/40 transition-colors motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('home.sidebar.login')}
          </Link>
        </div>
      </div>

      {/* Migrateurs à suivre */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        {/* Titre + sous-titre */}
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
            <Users className="size-4 text-white" aria-hidden="true" />
          </div>
          <p className="font-bold">{t('home.sidebar.migratorsTitle')}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-5 pl-11">{subtitle}</p>

        {/* Liste */}
        <div className="flex flex-col gap-4">
          {migrateurs.map((user) => (
            <Link
              key={user.id}
              to="/signup"
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

              {/* Nom + tags */}
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
