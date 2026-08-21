/**
 * SettingsSecurityView : Sous-vue "Sécurité" du SettingsPanel
 * ============================================================
 *
 * Pixel-perfect Figma : section unique :
 *   Modifier le courriel de connexion
 *      - Champ "Ton ancien courriel" (read-only, valeur actuelle du compte)
 *      - Champ "Ton nouveau courriel" (input email)
 *      - Boutons [Annuler] + [Mettre à jour]
 *
 * Note : la section "Modifier le mot de passe" du Figma initial a été
 * retirée car Naturegraph utilise un système d'authentification par
 * **lien magique (magic link)** uniquement : pas de mot de passe à gérer
 * (Nicolas 2026-05-02). Le code est gardé en commentaire au cas où l'auth
 * par mot de passe serait ré-introduite (Phase 3 : 2FA / TOTP).
 *
 * Style des inputs : pill (rounded-full) avec focus state primary-light, même
 * pattern que EditInfoTab (cohérence DS).
 *
 * Changement d'email : `supabase.auth.updateUser({ email })`. Supabase envoie
 * automatiquement les liens de confirmation sur l'ancien ET le nouveau email ;
 * l'ancien reste actif tant que le nouveau n'est pas confirmé. Toast de
 * confirmation côté UI, erreurs assainies (sanitizeError).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { isTechnicalMessage } from '@/lib/sanitizeError'
import {
  INPUT_PILL_CLASS,
  INPUT_READONLY_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_OUTLINE_CLASS,
} from '@/styles/inputs'

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsSecurityView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()

  // L'ancien email vient de useAuth (user.email actuel).
  const currentEmail = user?.email ?? ''
  const [newEmail, setNewEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleEmailCancel() {
    setNewEmail('')
  }

  /** Validation regex email côté client (RFC simplifiée). */
  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  }

  /**
   * Soumet le changement d'email via Supabase Auth.
   * Supabase enverra automatiquement 2 magic links de confirmation
   * (sur l'ancien ET sur le nouveau email).
   */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newEmail.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      toast.error(
        t('settings.security.errorInvalidEmail', {
          defaultValue: 'Adresse email invalide.',
        }),
      )
      return
    }
    if (trimmed === currentEmail.toLowerCase()) {
      toast.error(
        t('settings.security.errorSameEmail', {
          defaultValue: "C'est déjà ton email actuel.",
        }),
      )
      return
    }

    setIsSubmitting(true)
    try {
      if (!supabase) throw new Error('Supabase non configuré')
      const { error } = await supabase.auth.updateUser({ email: trimmed })
      if (error) throw error

      // L'option "Secure email change" est ACTIVE sur le projet (vérifié le
      // 2026-07-21) : Supabase envoie un lien sur l'ancienne ET la nouvelle
      // adresse, et les DEUX doivent être confirmées. Le message doit donc
      // mentionner les deux boîtes. Ne dire que "vérifie ta nouvelle adresse"
      // laissait l'utilisateur croire que c'était terminé alors que son email
      // de connexion n'avait pas changé, sans qu'il comprenne pourquoi.
      toast.success(
        t('settings.security.emailUpdateSuccessTitle', {
          defaultValue: 'Confirme depuis tes deux adresses',
        }),
        t('settings.security.emailUpdateSuccessDesc', {
          defaultValue:
            'Un lien a été envoyé à {{email}} et à ton adresse actuelle. Clique sur les deux liens pour valider le changement.',
          email: trimmed,
        }),
      )
      setNewEmail('')
    } catch (err) {
      console.error('[Security] email update failed', err)
      toast.error(
        t('settings.security.emailUpdateError', {
          defaultValue: "Impossible de modifier l'email pour l'instant.",
        }),
        // N'affiche le detail QUE s'il est propre (les erreurs Supabase Auth
        // sont en general claires) ; jamais de message technique brut.
        err instanceof Error && !isTechnicalMessage(err.message) ? err.message : undefined,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 px-6 pt-2 pb-6">
      <h3 className="font-title font-bold text-lg text-foreground leading-tight">
        {t('settings.security.emailTitle', {
          defaultValue: 'Modifier le courriel de connexion',
        })}
      </h3>

      {/* Ancien courriel : read-only */}
      <div className="flex flex-col gap-2">
        <label htmlFor="security-email-old" className="text-sm font-medium text-foreground">
          {t('settings.security.emailOldLabel', {
            defaultValue: 'Ton ancien courriel',
          })}
        </label>
        <input
          id="security-email-old"
          type="email"
          readOnly
          value={currentEmail}
          className={INPUT_READONLY_CLASS}
          aria-readonly="true"
        />
      </div>

      {/* Nouveau courriel */}
      <div className="flex flex-col gap-2">
        <label htmlFor="security-email-new" className="text-sm font-medium text-foreground">
          {t('settings.security.emailNewLabel', {
            defaultValue: 'Ton nouveau courriel',
          })}
        </label>
        <input
          id="security-email-new"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={t('settings.security.emailNewPlaceholder', {
            defaultValue: 'Adresse email...',
          })}
          autoComplete="email"
          // Borne standard d'une adresse email (RFC 5321) : evite une saisie
          // aberrante avant l'appel a Supabase Auth.
          maxLength={254}
          className={INPUT_PILL_CLASS}
        />
      </div>

      {/* Actions email : boutons partagés via styles/inputs.ts */}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={handleEmailCancel}
          className={`flex-1 ${BUTTON_OUTLINE_CLASS}`}
        >
          {t('common.cancel', { defaultValue: 'Annuler' })}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !newEmail || newEmail === currentEmail}
          className={`flex-1 ${BUTTON_PRIMARY_CLASS}`}
        >
          {isSubmitting
            ? t('common.loading', { defaultValue: 'Envoi…' })
            : t('settings.security.update', { defaultValue: 'Mettre à jour' })}
        </button>
      </div>
    </form>
  )
}
