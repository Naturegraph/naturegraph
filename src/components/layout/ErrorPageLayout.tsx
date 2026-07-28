/**
 * ErrorPageLayout : structure commune des pages d'erreur (404 / 403 / 500)
 *
 * Design valide par Nicolas (2026-06-21) :
 *   - fond beige du design system (var(--color-bg-secondary))
 *   - contenu dans une "carte" facon carte a collectionner
 *   - hermine en gros ecusson (medaillon) chevauchant le haut de la carte
 *   - pas d'orbe gradient ni de grosse ombre (rendu plus leger)
 *   - boutons SANS icone, "Retour" toujours a gauche et en style secondary
 *
 * Les boutons sont passes en `children` car chaque page gere sa propre
 * navigation : <Link> pour la 404 et la 403 (rendues dans le router), mais
 * <a>/window.location pour la 500 (rendue HORS router par l'AppErrorBoundary).
 *
 * Classes de boutons exportees (errorBtnPrimary / errorBtnSecondary) pour
 * garantir un rendu identique sur les trois pages sans duplication.
 */

import type { ReactNode } from 'react'
import hermineIcon from '@/assets/images/hermine-icon.png'

// Base commune : pleine largeur sur mobile, auto sur desktop, focus visible WCAG.
const errorBtnBase =
  'inline-flex items-center justify-center w-full sm:w-auto h-12 px-6 rounded-full font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]'

/** Bouton d'action principale (violet plein). */
export const errorBtnPrimary = `${errorBtnBase} btn-press btn-press-primary bg-[var(--color-action-default)] text-[var(--color-text-white)]`

/** Bouton secondaire / "Retour" (contour, fond transparent sur la carte). */
export const errorBtnSecondary = `${errorBtnBase} btn-press btn-press-secondary bg-transparent border border-[var(--color-border)] text-foreground`

interface ErrorPageLayoutProps {
  /** Code HTTP affiche dans l'eyebrow (ex: "404"). */
  code: string
  /** Libelle court a cote du code (ex: "Page introuvable"). */
  eyebrow: string
  /** Titre principal. */
  title: string
  /** Phrase rassurante sous le titre. */
  description: string
  /**
   * Boutons d'action (max 2). Ordre attendu : "Retour" (secondary) en premier,
   * action principale (primary) en second. Sur mobile on inverse l'affichage
   * (flex-col-reverse) pour mettre l'action principale au-dessus, tout en
   * gardant "Retour" a gauche sur desktop (sm:flex-row).
   */
  children: ReactNode
  /** Contenu optionnel sous les boutons (ex: lien support de la 500). */
  footer?: ReactNode
}

export function ErrorPageLayout({
  code,
  eyebrow,
  title,
  description,
  children,
  footer,
}: ErrorPageLayoutProps) {
  return (
    <main
      id="main-content"
      className="flex flex-col items-center justify-center min-h-screen min-h-[100svh] px-4 py-12 bg-[var(--color-bg-secondary)]"
    >
      {/* Carte : hermine ecusson en haut (chevauchante), contenu dessous.
          pt-20 laisse la place au medaillon qui depasse le bord superieur. */}
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-6 pt-20 pb-8 text-center shadow-sm">
        {/* Ecusson hermine : gros medaillon centre, cercle beige pour le
            detacher de la carte. Decoratif (le texte porte le sens). */}
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 size-28 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] ring-8 ring-[var(--color-bg-secondary)] flex items-center justify-center"
          aria-hidden="true"
        >
          <img src={hermineIcon} alt="" className="size-20" width={80} height={80} />
        </div>

        <div className="flex flex-col gap-3">
          <p
            className="text-xs font-bold tracking-widest text-[var(--color-link)] uppercase"
            aria-label={`Erreur ${code}`}
          >
            {code} · {eyebrow}
          </p>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
          {children}
        </div>

        {footer && <div className="mt-5 text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  )
}
