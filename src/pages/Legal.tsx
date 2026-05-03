/**
 * Legal — Mentions légales (LCEN + Loi 25)
 * =========================================
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité LCEN Art. 6 III (loi française) et identification du
 * responsable de publication.
 *
 * Contenu i18n dans `fr.json` / `en.json` sous `legal.terms.*` :
 *   - Éditeur du site
 *   - Hébergement (Vercel + Supabase)
 *   - Propriété intellectuelle
 *   - Responsabilité
 *   - Droit applicable
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

  // 5 sections des mentions légales — alignées sur LCEN Art. 6 III FR
  const sections = [
    { titleKey: 'legal.terms.editorTitle', contentKey: 'legal.terms.editorContent' },
    { titleKey: 'legal.terms.hostingTitle', contentKey: 'legal.terms.hostingContent' },
    { titleKey: 'legal.terms.ipTitle', contentKey: 'legal.terms.ipContent' },
    { titleKey: 'legal.terms.liabilityTitle', contentKey: 'legal.terms.liabilityContent' },
    { titleKey: 'legal.terms.lawTitle', contentKey: 'legal.terms.lawContent' },
  ] as const

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
            <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-heading)] text-[var(--color-text-primary)]">
              {t('legal.terms.title', { defaultValue: 'Mentions légales' })}
            </h1>
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
                  {t(section.titleKey, { defaultValue: '' })}
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
