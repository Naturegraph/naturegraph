/**
 * DeleteAccountModal : Confirmation suppression compte avec username matching
 * ============================================================================
 *
 * Modal de double-confirmation : l'utilisateur doit taper EXACTEMENT son
 * username pour pouvoir cliquer sur "Supprimer". Pattern utilisé par GitHub,
 * Twitter/X, Stripe, etc. : friction cognitive volontaire pour éviter les
 * suppressions accidentelles.
 *
 * Décision produit Q-PROD-5
 * ─────────────────────────
 * La suppression est **immédiate et irréversible**. Aucun délai de grâce.
 *
 *   1. L'utilisateur clique "Supprimer mon compte" dans SettingsPanel
 *   2. Cette modal s'affiche : titre + warning + input username + 2 boutons
 *   3. Le bouton "Supprimer définitivement" est DÉSACTIVÉ tant que l'input
 *      ne match pas exactement le username de l'utilisateur
 *   4. Match → bouton actif → clic → `useDeleteAccount.mutateAsync('hard')`
 *   5. Edge Function `delete-account` invoquée → cascade DB + cleanup Storage
 *
 * Conformité
 * ──────────
 *   - RGPD Art. 17 droit à l'effacement (effet immédiat)
 *   - Loi 25 Art. 27.1 droit à la cessation
 *   - UX patterns reconnus pour minimiser les suppressions accidentelles
 *
 * Accessibilité (WCAG AA)
 * ───────────────────────
 *   - role="alertdialog" + aria-labelledby + aria-describedby
 *   - Focus initial sur le bouton Annuler (action non-destructive)
 *   - Escape ferme la modal
 *   - Click backdrop ferme la modal
 *   - Input avec <label> visible + aria-describedby pour le hint
 *   - Bouton désactivé : disabled + aria-disabled + tooltip implicit
 *   - Variant danger : contraste rouge ≥ 4.5:1
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface DeleteAccountModalProps {
  /** Annule la suppression (ferme la modal) */
  onCancel: () => void
  /** Confirme la suppression : appelé seulement après match du username */
  onConfirm: () => void
}

export function DeleteAccountModal({ onCancel, onConfirm }: DeleteAccountModalProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()

  /** Username courant (référence pour la comparaison). Vide si non chargé. */
  const expectedUsername = profile?.username ?? ''

  /** Texte tapé par l'utilisateur dans l'input de confirmation. */
  const [typedUsername, setTypedUsername] = useState('')

  /** Match strict (case-sensitive) : pas de tolérance. */
  const isMatch = typedUsername.length > 0 && typedUsername === expectedUsername

  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  // Focus initial sur Annuler (action non-destructive) : protection clavier.
  useEffect(() => {
    cancelBtnRef.current?.focus()
  }, [])

  // Escape ferme la modal : alternative clavier au bouton X.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  /** Si l'utilisateur appuie sur Enter dans l'input ET que le match est OK, confirme. */
  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && isMatch) {
      e.preventDefault()
      onConfirm()
    }
  }

  return (
    <>
      {/* Backdrop opaque (bloque l'attention sur la modal). */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Modal : bottom-sheet mobile, centrée desktop. Identique à ConfirmModal
          pour cohérence visuelle. */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-desc"
        className="fixed inset-x-0 bottom-0 z-[70] bg-[var(--color-bg-primary)] rounded-t-2xl shadow-2xl flex flex-col gap-4 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                   md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-x-auto md:w-[calc(100vw-32px)] md:max-w-md md:rounded-2xl md:pb-6"
      >
        {/* Drag handle visuel (mobile uniquement) */}
        <div
          className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border"
          aria-hidden="true"
        />

        {/* Header : titre + bouton X */}
        <div className="flex items-start justify-between gap-4 mt-2 md:mt-0">
          <h2
            id="delete-account-title"
            className="font-title font-bold text-xl md:text-2xl text-foreground leading-tight flex-1"
          >
            {t('settings.delete.title', {
              defaultValue: 'Es-tu sûr·e de vouloir supprimer ton compte ?',
            })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 shrink-0 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        <p id="delete-account-desc" className="text-sm text-foreground leading-relaxed">
          {t('settings.delete.description', {
            defaultValue:
              'Cette action est irréversible. Toutes tes données, photos et observations seront supprimées définitivement et ne pourront pas être récupérées.',
          })}
        </p>

        {/* Champ de double-confirmation : taper le username pour activer le bouton */}
        <div className="flex flex-col gap-2 mt-1">
          <label
            htmlFor="delete-account-username-input"
            className="text-sm font-medium text-foreground"
          >
            {t('settings.delete.usernameLabel', {
              defaultValue: 'Tape ton nom d’utilisateur pour confirmer',
            })}
          </label>
          <p id="delete-account-username-hint" className="text-xs text-muted-foreground font-mono">
            {expectedUsername ||
              t('settings.delete.usernameLoading', {
                defaultValue: 'chargement…',
              })}
          </p>
          <input
            id="delete-account-username-input"
            type="text"
            value={typedUsername}
            onChange={(e) => setTypedUsername(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={expectedUsername}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="delete-account-username-hint"
            aria-invalid={typedUsername.length > 0 && !isMatch}
            className="w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Actions : Annuler (focus initial) + Supprimer (désactivé tant que pas de match) */}
        <div className="flex gap-3 mt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-full bg-background border-[0.5px] border-border text-foreground text-sm font-bold hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch}
            aria-disabled={!isMatch}
            className="flex-1 h-12 rounded-full bg-[var(--color-error,_#9E0F22)] text-white text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-error,_#9E0F22)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
          >
            {t('settings.delete.confirm', { defaultValue: 'Supprimer définitivement' })}
          </button>
        </div>
      </div>
    </>
  )
}
