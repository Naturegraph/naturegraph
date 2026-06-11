/**
 * SettingsBlocked, Page de gestion des comptes bloques
 *
 * Permet a l user de voir la liste des comptes qu il a bloques et de les
 * debloquer (action inverse de "Bloquer cet utilisateur" depuis ProfileOptions
 * ou PostOptionsMenu).
 *
 * Different du masquage de post : ici on debloque un compte entier, donc tous
 * ses posts et son profil redeviennent visibles dans le feed.
 *
 * UX :
 *  - Header sticky back + titre
 *  - Etat vide explicite
 *  - Liste cartes avec avatar + username + date de blocage + bouton "Debloquer"
 *  - Confirmation soft via toast (action reversible, pas besoin de modale)
 *  - Optimistic UI sur le deblocage
 *
 * A11y :
 *  - Liste semantique
 *  - aria-label boutons complets
 *  - Toast d action en aria-live polite
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ShieldOff, ShieldCheck } from 'lucide-react'
import { useBlockedUsers, useUnblock } from '@/hooks/useBlocks'
import { useToast } from '@/contexts/ToastContext'
import { safeDetail } from '@/lib/sanitizeError'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ImagePresets } from '@/lib/supabaseImage'
import hermineIcon from '@/assets/images/hermine-icon.png'

// ─── Composant principal ─────────────────────────────────────────────────────

export default function SettingsBlocked() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { success: notifySuccess, error: notifyError } = useToast()
  const { data: blocked, isLoading } = useBlockedUsers()
  const unblock = useUnblock()

  usePageTitle(t('settings.blocked.pageTitle', { defaultValue: 'Comptes bloques' }))

  async function handleUnblock(userId: string, username: string) {
    try {
      await unblock.mutateAsync(userId)
      notifySuccess(
        t('settings.blocked.unblockSuccess', {
          username,
          defaultValue: `@${username} a ete debloque.`,
        }),
      )
    } catch (err) {
      notifyError(
        t('settings.blocked.unblockError', {
          defaultValue: 'Impossible de debloquer ce compte.',
        }),
        safeDetail(err),
      )
    }
  }

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back', { defaultValue: 'Retour' })}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="font-bold text-foreground text-base truncate">
            {t('settings.blocked.title', { defaultValue: 'Comptes bloques' })}
          </h1>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-4 pb-24 md:pb-6"
      >
        <p className="text-sm text-muted-foreground">
          {t('settings.blocked.description', {
            defaultValue:
              'Les comptes bloques ne peuvent pas voir ton profil ni interagir avec tes publications. Tu peux les debloquer a tout moment.',
          })}
        </p>

        {isLoading ? (
          <BlockedSkeleton />
        ) : !blocked || blocked.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {blocked.map((row) => (
              <li key={row.user_id}>
                <BlockedUserCard
                  row={row}
                  isUnblocking={unblock.isPending && unblock.variables === row.user_id}
                  onUnblock={() => handleUnblock(row.user_id, row.username || 'utilisateur')}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface BlockedUserCardProps {
  row: {
    user_id: string
    username: string
    avatar_url: string | null
    blocked_at: string
  }
  isUnblocking: boolean
  onUnblock: () => void
}

function BlockedUserCard({ row, isUnblocking, onUnblock }: BlockedUserCardProps) {
  const { t, i18n } = useTranslation()
  const blockedAt = new Date(row.blocked_at).toLocaleDateString(
    i18n.language === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )
  const displayName =
    row.username || t('settings.blocked.unknownUser', { defaultValue: 'Compte inconnu' })

  return (
    <article className="bg-background border-[0.5px] border-border rounded-card p-3 flex items-center gap-3">
      {/* Avatar */}
      <img
        src={row.avatar_url ? ImagePresets.avatarSmall(row.avatar_url) : hermineIcon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="size-12 rounded-full object-cover border border-border shrink-0"
      />

      {/* Infos */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-bold text-foreground truncate">@{displayName}</span>
        <span className="text-xs text-muted-foreground">
          {t('settings.blocked.blockedSince', {
            date: blockedAt,
            defaultValue: `Bloque le ${blockedAt}`,
          })}
        </span>
      </div>

      {/* Action debloquer */}
      <button
        type="button"
        onClick={onUnblock}
        disabled={isUnblocking}
        aria-label={t('settings.blocked.unblockAria', {
          username: displayName,
          defaultValue: `Debloquer @${displayName}`,
        })}
        className="shrink-0 h-9 px-4 inline-flex items-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ShieldCheck className="size-4" aria-hidden="true" />
        {isUnblocking
          ? t('common.loading', { defaultValue: 'Chargement...' })
          : t('settings.blocked.unblockAction', { defaultValue: 'Debloquer' })}
      </button>
    </article>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="bg-background border-[0.5px] border-border rounded-card p-8 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
        <ShieldOff className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold text-foreground">
        {t('settings.blocked.emptyTitle', { defaultValue: 'Aucun compte bloque' })}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t('settings.blocked.emptyBody', {
          defaultValue:
            'Tu n as bloque aucun compte. Si tu rencontres un comportement inapproprie, tu peux bloquer un user depuis son profil ou un de ses posts.',
        })}
      </p>
    </div>
  )
}

function BlockedSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-background border-[0.5px] border-border rounded-card p-3 flex items-center gap-3"
        >
          <div className="size-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  )
}
