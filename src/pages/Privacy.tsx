/**
 * Privacy — Politique de confidentialité (RGPD + Loi 25)
 * =======================================================
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité RGPD (Art. 12-13 transparence) et Loi 25 (Art. 8.3).
 *
 * Le contenu i18n existe dans `fr.json` / `en.json` sous `legal.privacy.*`.
 * Branchage de ce contenu rendu via 7 sections sémantiques + lien retour.
 *
 * Conformité :
 *   - RGPD Art. 12 transparence : information facilement accessible et claire
 *   - RGPD Art. 13 information à la collecte (finalités, durée, droits)
 *   - RGPD Art. 17 droit à l'effacement (suppression immédiate documentée)
 *   - Loi 25 Art. 8.3 politique publique
 *   - Loi 25 Art. 14 personne en charge mentionnée
 *
 * Accessibilité (WCAG AA) :
 *   - <main> + <article> + <section> sémantiques
 *   - <h1> unique, hiérarchie h2 logique
 *   - Contraste tokens DS conforme
 *   - Skip link via le layout parent (HomeNavbar)
 *   - Lien "Retour" en début de page (Tab 1)
 *
 * Cf. `docs/AUDIT_LEGAL.md` NC-1 — page placeholder remplacée par contenu réel.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Privacy() {
  const { t } = useTranslation()

  // 7 sections de la politique. Numérotées pour faciliter les références
  // externes (emails de support, captures d'écran, etc.).
  // Sections 1-6 : RGPD générique. Section 7 : Loi 25 Québec/Canada.
  const sections = [
    { titleKey: 'legal.privacy.section1Title', contentKey: 'legal.privacy.section1Content' },
    { titleKey: 'legal.privacy.section2Title', contentKey: 'legal.privacy.section2Content' },
    { titleKey: 'legal.privacy.section3Title', contentKey: 'legal.privacy.section3Content' },
    { titleKey: 'legal.privacy.section4Title', contentKey: 'legal.privacy.section4Content' },
    { titleKey: 'legal.privacy.section5Title', contentKey: 'legal.privacy.section5Content' },
    { titleKey: 'legal.privacy.section6Title', contentKey: 'legal.privacy.section6Content' },
    { titleKey: 'legal.privacy.section7Title', contentKey: 'legal.privacy.section7Content' },
  ] as const

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <main id="main-content" className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Lien retour — toujours premier focusable pour navigation clavier */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-highlight-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight-primary)] focus-visible:ring-offset-2 rounded mb-8"
          aria-label={t('legal.privacy.backHome', { defaultValue: "Retour à l'accueil" })}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('legal.privacy.backHome', { defaultValue: "Retour à l'accueil" })}</span>
        </Link>

        <article>
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-3">
              {t('legal.privacy.title', { defaultValue: 'Politique de confidentialité' })}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {t('legal.privacy.lastUpdated', { defaultValue: 'Dernière mise à jour : mars 2026' })}
            </p>
            <p className="text-base text-[var(--color-text-primary)] leading-relaxed">
              {t('legal.privacy.intro', {
                defaultValue:
                  'Naturegraph accorde une importance fondamentale à la protection de vos données personnelles.',
              })}
            </p>
          </header>

          <div className="flex flex-col gap-8">
            {sections.map((section, index) => (
              <section
                key={section.titleKey}
                aria-labelledby={`privacy-section-${index + 1}-heading`}
              >
                <h2
                  id={`privacy-section-${index + 1}-heading`}
                  className="text-xl md:text-2xl font-semibold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-3"
                >
                  {index + 1}. {t(section.titleKey, { defaultValue: '' })}
                </h2>
                <p className="text-base text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
                  {t(section.contentKey, { defaultValue: '' })}
                </p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}
