/**
 * DeleteAccountModal — Confirmation de suppression de compte
 * ===========================================================
 *
 * Wrapper sémantique sur `<ConfirmModal variant="danger" />` pour la
 * suppression de compte. Concentre uniquement la copy + le branchement —
 * toute la logique a11y / layout / focus / Escape vit dans ConfirmModal.
 *
 * Acte comme la **2ème étape de double confirmation** :
 *   1. L'utilisateur clique sur "Supprimer mon compte" dans SettingsPanel
 *   2. Cette modal s'affiche (titre + description + 2 boutons)
 *   3. Clic sur "Confirmer" → onConfirm() (signOut + cleanup mock Phase 1)
 *
 * TODO [BACKEND] Phase 2 — voir second-agent/03-profil-backend-notes.md §15.
 *
 *   Le flux production sera plus riche que la simple confirmation locale :
 *
 *   1. **Bouton Confirmer** → RPC `request_account_deletion(reason?)` :
 *        - INSERT dans `account_deletion_requests` (user_id, requested_at,
 *          scheduled_for = now() + INTERVAL '30 days')
 *        - Email transactionnel (Edge Function + template Supabase Auth) :
 *          confirmation reçue + lien d'annulation valable 30 jours
 *        - Sign out forcé sur tous les devices (RPC `signout_all_devices`)
 *        - Toast succès + redirect /home
 *
 *   2. **Pendant les 30 jours** :
 *        - Les RLS bloquent la connexion (vue `active_profiles` excluant
 *          les `account_deletion_requests` non-cancelled)
 *        - Email rappel à J+7, J+15, J+25 avec lien d'annulation
 *        - Bouton "Annuler la suppression" disponible dans /settings si l'user
 *          parvient à se reconnecter (RPC `cancel_account_deletion()`)
 *
 *   3. **À J+30** (Cron Supabase Function quotidien) :
 *        - Suppression effective : DELETE FROM profiles WHERE id IN (...)
 *        - Cascade vers posts, comments, reactions, follows, saved_posts
 *        - Suppression des avatars/banners du Storage
 *        - Email final "votre compte a été supprimé"
 *
 *   4. **Anti-fraude / sécurité** :
 *        - Limit 1 demande active par user (UNIQUE constraint sur user_id)
 *        - Logger IP + user-agent au moment de la demande (audit trail)
 *        - Pas de demande possible si compte créé < 24h (anti spam-account)
 *        - 2FA / re-auth password obligatoire côté UI avant le RPC (Phase 3)
 *
 *   5. **RGPD compliance** :
 *        - Documenter durée de rétention (30 jours pour annulation)
 *        - Export RGPD recommandé AVANT suppression (lien dans la modal)
 *        - Conserver les logs anonymisés (post.author_id → null)
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
