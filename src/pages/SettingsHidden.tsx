/**
 * SettingsHidden, Page de gestion des publications masquees
 *
 * Permet a l user de voir la liste des posts qu il a masques individuellement
 * et de les reafficher (action inverse de "Masquer cette publication" depuis
 * PostOptionsMenu). Different du blocage user qui se gere dans SettingsBlocked.
 *
 * UX :
 *  - Header sticky avec back button et titre
 *  - Etat vide explicite (rien a masquer = bon signe)
 *  - Liste de cartes avec thumbnail post + auteur + bouton "Reafficher"
 *  - Action inverse en un clic avec optimistic UI + toast confirmation
 *  - Skeleton pendant le loading initial
 *
 * Eco-conception :
 *  - Pagination 50 cote serveur (raisonnable pour une liste de masquages)
 *  - Lazy load des images via OptimizedImage avec preset thumbnail
 *  - Pas de scroll infini, pagination explicite si > 50 (rare)
 *
 * A11y :
 *  - Liste semantique role="list" + listitem
 *  - Boutons aria-label complets ("Reafficher la publication de @user")
 *  - Toast d action en aria-live polite via ToastContext
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, EyeOff, Eye } from 'lucide-react'
import { useHiddenPostsList, useUnhidePost } from '@/hooks/useHiddenPosts'
import { useToast } from '@/contexts/ToastContext'
import { safeDetail } from '@/lib/sanitizeError'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ImagePresets } from '@/lib/supabaseImage'
import hermineIcon from '@/assets/images/hermine-icon.png'

// ─── Composant principal ─────────────────────────────────────────────────────

export default function SettingsHidden() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { success: notifySuccess, error: notifyError } = useToast()
  const { data: hidden, isLoading } = useHiddenPostsList()
  const unhide = useUnhidePost()

  usePageTitle(t('settings.hidden.pageTitle', { defaultValue: 'Publications masquees' }))

  async function handleUnhide(postId: string, authorUsername: string) {
    try {
      await unhide.mutateAsync({ postId })
      notifySuccess(
        t('settings.hidden.unhideSuccess', {
          username: authorUsername,
          defaultValue: `Publication de @${authorUsername} reaffichee dans ton feed.`,
        }),
      )
    } catch (err) {
      notifyError(
        t('settings.hidden.unhideError', {
          defaultValue: 'Impossible de reafficher cette publication.',
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
            {t('settings.hidden.title', { defaultValue: 'Publications masquees' })}
          </h1>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-4 pb-24 md:pb-6"
      >
        {/* Description introductive */}
        <p className="text-sm text-muted-foreground">
          {t('settings.hidden.description', {
            defaultValue:
              'Les publications masquees ne s affichent plus dans ton feed. Tu peux les reafficher a tout moment.',
          })}
        </p>

        {/* ── Etats ── */}
        {isLoading ? (
          <HiddenSkeleton />
        ) : !hidden || hidden.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {hidden.map((row) => (
              <li key={row.post_id}>
                <HiddenPostCard
                  row={row}
                  isUnhiding={unhide.isPending && unhide.variables?.postId === row.post_id}
                  onUnhide={() => handleUnhide(row.post_id, row.author_username)}
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

interface HiddenPostCardProps {
  row: {
    post_id: string
    preview: string
    cover_url: string | null
    author_username: string
    author_avatar: string | null
    hidden_at: string
  }
  isUnhiding: boolean
  onUnhide: () => void
}

function HiddenPostCard({ row, isUnhiding, onUnhide }: HiddenPostCardProps) {
  const { t, i18n } = useTranslation()
  const hiddenAt = new Date(row.hidden_at).toLocaleDateString(
    i18n.language === 'en' ? 'en-US' : 'fr-FR',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  )

  return (
    <article className="bg-background border-[0.5px] border-border rounded-card overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Thumbnail post, fallback gris si pas de cover */}
        <div className="size-20 shrink-0 rounded-md overflow-hidden bg-[var(--color-action-light)]">
          {row.cover_url ? (
            <img
              src={ImagePresets.thumbnail(row.cover_url)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center">
              <EyeOff className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Contenu : auteur + preview + date */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <img
              src={row.author_avatar ? ImagePresets.avatarSmall(row.author_avatar) : hermineIcon}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="size-5 rounded-full object-cover border border-border"
            />
            <span className="text-xs font-bold text-foreground truncate">
              @{row.author_username}
            </span>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{row.preview}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.hidden.hiddenSince', {
              date: hiddenAt,
              defaultValue: `Masquee le ${hiddenAt}`,
            })}
          </p>
        </div>
      </div>

      {/* Action : reafficher */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onUnhide}
          disabled={isUnhiding}
          aria-label={t('settings.hidden.unhideAria', {
            username: row.author_username,
            defaultValue: `Reafficher la publication de @${row.author_username}`,
          })}
          className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Eye className="size-4" aria-hidden="true" />
          {isUnhiding
            ? t('common.loading', { defaultValue: 'Chargement...' })
            : t('settings.hidden.unhideAction', { defaultValue: 'Reafficher' })}
        </button>
      </div>
    </article>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="bg-background border-[0.5px] border-border rounded-card p-8 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
        <EyeOff className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold text-foreground">
        {t('settings.hidden.emptyTitle', { defaultValue: 'Aucune publication masquee' })}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t('settings.hidden.emptyBody', {
          defaultValue:
            'Tu n as masque aucune publication. Quand tu masques une publication depuis son menu, elle apparaitra ici pour pouvoir etre reaffichee.',
        })}
      </p>
    </div>
  )
}

function HiddenSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-background border-[0.5px] border-border rounded-card p-3 flex gap-3"
        >
          <div className="size-20 shrink-0 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
