/**
 * Legal — Mentions légales (LCEN + Loi 25)
 * =========================================
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité LCEN Art. 6 III (loi française) et identification du
 * responsable de publication.
 *
 * Structure 6 sections (MVP, version produit) :
 *   1. Éditeur du service
 *   2. Hébergement
 *   3. Propriété intellectuelle
 *   4. Responsabilité
 *   5. Données utilisateurs (renvoi vers Privacy Policy)
 *   6. Droit applicable (FR + Loi 25)
 *
 * Le contenu i18n vit dans `fr.json` / `en.json` sous `legal.terms.*` —
 * jamais hardcodé, jamais inventé. Les valeurs juridiques inconnues
 * (nom légal de l'éditeur, hébergeur exact) sont explicitement marquées
 * "À COMPLÉTER".
 *
 * Accessibilité (WCAG AA) :
 *   - Sémantique <main> + <article> + <section>
 *   - Hiérarchie h1 → h2
 *   - Contraste tokens DS
 *   - Lien retour en première position focus
 *
 * Cf. `docs/AUDIT_LEGAL.md` NC-2 — page placeholder remplacée par contenu réel.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Legal() {
  const { t } = useTranslation()

  // 6 sections numérotées des mentions légales.
  // Inclut désormais une section 5 dédiée aux données utilisateurs (renvoi
  // vers la politique de confidentialité) pour respecter la séparation
  // mentions légales / privacy policy.
  const sections = Array.from({ length: 6 }, (_, i) => ({
    titleKey: `legal.terms.section${i + 1}Title`,
    contentKey: `legal.terms.section${i + 1}Content`,
  }))

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <main id="main-content" className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-highlight-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight-primary)] focus-visible:ring-offset-2 rounded mb-8"
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
              <section
                key={section.titleKey}
                aria-labelledby={`legal-section-${index + 1}-heading`}
              >
                <h2
                  id={`legal-section-${index + 1}-heading`}
                  className="text-xl md:text-2xl font-semibold font-[var(--font-heading)] text-[var(--color-text-primary)] mb-3"
                >
                  {index + 1}. {t(section.titleKey, { defaultValue: '' })}
                </h2>
                {/* whitespace-pre-line conserve les sauts de ligne (listes simples). */}
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
