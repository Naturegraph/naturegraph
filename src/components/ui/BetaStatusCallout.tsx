/**
 * BetaStatusCallout — Bloc d'avertissement « phase beta privée »
 *
 * Affiché tout en haut des pages Privacy et Legal pour informer clairement
 * l'utilisateur que Naturegraph est un projet personnel non commercial,
 * opéré au Québec en phase de test. Sert de protection juridique pour
 * l'opérateur (clarification du statut expérimental, pas de SLA, données
 * minimales, suppression possible à tout moment).
 *
 * Visuel : encadré ambré (warning-friendly, pas alarmiste) avec icône
 * AlertTriangle, titre en gras, contenu pré-formaté. Compatible thème
 * clair/sombre via les tokens DS.
 *
 * Contenu i18n :
 *   - `legal.privacy.section0Title` / `legal.privacy.section0Content`
 *   - `legal.terms.section0Title` / `legal.terms.section0Content`
 *
 * Accessibilité : `role="note"` pour le lecteur d'écran (info contextuelle
 * non bloquante, à distinguer d'un alert), `aria-labelledby` qui pointe
 * vers le titre du callout pour annonce correcte.
 */

import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BetaStatusCalloutProps {
  /** Clé i18n racine — `legal.privacy` ou `legal.terms`. */
  i18nNamespace: 'legal.privacy' | 'legal.terms'
  /** Identifiant unique pour aria-labelledby (préfixe). */
  id: string
}

export function BetaStatusCallout({ i18nNamespace, id }: BetaStatusCalloutProps) {
  const { t } = useTranslation()
  const titleId = `${id}-title`

  return (
    <div
      role="note"
      aria-labelledby={titleId}
      className="mb-8 rounded-2xl border-2 border-[var(--color-warning,#d97706)]/40 bg-[var(--color-warning-bg,#fef3c7)]/50 p-5 md:p-6"
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 size-10 rounded-full bg-[var(--color-warning,#d97706)]/15 text-[var(--color-warning,#d97706)] flex items-center justify-center"
          aria-hidden="true"
        >
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={titleId}
            className="text-base md:text-lg font-bold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-2"
          >
            {t(`${i18nNamespace}.section0Title`, { defaultValue: '' })}
          </h2>
          <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-line leading-relaxed">
            {t(`${i18nNamespace}.section0Content`, { defaultValue: '' })}
          </div>
        </div>
      </div>
    </div>
  )
}
