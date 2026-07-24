/**
 * PostOptionsMenu : Menu contextuel d'un post (⋮)
 *
 * Deux modes selon l'auteur :
 *   isOwnPost = true  → Modifier, Copier le lien, Supprimer
 *   isOwnPost = false → Ne plus suivre, Favoris, Copier, Masquer user,
 *                       Masquer publication, Signaler
 *
 * Responsive :
 *   - Desktop : dropdown absolue positionnée par le parent `relative`
 *   - Mobile  : bottom sheet avec handle bar + backdrop
 *
 * Accessibilité :
 *   - role="menu" + role="menuitem"
 *   - Escape pour fermer
 *   - Focus sur le premier item à l'ouverture
 *
 * Actions fonctionnelles :
 *   - Copier le lien : Clipboard API + feedback visuel 2s
 *
 * Actions TODO [BACKEND] :
 *   - Unfollow, Favoris, Masquer, Signaler → endpoints dédiés
 *   - Supprimer → DELETE /posts/:id (avec confirmation)
 *   - Modifier  → navigate('/contribute/edit/:id')
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UserX,
  TreeDeciduous,
  Bookmark,
  BookmarkCheck,
  Link,
  VolumeX,
  EyeOff,
  Flag,
  Trash2,
  Check,
  Pencil,
} from 'lucide-react'
import { ReportModal } from './ReportModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { useBlock } from '@/hooks/useBlocks'
import { useToggleSavedPost, useSavedPostIds } from '@/hooks/useSavedPosts'
import { useIsFollowing, useToggleFollow } from '@/hooks/useFollow'
import { useHidePost } from '@/hooks/useHiddenPosts'
import { useDeletePost } from '@/hooks/usePost'
import { buildPostPath } from '@/lib/postSlug'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostOptionsMenuProps {
  /** ID du post : pour construire l'URL de partage et les requêtes API */
  postId: string
  /** Titre du post : utilisé comme base du slug URL partagé (rétro-compat
   *  si absent : URL = `/post/{uuid}` brut). */
  postTitle?: string
  /** Nom d'espèce : fallback slug si pas de titre. */
  postSpecies?: string | null
  /** Nom d'utilisateur de l'auteur (pour "Ne plus migrer avec @username") */
  authorUsername: string
  /** ID de l'auteur (uuid) : utilisé par follow/block (cible des actions) */
  authorId?: string
  /** true = post de l'utilisateur connecté */
  isOwnPost: boolean
  onClose: () => void
  /** Callback suppression : connecté à postService.deletePost via useDeletePost. */
  onDelete?: () => void
  /**
   * Callback édition : Nicolas 2026-05-24 : permet de rouvrir le panel de
   * création (Encounter ou Instant) pré-rempli avec les valeurs du post pour
   * que l'auteur puisse corriger ses observations (photos, détails, espèces).
   * Si absent, le bouton « Modifier » est masqué.
   */
  onEdit?: () => void
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  /** Variante destructive : texte + icône rouges */
  danger?: boolean
  /** Variante mise en avant : fond légèrement teinté */
  highlighted?: boolean
  itemRef?: React.RefObject<HTMLButtonElement>
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
  danger,
  highlighted,
  itemRef,
}: MenuItemProps) {
  return (
    <button
      ref={itemRef}
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
        danger
          ? 'hover:bg-red-50 text-red-600'
          : highlighted
            ? 'bg-primary-light/30 hover:bg-primary-light/50'
            : 'hover:bg-muted/40',
      ].join(' ')}
    >
      <span className={['shrink-0', danger ? 'text-red-500' : 'text-foreground'].join(' ')}>
        {icon}
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={[
            'text-sm font-semibold leading-tight',
            danger ? 'text-red-600' : 'text-foreground',
          ].join(' ')}
        >
          {label}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</span>
      </span>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PostOptionsMenu({
  postId,
  postTitle,
  postSpecies,
  authorUsername,
  authorId,
  isOwnPost,
  onClose,
  onDelete,
  onEdit,
}: PostOptionsMenuProps) {
  const { t } = useTranslation()
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  /**
   * Feedback visuel d'action persistée. Chaque item :
   *   - Affiche un check vert + label de confirmation pendant 1.2s
   *   - Ferme le menu ensuite (sauf "favorite" qui reste actif visuellement)
   * Les actions appellent les vrais services Supabase (saved_posts, follows,
   * blocks). Les erreurs sont silencieuses ici : un toast global devra être
   * ajouté dans une itération séparée.
   */
  const [actionedItem, setActionedItem] = useState<string | null>(null)
  const { data: savedIds } = useSavedPostIds()
  const isSavedFavorite = !!savedIds?.includes(postId)
  const toggleSaved = useToggleSavedPost()
  const { data: isCurrentlyFollowing } = useIsFollowing(authorId)
  const toggleFollow = useToggleFollow()
  const hidePostMutation = useHidePost()
  const blockMutation = useBlock()
  const deletePostMutation = useDeletePost()

  // Focus sur le premier item à l'ouverture
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fermer si clic en dehors du menu (desktop dropdown + mobile sheet).
  // 2026-05-19 : `click` post-React + selector `[role="menu"]` au lieu de
  // `mousedown` + `contains(ref)` : sinon les actions menu (Migrer, Favoris,
  // Copier, Masquer, Signaler) ne s'exécutent pas en mobile car onClose()
  // ferme le menu avant le click handler React.
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[role="menu"]')) return
      onClose()
    }
    const timer = setTimeout(() => document.addEventListener('click', fn), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', fn)
    }
  }, [onClose])

  /** Copie l'URL du post dans le presse-papier et affiche un feedback 2s */
  function handleCopyLink() {
    // Cohérence avec SharePopover : URL avec slug humain
    // « /post/grand-duc-amerique-{uuid} » au lieu de l'UUID brut.
    const url = `${window.location.origin}${buildPostPath(postId, {
      title: postTitle,
      species: postSpecies,
    })}`
    navigator.clipboard.writeText(url).catch(() => {
      // Fallback pour navigateurs sans Clipboard API
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setLinkCopied(true)
    setTimeout(() => {
      setLinkCopied(false)
      onClose()
    }, 1500)
  }

  // Edition de post : entierement cablee depuis V1.1.0.
  // - Home.handleEditPost passe (postId, postType) au panel via editingPostId
  // - ContributeEncounterForm fetch les data du post et pre-remplit le form
  // - useContributePostSubmit detecte editingPostId et appelle updatePost
  //   au lieu de createPost. Les RLS posts UPDATE filtrent par user_id.

  /**
   * Suppression du post
   * TODO [BACKEND] : appeler postService.deletePost(postId)
   * puis invalider le cache TanStack Query ['feed']
   */
  function handleDelete() {
    if (onDelete) {
      onClose()
      onDelete()
      return
    }
    setShowDeleteConfirm(true)
  }

  /**
   * Actions persistées Supabase + feedback visuel.
   * - 'favorite'   → toggle saved_posts (mutation)
   * - 'follow-toggle' → INSERT/DELETE follows selon l'état actuel
   * - 'mute-user'  → INSERT blocks (l'user disparaît du feed via RLS,
   *                  débloquable depuis Settings → Comptes bloqués)
   * - 'hide-post'  → INSERT hidden_posts (le post disparaît du feed,
   *                  débloquable depuis Settings → Posts masqués)
   * - 'report'     → ouvre ReportModal qui POST sur reports
   */
  async function handleTodo(action: string) {
    if (action === 'report') {
      setShowReport(true)
      return
    }
    if (action === 'favorite') {
      toggleSaved.mutate({ postId, currentlySaved: isSavedFavorite })
      return
    }
    if (action === 'follow-toggle' && authorId) {
      toggleFollow.mutate({
        targetUserId: authorId,
        currentlyFollowing: !!isCurrentlyFollowing,
      })
      // Pas de fermeture auto : on laisse l'user voir le state changer
      return
    }
    setActionedItem(action)
    try {
      if (action === 'mute-user' && authorId) {
        // useBlock() au lieu de block() direct, pour invalider le cache
        // blocked-users + feed automatiquement (Settings > Blocages a jour
        // sans attendre le staleTime).
        await blockMutation.mutateAsync(authorId)
      } else if (action === 'hide-post') {
        // Mutation optimiste via useHidePost, l invalidation declenche un
        // refetch du feed qui filtrera ce post.
        hidePostMutation.mutate({ postId })
      }
    } catch {
      // Erreur silencieuse, TODO toast global
    }
    setTimeout(() => {
      setActionedItem(null)
      onClose()
    }, 1200)
  }

  // ── Contenu du menu selon le mode ─────────────────────────────────────────

  // V1.1.0 : "Modifier mon observation" actif quand le parent cable onEdit
  // (Home -> FeedSection -> FeedPost -> PostOptionsMenu via handleEditPost).
  // Pre-remplissage automatique du form via editingPostId + updatePost RPC.
  const ownPostItems = (
    <>
      <MenuItem
        itemRef={firstItemRef as React.RefObject<HTMLButtonElement>}
        icon={
          linkCopied ? <Check className="size-5 text-green-600" /> : <Link className="size-5" />
        }
        label={linkCopied ? t('home.post.options.copyLinkDone') : t('home.post.options.copyLink')}
        description={t('home.post.options.copyLinkDesc')}
        onClick={handleCopyLink}
      />
      {/* Modifier mon observation : affiché uniquement si le parent a câblé
          le callback onEdit (Home → FeedSection → FeedPost). Nicolas
          2026-05-24 : permet de corriger une erreur (espèce, photo, etc.). */}
      {onEdit && (
        <>
          <div className="h-px bg-border mx-5" aria-hidden="true" />
          <MenuItem
            icon={<Pencil className="size-5" />}
            label={t('home.post.options.edit', { defaultValue: 'Modifier mon observation' })}
            description={t('home.post.options.editDesc', {
              defaultValue: 'Corrige les détails, ajoute des photos…',
            })}
            onClick={() => {
              onClose()
              onEdit()
            }}
          />
        </>
      )}
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={<Trash2 className="size-5" />}
        label={t('home.post.options.delete')}
        description={t('home.post.options.deleteDesc')}
        onClick={handleDelete}
        danger
      />
    </>
  )

  const otherPostItems = (
    <>
      <MenuItem
        itemRef={firstItemRef as React.RefObject<HTMLButtonElement>}
        icon={
          // Branding Naturegraph : Migrer (vers / avec) = follow. L'icône
          // TreeDeciduous est utilisée partout dans l'app (ProfileHeader,
          // ProfileCommunity) pour incarner ce verbe. Cohérence visuelle
          // imposée même dans le menu options du post.
          isCurrentlyFollowing ? <UserX className="size-5" /> : <TreeDeciduous className="size-5" />
        }
        label={
          isCurrentlyFollowing
            ? t('home.post.options.unfollow', {
                defaultValue: 'Ne plus migrer avec @{{username}}',
                username: authorUsername,
              })
            : t('home.post.options.follow', {
                defaultValue: 'Migrer vers @{{username}}',
                username: authorUsername,
              })
        }
        description={
          isCurrentlyFollowing
            ? t('home.post.options.unfollowDesc', {
                defaultValue: 'Tu ne verras plus ses publications',
              })
            : t('home.post.options.followDesc', {
                defaultValue: 'Tu verras ses publications dans ton feed',
              })
        }
        onClick={() => handleTodo('follow-toggle')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={
          isSavedFavorite ? (
            <BookmarkCheck className="size-5 text-primary fill-primary" />
          ) : (
            <Bookmark className="size-5" />
          )
        }
        label={
          isSavedFavorite
            ? t('home.post.options.addFavoriteDone', {
                defaultValue: 'Ajouté aux favoris',
              })
            : t('home.post.options.addFavorite')
        }
        description={
          isSavedFavorite
            ? t('home.post.options.addFavoriteDoneDesc', {
                defaultValue: 'Retrouve-le dans ta collection',
              })
            : t('home.post.options.addFavoriteDesc')
        }
        onClick={() => handleTodo('favorite')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={
          linkCopied ? <Check className="size-5 text-green-600" /> : <Link className="size-5" />
        }
        label={linkCopied ? t('home.post.options.copyLinkDone') : t('home.post.options.copyLink')}
        description={t('home.post.options.copyLinkDesc')}
        onClick={handleCopyLink}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={
          actionedItem === 'mute-user' ? (
            <Check className="size-5 text-green-600" />
          ) : (
            <VolumeX className="size-5" />
          )
        }
        label={
          actionedItem === 'mute-user'
            ? t('home.post.options.muteUserDone', {
                defaultValue: '@{{username}} masqué',
                username: authorUsername,
              })
            : t('home.post.options.muteUser', { username: authorUsername })
        }
        description={
          actionedItem === 'mute-user'
            ? t('home.post.options.actionDone', { defaultValue: 'Action effectuée' })
            : t('home.post.options.muteUserDesc')
        }
        onClick={() => handleTodo('mute-user')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={
          actionedItem === 'hide-post' ? (
            <Check className="size-5 text-green-600" />
          ) : (
            <EyeOff className="size-5" />
          )
        }
        label={
          actionedItem === 'hide-post'
            ? t('home.post.options.hidePostDone', {
                defaultValue: 'Publication masquée',
              })
            : t('home.post.options.hidePost')
        }
        description={
          actionedItem === 'hide-post'
            ? t('home.post.options.actionDone', { defaultValue: 'Action effectuée' })
            : t('home.post.options.hidePostDesc')
        }
        onClick={() => handleTodo('hide-post')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={<Flag className="size-5" />}
        label={t('home.post.options.report')}
        description={t('home.post.options.reportDesc')}
        onClick={() => handleTodo('report')}
        danger
      />
    </>
  )

  const items = isOwnPost ? ownPostItems : otherPostItems

  return (
    <>
      {/* ── Backdrop mobile uniquement ─────────────────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : dropdown absolue ────────────────────────────────────── */}
      {!showReport && !showDeleteConfirm && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('home.post.optionsMenu')}
          className="hidden md:block absolute top-full right-0 mt-1 w-[320px] bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div className="py-1">{items}</div>
        </div>
      )}

      {/* ── Mobile : bottom sheet ─────────────────────────────────────────── */}
      {!showReport && !showDeleteConfirm && (
        <div
          role="menu"
          aria-label={t('home.post.optionsMenu')}
          className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-background rounded-t-2xl shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          <div className="pb-4">{items}</div>
        </div>
      )}

      {/* Modale de signalement */}
      {showReport && (
        <ReportModal
          postId={postId}
          onClose={() => {
            setShowReport(false)
            onClose()
          }}
        />
      )}

      {/* Modale de confirmation de suppression */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          postId={postId}
          onClose={() => {
            setShowDeleteConfirm(false)
            onClose()
          }}
          onConfirm={async () => {
            // Suppression réelle via Supabase (RLS user-scoped → seul le
            // propriétaire peut delete). On await pour propager l'erreur
            // au lieu d'un fire-and-forget silencieux. Le hook invalide
            // automatiquement le cache feed pour faire disparaître le post.
            await deletePostMutation.mutateAsync(postId)
          }}
        />
      )}
    </>
  )
}
