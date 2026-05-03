/**
 * DeleteAccountModal — Confirmation de suppression de compte
 * ===========================================================
 *
 * Wrapper sémantique sur `<ConfirmModal variant="danger" />` pour la
 * suppression de compte. Concentre uniquement la copy + le branchement —
 * toute la logique a11y / layout / focus / Escape vit dans ConfirmModal.
 *
 * Comportement MVP (décision produit Q-PROD-5)
 * ────────────────────────────────────────────
 * La suppression est **immédiate et irréversible**. Aucun délai de grâce.
 *
 *   1. L'utilisateur clique sur "Supprimer mon compte" dans SettingsPanel
 *   2. Cette modal s'affiche (titre + description + 2 boutons)
 *   3. Clic sur "Confirmer" → `useDeleteAccount.mutateAsync('hard')`
 *      → Edge Function `delete-account` invoquée :
 *        - Nettoyage Storage tous les buckets (avatars, banners, post-media,
 *          notebook-covers, exports) sous {userId}/
 *        - `auth.admin.deleteUser(userId)` → CASCADE sur profiles, posts,
 *          media, reactions, comments, follows, saved_posts, hidden_posts,
 *          notebooks, etc.
 *        - support_tickets et security_audit_log : `user_id = NULL` (FK
 *          SET NULL) — anonymisation J+30 via cron `anonymize_orphan_audit_logs`
 *      → queryClient.clear() + signOut local côté client
 *      → redirection vers / (landing)
 *
 * TODO [BACKLOG Phase 3 — pas pour MVP]
 * ──────────────────────────────────────
 * Si on veut introduire un délai de grâce dans le futur (par retour
 * utilisateur post-beta) :
 *   - Table `account_deletion_requests` (user_id, requested_at, scheduled_for)
 *   - Email transactionnel + lien d'annulation
 *   - Cron J+30 qui exécute la suppression effective
 *   - RPC `cancel_account_deletion()`
 *
 * Pour le MVP : suppression immédiate suffit + aligne sur la promesse de la
 * politique de confidentialité (cf. fr.json:1035 et en.json:1035).
 */

import { useTranslation } from 'react-i18next'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface DeleteAccountModalProps {
  /** Annule la suppression (ferme la modal) */
  onCancel: () => void
  /** Confirme la suppression (signOut + cleanup local Phase 1) */
  onConfirm: () => void
}

export function DeleteAccountModal({ onCancel, onConfirm }: DeleteAccountModalProps) {
  const { t } = useTranslation()

  return (
    <ConfirmModal
      title={t('settings.delete.title', {
        defaultValue: 'Es-tu sûr·e de vouloir supprimer ton compte ?',
      })}
      description={t('settings.delete.description', {
        defaultValue:
          'Cette action est irréversible. Toutes tes données, photos et observations seront supprimées définitivement et ne pourront pas être récupérées.',
      })}
      confirmLabel={t('settings.delete.confirm', { defaultValue: 'Confirmer' })}
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
