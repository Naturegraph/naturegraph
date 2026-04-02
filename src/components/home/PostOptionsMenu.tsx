/**
 * PostOptionsMenu — Menu contextuel d'un post (⋮)
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
import { useNavigate } from 'react-router-dom'
import { UserX, Bookmark, Link, VolumeX, EyeOff, Flag, Pencil, Trash2, Check } from 'lucide-react'
import { ReportModal } from './ReportModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostOptionsMenuProps {
  /** ID du post — pour construire l'URL de partage et les futures requêtes API */
  postId: string
  /** Nom d'utilisateur de l'auteur (pour "Ne plus suivre @username") */
  authorUsername: string
  /** true = post de l'utilisateur connecté */
  isOwnPost: boolean
  onClose: () => void
  /**
   * Callback édition — redirige vers le formulaire de modification
   * TODO [BACKEND] — navigate(`/contribute/edit/${postId}`)
   */
  onEdit?: () => void
  /**
   * Callback suppression — à connecter à DELETE /posts/:id
   * TODO [BACKEND] — postService.deletePost(postId) + invalider cache
   */
  onDelete?: () => void
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  /** Variante destructive — texte + icône rouges */
  danger?: boolean
  /** Variante mise en avant — fond légèrement teinté */
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
  authorUsername,
  isOwnPost,
  onClose,
  onEdit,
  onDelete,
}: PostOptionsMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  // Desktop : fermer si clic en dehors
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  /** Copie l'URL du post dans le presse-papier et affiche un feedback 2s */
  function handleCopyLink() {
    const url = `${window.location.origin}/post/${postId}`
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

  /** Navigation vers le formulaire d'édition du post */
  function handleEdit() {
    onClose()
    if (onEdit) {
      onEdit()
      return
    }
    // TODO [BACKEND] — navigate(`/contribute/edit/${postId}`)
    navigate(`/contribute?edit=${postId}`)
  }

  /**
   * Suppression du post
   * TODO [BACKEND] — appeler postService.deletePost(postId)
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
   * Actions "autres utilisateurs" — toutes TODO BACKEND
   * À connecter à : followService, postService.hide(), reportService
   */
  function handleTodo(action: string) {
    if (action === 'report') {
      setShowReport(true)
      return
    }
    // TODO [BACKEND] — action: 'unfollow' | 'favorite' | 'mute-user' | 'hide-post'
    console.log('[TODO BACKEND] Post action:', action, 'postId:', postId)
    onClose()
  }

  // ── Contenu du menu selon le mode ─────────────────────────────────────────

  const ownPostItems = (
    <>
      <MenuItem
        itemRef={firstItemRef}
        icon={<Pencil className="size-5" />}
        label={t('home.post.options.edit')}
        description={t('home.post.options.editDesc')}
        onClick={handleEdit}
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
        itemRef={firstItemRef}
        icon={<UserX className="size-5" />}
        label={t('home.post.options.unfollow', { username: authorUsername })}
        description={t('home.post.options.unfollowDesc')}
        onClick={() => handleTodo('unfollow')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={<Bookmark className="size-5" />}
        label={t('home.post.options.addFavorite')}
        description={t('home.post.options.addFavoriteDesc')}
        onClick={() => handleTodo('favorite')}
        highlighted
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
        icon={<VolumeX className="size-5" />}
        label={t('home.post.options.muteUser', { username: authorUsername })}
        description={t('home.post.options.muteUserDesc')}
        onClick={() => handleTodo('mute-user')}
      />
      <div className="h-px bg-border mx-5" aria-hidden="true" />
      <MenuItem
        icon={<EyeOff className="size-5" />}
        label={t('home.post.options.hidePost')}
        description={t('home.post.options.hidePostDesc')}
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
        className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : dropdown absolue ────────────────────────────────────── */}
      {!showReport && !showDeleteConfirm && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('home.post.optionsMenu')}
          className="hidden md:block absolute top-full right-0 mt-1 w-[320px] bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="py-1">{items}</div>
        </div>
      )}

      {/* ── Mobile : bottom sheet ─────────────────────────────────────────── */}
      {!showReport && !showDeleteConfirm && (
        <div
          role="menu"
          aria-label={t('home.post.optionsMenu')}
          className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-xl overflow-hidden"
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
          onConfirm={() => {
            // TODO [BACKEND] — postService.deletePost(postId) + invalider cache ['feed']
            console.log('[TODO BACKEND] Delete post:', postId)
          }}
        />
      )}
    </>
  )
}
