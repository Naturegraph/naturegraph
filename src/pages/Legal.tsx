/**
 * Legal — Mentions légales (LCEN + Loi 25)
 *
 * BATCH 68 : style aligné sur Welcome/Waitlist via <BetaInfoLayout>
 * (background teal-dark + pattern dots + orbes en md+, card cream centrée).
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité LCEN Art. 6 III.
 *
 * Structure 6 sections (MVP) :
 *   1. Éditeur du service
 *   2. Hébergement
 *   3. Propriété intellectuelle
 *   4. Responsabilité
 *   5. Données utilisateurs (renvoi vers Privacy Policy)
 *   6. Droit applicable (FR + Loi 25)
 *
 * Contenu i18n dans `legal.terms.*`. Marqueurs `[À COMPLÉTER ...]` rendus
 * en surlignage jaune via <HighlightedText>.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BetaInfoLayout } from '@/components/auth/BetaInfoLayout'
import { HighlightedText } from '@/components/ui/HighlightedText'

export default function Legal() {
  const { t } = useTranslation()

  const sections = Array.from({ length: 6 }, (_, i) => ({
    titleKey: `legal.terms.section${i + 1}Title`,
    contentKey: `legal.terms.section${i + 1}Content`,
  }))

  return (
    <BetaInfoLayout>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-action-default)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 rounded mb-8"
        aria-label={t('legal.terms.backHome', { defaultValue: "Retour à l'accueil" })}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>{t('legal.terms.backHome', { defaultValue: "Retour à l'accueil" })}</span>
      </Link>

      <article>
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-3">
            {t('legal.terms.title', { defaultValue: 'Mentions légales' })}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('legal.terms.lastUpdated', {
              defaultValue: 'Dernière mise à jour : 02 mai 2026',
            })}
          </p>
        </header>

        <div className="flex flex-col gap-8">
          {sections.map((section, index) => (
            <section key={section.titleKey} aria-labelledby={`legal-section-${index + 1}-heading`}>
              <h2
                id={`legal-section-${index + 1}-heading`}
                className="text-xl md:text-2xl font-semibold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-3"
              >
                {index + 1}. {t(section.titleKey, { defaultValue: '' })}
              </h2>
              <HighlightedText text={t(section.contentKey, { defaultValue: '' })} />
            </section>
          ))}
        </div>
      </article>
    </BetaInfoLayout>
  )
}
