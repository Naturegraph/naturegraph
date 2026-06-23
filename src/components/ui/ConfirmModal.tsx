/**
 * ConfirmModal : Modal de confirmation générique réutilisable
 * ============================================================
 *
 * Pixel-perfect Figma : modal centrée desktop / bottom-sheet mobile.
 * Utilisée pour toutes les actions qui demandent une confirmation explicite :
 *   - Déconnexion (variant 'default')
 *   - Suppression de compte (variant 'danger')
 *   - Toute autre action destructive future
 *
 * Layout :
 *   - Mobile  : bottom-sheet plein largeur, rounded-top, drag handle
 *   - Desktop : modal centrée (max-w-md)
 *
 * Sécurité a11y :
 *   - role="alertdialog" + aria-labelledby + aria-describedby
 *   - Focus initial sur "Annuler" (action non-destructive) pour éviter le clic
 *     accidentel sur "Confirmer" via clavier
 *   - Escape ferme la modal
 *   - Click backdrop ferme la modal
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export interface ConfirmModalProps {
  /** Titre H2 de la modal : string ou ReactNode (slot, ex: `<>Supprimer <em>{name}</em> ?</>`) */
  title: ReactNode
  /** Description / explication de l'action : string ou ReactNode (slot pour <ul>, <strong>, etc.) */
  description: ReactNode
  /**
   * Icone optionnelle affichee au-dessus du titre (BATCH 8 / T-025).
   * Recommandation : couleur conforme au variant (rouge pour 'danger').
   */
  icon?: ReactNode
  /**
   * Slot optionnel pour contenu additionnel entre description et boutons
   * (BATCH 8 / T-025). Cas d'usage : champ de confirmation, checkbox, lien help.
   */
  children?: ReactNode
  /** Label du bouton de confirmation (ex: "Confirmer", "Se déconnecter") */
  confirmLabel: string
  /** Label du bouton d'annulation (défaut : "Annuler" via i18n) */
  cancelLabel?: string
  /**
   * `default` : bouton primary violet (action standard).
   * `danger`  : bouton rouge (action destructive : suppression compte).
   */
  variant?: 'default' | 'danger'
  /**
   * Desactive le bouton de confirmation (BATCH 8 / T-025).
   * Utile quand `children` contient un champ de validation qui doit etre
   * rempli avant de pouvoir confirmer (ex: matching strict username).
   */
  confirmDisabled?: boolean
  /** Annule l'action (ferme la modal) */
  onCancel: () => void
  /** Confirme l'action */
  onConfirm: () => void
}

export function ConfirmModal({
  title,
  description,
  icon,
  children,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const { t } = useTranslation()
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  // Focus initial sur "Annuler" : sécurité contre les clics clavier
  // accidentels sur l'action confirmative.
  useEffect(() => {
    cancelBtnRef.current?.focus()
  }, [])

  // Escape ferme la modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  // BATCH 110 : utilise btn-press du DS pour cohérence avec les autres boutons.
  // Le variant 'danger' utilise btn-press-danger (rouge) si défini en SCSS,
  // sinon fallback sur primary avec couleur error en override.
  const confirmClasses =
    variant === 'danger'
      ? 'btn-press btn-press-primary bg-[var(--color-error)] text-white focus-visible:ring-[var(--color-error)]'
      : 'btn-press btn-press-primary bg-[var(--color-action-default)] text-[var(--color-text-white)] focus-visible:ring-[var(--color-action-default)]'

  return (
    <>
      {/* Backdrop opaque pour focaliser l'attention. */}
      <div
        className="fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Modal : bottom-sheet mobile, centrée desktop */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="fixed inset-x-0 bottom-0 z-[70] bg-[var(--color-bg-primary)] rounded-t-2xl shadow-2xl flex flex-col gap-4 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                   md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-x-auto md:w-[calc(100vw-32px)] md:max-w-md md:rounded-2xl md:pb-6"
      >
        {/* Drag handle visuel (mobile uniquement) */}
        <div
          className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border"
          aria-hidden="true"
        />

        {/* Header : titre + bouton X.
            BATCH 8 / T-025 : si `icon` passe, affiche un bloc decoratif au-dessus
            du titre (couleur conforme au variant en pratique). */}
        <div className="flex items-start justify-between gap-4 mt-2 md:mt-0">
          <div className="flex-1 flex flex-col gap-2">
            {icon && (
              <div className="text-foreground" aria-hidden="true">
                {icon}
              </div>
            )}
            <h2
              id="confirm-modal-title"
              className="font-title font-bold text-xl md:text-2xl text-foreground leading-tight"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 shrink-0 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Description : accepte ReactNode (slot) depuis BATCH 8 / T-025 */}
        <div id="confirm-modal-desc" className="text-sm text-foreground leading-relaxed">
          {description}
        </div>

        {/* Slot children optionnel (BATCH 8 / T-025) : contenu additionnel entre
            description et actions (ex: input de confirmation, checkbox, helper). */}
        {children && <div className="flex flex-col gap-3">{children}</div>}

        {/* Actions : Annuler (focus initial) + Confirmer : BATCH 110 cohérence DS btn-press */}
        <div className="flex gap-3 mt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="btn-press btn-press-secondary flex-1 h-12 rounded-full bg-background border-[0.5px] border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-bold hover:border-[var(--color-action-default)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
          >
            {cancelLabel ?? t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 h-12 rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
