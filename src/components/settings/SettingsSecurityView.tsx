/**
 * SettingsSecurityView — Sous-vue "Sécurité" du SettingsPanel
 * ============================================================
 *
 * Pixel-perfect Figma — section unique :
 *   Modifier le courriel de connexion
 *      - Champ "Ton ancien courriel" (read-only, valeur actuelle du compte)
 *      - Champ "Ton nouveau courriel" (input email)
 *      - Boutons [Annuler] + [Mettre à jour]
 *
 * Note : la section "Modifier le mot de passe" du Figma initial a été
 * retirée car Naturegraph utilise un système d'authentification par
 * **lien magique (magic link)** uniquement — pas de mot de passe à gérer
 * (Nicolas 2026-05-02). Le code est gardé en commentaire au cas où l'auth
 * par mot de passe serait ré-introduite (Phase 3 : 2FA / TOTP).
 *
 * Style des inputs : pill (rounded-full) avec focus state primary-light, même
 * pattern que EditInfoTab (cohérence DS).
 *
 * TODO [BACKEND] Phase 2 — voir second-agent/03-profil-backend-notes.md §15
 *
 *   ## Changement d'email (Supabase Auth — magic link)
 *   1. UI bloque le bouton "Mettre à jour" si :
 *      - Format invalide (regex email)
 *      - Email = ancien email
 *      - Email déjà pris (validation côté serveur via RPC `check_email_unique`)
 *   2. Au clic :
 *      - `supabase.auth.updateUser({ email: newEmail })`
 *      - Supabase envoie automatiquement 2 magic links de confirmation
 *        (un sur l'ancien, un sur le nouveau)
 *      - Affichage d'un toast "Lien de confirmation envoyé sur {newEmail}.
 *        Clique sur le lien pour valider le changement."
 *      - L'ancien email reste actif tant que le nouveau n'est pas confirmé
 *   3. Quand le user clique le lien dans l'email :
 *      - Supabase met à jour `auth.users.email`
 *      - Trigger SQL met à jour `profiles.email` (si on stocke aussi côté profile)
 *
 *   ## Anti-fraude / sécurité (Edge Function)
 *   - Limit 3 tentatives de changement / 24h / IP (anti spam)
 *   - Logger chaque changement (table `security_audit_log`)
 *   - Email de notification à l'ANCIEN email à chaque demande de changement
 *     ("Un changement d'email a été demandé. Si ce n'était pas vous, contactez-nous.")
 *
 *   ## i18n (clés à ajouter dans fr.json / en.json)
 *   - settings.security.emailTitle, emailOldLabel, emailNewLabel,
 *     emailNewPlaceholder, update, updateSuccess
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'

// ─── Classes input partagées ─────────────────────────────────────────────────
// Même style que EditInfoTab pour cohérence DS — pill rounded-full + focus
// primary-light + border primary.
const INPUT_PILL_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

// Variante read-only : pas de focus primary, juste affichage.
const INPUT_READONLY_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground cursor-not-allowed'

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsSecurityView() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // L'ancien email vient de useAuth (user.email actuel).
  const currentEmail = user?.email ?? ''
  const [newEmail, setNewEmail] = useState('')

  function handleEmailCancel() {
    setNewEmail('')
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO [BACKEND] : appel `supabase.auth.updateUser({ email: newEmail })`
    // + toast confirmation. Cf. docstring du fichier.
    console.warn('[Security] email update mock —', currentEmail, '→', newEmail)
    setNewEmail('')
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 px-6 pt-2 pb-6">
      <h3 className="font-title font-bold text-lg text-foreground leading-tight">
        {t('settings.security.emailTitle', {
          defaultValue: 'Modifier le courriel de connexion',
        })}
      </h3>

      {/* Ancien courriel — read-only */}
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
          className={INPUT_PILL_CLASS}
        />
      </div>

      {/* Actions email */}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={handleEmailCancel}
          className="flex-1 h-12 rounded-full bg-background border-[0.5px] border-border text-foreground text-sm font-bold hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('common.cancel', { defaultValue: 'Annuler' })}
        </button>
        <button
          type="submit"
          disabled={!newEmail || newEmail === currentEmail}
          className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('settings.security.update', { defaultValue: 'Mettre à jour' })}
        </button>
      </div>
    </form>
  )
}
