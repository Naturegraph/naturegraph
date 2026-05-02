/**
 * inputs.ts — Classes Tailwind partagées pour les inputs / textarea / boutons
 * ============================================================================
 *
 * Centralise les classes utilitaires pour les champs de formulaire afin
 * d'éviter les duplications et garantir la cohérence DS Naturegraph.
 *
 * Auparavant `INPUT_PILL_CLASS` était redéfini dans 3 fichiers :
 *   - EditInfoTab.tsx (panneau Modifier le profil)
 *   - SettingsSecurityView.tsx (changement email)
 *   - SettingsHelpView.tsx (formulaire support)
 *
 * Désormais une source unique. Si le DS évolue (couleur focus, radius,
 * etc.), un seul endroit à modifier.
 */

/**
 * Input "pill" arrondi h-10 (40px) avec focus state cohérent DS.
 * - Border 0.5px subtle au repos
 * - Focus : bg lavande primary-light + border primary + ring primary
 *
 * Utilisé pour : username, email, mot de passe, URL réseaux sociaux,
 * weekGoal, sélecteur de sujet help, etc.
 */
export const INPUT_PILL_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background ' +
  'text-sm text-foreground placeholder:text-muted-foreground transition-colors ' +
  'focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

/**
 * Variante read-only de INPUT_PILL_CLASS — pas de focus state primary,
 * curseur not-allowed pour signaler l'immutabilité.
 *
 * Utilisé pour afficher l'ancien email dans SettingsSecurityView.
 */
export const INPUT_READONLY_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background ' +
  'text-sm text-foreground cursor-not-allowed'

/**
 * Textarea multi-ligne avec coins arrondis (rounded-2xl) et focus state
 * identique aux inputs pill.
 *
 * Utilisé pour : bio (EditInfoTab), message support (SettingsHelpView).
 */
export const TEXTAREA_CLASS =
  'w-full px-4 py-3 rounded-2xl border-[0.5px] border-border bg-background ' +
  'text-sm text-foreground placeholder:text-muted-foreground resize-none transition-colors ' +
  'focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

/**
 * Bouton primaire pill h-12 (48px) — action principale (Sauvegarder, Envoyer,
 * Mettre à jour, Confirmer). Pleine largeur via `flex-1` ou `w-full`.
 *
 * Utilisé partout où on a une CTA primary-violet : EditInfoTab, EditPhotoTab,
 * EditPrefsTab, SettingsSecurityView, SettingsHelpView, ConfirmModal default.
 */
export const BUTTON_PRIMARY_CLASS =
  'h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold ' +
  'hover:opacity-90 transition-opacity ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

/**
 * Bouton outlined pill h-12 (48px) — action secondaire (Annuler, etc.).
 * Border 0.5px standard, hover passe à border-primary + text-primary.
 */
export const BUTTON_OUTLINE_CLASS =
  'h-12 rounded-full bg-background border-[0.5px] border-border text-foreground text-sm font-bold ' +
  'hover:border-primary hover:text-primary transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

/**
 * Bouton danger pill h-12 — action destructive (Confirmer suppression compte).
 */
export const BUTTON_DANGER_CLASS =
  'h-12 rounded-full bg-[var(--color-error)] text-white text-sm font-bold ' +
  'hover:opacity-90 transition-opacity ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'
