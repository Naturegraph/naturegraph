/**
 * CommentsSection — Modale de commentaires d'une publication
 *
 * Affiche la liste des commentaires existants + zone de saisie.
 * Desktop : modal centré avec backdrop. Mobile : bottom sheet.
 *
 * Accessibilité : focus trap, fermeture Escape, scroll lock, aria-modal.
 *
 * TODO [BACKEND] — handleSend → POST /comments { postId, text }
 *   via commentService.createComment({ postId, text })
 *   Table concernée : `comments` (id, postId, authorId, text, createdAt)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { X, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockUsers } from '@/data/mock/mockUsers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentsSectionProps {
  postId: string
  commentsCount: number
  isOpen: boolean
  onClose: () => void
}

interface MockComment {
  id: string
  userId: string
  text: string
  timeAgo: string
}

// ─── Données mock ─────────────────────────────────────────────────────────────

/** Commentaires fictifs pour le développement — à remplacer par l'API */
const MOCK_COMMENTS: MockComment[] = [
  {
    id: '1',
    userId: '2',
    text: 'Superbe observation ! La lumière est magnifique 🌿',
    timeAgo: '2h',
  },
  {
    id: '2',
    userId: '3',
    text: "J'ai vu la même espèce la semaine dernière dans le même secteur",
    timeAgo: '4h',
  },
  { id: '3', userId: '4', text: 'Quelle chance ! Bravo pour la photo 📸', timeAgo: '1j' },
]

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Modale de commentaires pour un post.
 * Gère l'affichage desktop (centré) et mobile (bottom sheet).
 */
export function CommentsSection({ postId, commentsCount, isOpen, onClose }: CommentsSectionProps) {
  const { t } = useTranslation()
  const { isAuthenticated, profile } = useAuth()
  const [inputText, setInputText] = useState('')
  const [comments, setComments] = useState<MockComment[]>(MOCK_COMMENTS)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Envoi d'un commentaire (optimistic update)
   * TODO [BACKEND] — commentService.createComment({ postId, text })
   */
  const handleSend = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    // Ajout optimiste du commentaire
    const newComment: MockComment = {
      id: `temp-${Date.now()}`,
      userId: '1', // Utilisateur courant (mock)
      text: trimmed,
      timeAgo: t('home.comments.justNow', "à l'instant"),
    }
    setComments((prev) => [...prev, newComment])
    setInputText('')

    // Réinitialiser la hauteur du textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // TODO [BACKEND] — appel API ici
    console.warn('[TODO BACKEND] Comment on post:', postId, 'Text:', trimmed)
  }, [inputText, postId, t])

  // Ne rien rendre si fermé (doit être après tous les hooks)
  if (!isOpen) return null

  /** Trouver un mockUser par son id */
  const findUser = (userId: string) => mockUsers.find((u) => u.id === userId)

  /** Auto-expand du textarea */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    // Reset puis ajuster la hauteur
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  /** Envoi via Ctrl+Enter / Cmd+Enter */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Contenu partagé desktop/mobile ────────────────────────────────────────

  const modalContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Liste des commentaires (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('home.comments.empty', 'Aucun commentaire pour le moment')}
          </p>
        ) : (
          comments.map((comment) => {
            const user = findUser(comment.userId)
            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <img
                  src={user?.avatar}
                  alt={user?.username ?? ''}
                  className="size-8 rounded-full object-cover shrink-0"
                  loading="lazy"
                  width={32}
                  height={32}
                />
                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {user?.username ?? t('home.comments.unknownUser', 'Utilisateur')}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {comment.timeAgo}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mt-0.5">{comment.text}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Séparateur */}
      <div className="border-t border-border" aria-hidden="true" />

      {/* Zone de saisie ou message invité */}
      {isAuthenticated ? (
        <div className="flex items-end gap-3 px-5 py-3">
          {/* Avatar utilisateur courant */}
          <img
            src={profile?.avatar_url ?? mockUsers[0].avatar}
            alt={profile?.username ?? ''}
            className="size-8 rounded-full object-cover shrink-0"
            width={32}
            height={32}
          />
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={t('home.comments.placeholder', 'Ajouter un commentaire…')}
            aria-label={t('home.comments.placeholder', 'Ajouter un commentaire…')}
            className="flex-1 resize-none bg-muted rounded-2xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground leading-relaxed max-h-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {/* Bouton envoyer */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label={t('home.comments.send', 'Envoyer')}
            className="size-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            <Link
              to="/signup"
              className="text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              {t('home.comments.loginCta', 'Connecte-toi pour commenter')}
            </Link>
          </p>
        </div>
      )}
    </div>
  )

  return (
    <CommentsSectionShell onClose={onClose} closeBtnRef={closeBtnRef} commentsCount={commentsCount}>
      {modalContent}
    </CommentsSectionShell>
  )
}

// ─── Shell (backdrop + layout desktop/mobile) ─────────────────────────────────

interface ShellProps {
  onClose: () => void
  closeBtnRef: React.RefObject<HTMLButtonElement | null>
  commentsCount: number
  children: React.ReactNode
}

/**
 * Enveloppe modale : gère backdrop, focus trap, Escape, scroll lock.
 * Séparé pour garder CommentsSection sous 200 lignes.
 */
function CommentsSectionShell({ onClose, closeBtnRef, commentsCount, children }: ShellProps) {
  const { t } = useTranslation()
  const title = `${t('home.comments.title', 'Commentaires')} (${commentsCount})`

  // Focus sur le bouton fermer à l'ouverture
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [closeBtnRef])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  /** Header partagé (titre + bouton fermer) */
  const header = (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label={t('common.close', 'Fermer')}
        className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-5 text-foreground" aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <>
      {/* Backdrop plein écran */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Desktop : modal centré ────────────────────────────────────────── */}
      <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
        >
          {header}
          {children}
        </div>
      </div>

      {/* ── Mobile : bottom sheet ─────────────────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[60]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="bg-background rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {header}
          {children}
        </div>
      </div>
    </>
  )
}
