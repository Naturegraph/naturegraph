/**
 * GuestSidebar — Colonne gauche en mode invité
 *
 * Contient :
 * - CTA pour rejoindre Naturegraph
 * - Section "Migrateurs à suivre" (état vide — en attente du backend)
 *
 * TODO [BACKEND] — Brancher profileService.getSuggestedUsersForGuest({ lat?, lon?, limit: 3 })
 *   Table : `profiles` + agrégats sur `posts` (observations par région)
 *   Rotation quotidienne gérée par edge function Supabase (cron daily).
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'

// ─── Composant principal ──────────────────────────────────────────────────────

export function GuestSidebar() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      {/* CTA — inviter l'invité à créer un compte */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <p className="font-bold text-foreground mb-2">{t('home.sidebar.joinTitle')}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {t('home.sidebar.joinDescription')}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/signup"
            className="bg-primary flex items-center justify-center h-10 rounded-button text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('home.sidebar.createAccount')}
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center h-10 rounded-button border border-border text-foreground text-sm hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('home.sidebar.login')}
          </Link>
        </div>
      </div>

      {/* Migrateurs à suivre — état vide en attente du backend */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
            <Users className="size-4 text-white" aria-hidden="true" />
          </div>
          <p className="font-bold">{t('home.sidebar.migratorsTitle')}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2 pl-11">
          {t('home.sidebar.migratorsEmpty', {
            defaultValue: 'Bientôt, découvre les naturalistes actifs près de chez toi.',
          })}
        </p>
      </div>
    </div>
  )
}
