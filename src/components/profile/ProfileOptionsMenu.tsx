/**
 * ProfileOptionsMenu — Menu d'options sur la page profil (3 points)
 * ===================================================================
 *
 * Mêmes patterns visuels que PostOptionsMenu du feed (cohérence DS).
 * Actions disponibles côté visiteur :
 *   - Copier le lien du profil
 *   - Bloquer cet utilisateur
 *   - Signaler ce profil
 *
 * Côté owner (son propre profil) :
 *   - Copier le lien
 *   - Modifier le profil
 *   - (Plus tard : Paramètres / Confidentialité)
 *
 * Le menu se ferme à : clic en dehors, touche Escape, clic sur un item.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, Flag, Ban, Pencil, Check } from 'lucide-react'
import { useBlock } from '@/hooks/useBlocks'
import { useToast } from '@/contexts/ToastContext'

interface ProfileOptionsMenuProps {
  /** UUID du profil cible, requis pour le block (visiteur uniquement). */
  userId?: string
  /** Username du profil pour construire l'URL canonique */
  username: string
  /** true = profil de l'utilisateur connecté (actions différentes) */
  isOwnProfile: boolean
  /** Callback pour ouvrir le panel d'édition (own only) */
  onEditProfile?: () => void
  /** Callback pour fermer le menu */
  onClose: () => void
}

export function ProfileOptionsMenu({
  userId,
  username,
  isOwnProfile,
  onEditProfile,
  onClose,
}: ProfileOptionsMenuProps) {
  const { t } = useTranslation()
  const [linkCopied, setLinkCopied] = useState(false)
  const [actionedItem, setActionedItem] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const blockMutation = useBlock()
  const toast = useToast()

  // Fermeture clic dehors + Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [onClose])

  /** Copie le lien du profil dans le presse-papier */
  function handleCopyLink() {
    const url = `${window.location.origin}/profile/${username}`
    navigator.clipboard.writeText(url).catch(() => {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setLinkCopied(true)
    setActionedItem('copy')
    setTimeout(() => onClose(), 1200)
  }

  /**
   * Action generique avec feedback visuel puis fermeture.
   * Pour 'block' : declenche useBlock() qui ecrit en BDD + invalide les
   * caches feed + blocked-users (Settings to Comptes bloques se met a jour
   * immediatement).
   * Pour 'report' : feedback visuel uniquement, le report sera traite
   * Phase 2 via ReportModal.
   */
  async function handleAction(id: string) {
    setActionedItem(id)
    if (id === 'block' && userId) {
      try {
        await blockMutation.mutateAsync(userId)
        toast.success(
          t('profile.blockSuccess', {
            username,
            defaultValue: `@${username} a été bloqué. Tu peux le débloquer depuis tes paramètres.`,
          }),
        )
      } catch (err) {
        toast.error(
          t('profile.blockError', { defaultValue: 'Impossible de bloquer ce compte.' }),
          err instanceof Error ? err.message : String(err),
        )
      }
    }
    setTimeout(() => onClose(), 1200)
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('profile.options', { defaultValue: 'Options du profil' })}
      className="absolute right-0 top-full mt-2 z-30 min-w-[240px] rounded-2xl border-[0.5px] border-border bg-background shadow-lg overflow-hidden"
    >
      <div className="flex flex-col py-1">
        {isOwnProfile ? (
          <>
            <MenuItem
              icon={<Pencil className="size-5" />}
              label={t('profile.editProfile', { defaultValue: 'Modifier le profil' })}
              onClick={() => {
                onEditProfile?.()
                onClose()
              }}
            />
            <MenuItem
              icon={
                actionedItem === 'copy' ? (
                  <Check className="size-5 text-[var(--color-success)]" />
                ) : (
                  <Link2 className="size-5" />
                )
              }
              label={
                linkCopied
                  ? t('common.copied', { defaultValue: 'Lien copié' })
                  : t('profile.copyLink', { defaultValue: 'Copier le lien' })
              }
              onClick={handleCopyLink}
              done={actionedItem === 'copy'}
            />
          </>
        ) : (
          <>
            <MenuItem
              icon={
                actionedItem === 'copy' ? (
                  <Check className="size-5 text-[var(--color-success)]" />
                ) : (
                  <Link2 className="size-5" />
                )
              }
              label={
                linkCopied
                  ? t('common.copied', { defaultValue: 'Lien copié' })
                  : t('profile.copyLink', { defaultValue: 'Copier le lien' })
              }
              onClick={handleCopyLink}
              done={actionedItem === 'copy'}
            />
            <MenuItem
              icon={<Ban className="size-5" />}
              label={t('profile.blockUser', { defaultValue: 'Bloquer cet utilisateur' })}
              onClick={() => handleAction('block')}
              done={actionedItem === 'block'}
            />
            <MenuItem
              icon={<Flag className="size-5" />}
              label={t('profile.reportUser', { defaultValue: 'Signaler ce profil' })}
              onClick={() => handleAction('report')}
              danger
              done={actionedItem === 'report'}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composant MenuItem ──────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  done?: boolean
}

function MenuItem({ icon, label, onClick, danger, done }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
        // Hover identique à PostOptionsMenu pour cohérence (Nicolas 2026-05-01) :
        //   - normal : hover:bg-muted/40
        //   - danger : hover:bg-red-50 text-red-600
        danger ? 'hover:bg-red-50 text-red-600' : 'hover:bg-muted/40 text-foreground',
        done ? 'bg-primary-light/30' : '',
      ].join(' ')}
    >
      <span aria-hidden="true" className={danger ? 'text-red-500' : 'text-foreground'}>
        {icon}
      </span>
      <span className={done ? 'font-bold' : ''}>{label}</span>
    </button>
  )
}
