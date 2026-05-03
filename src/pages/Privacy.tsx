/**
 * Privacy — Politique de confidentialité (RGPD + Loi 25)
 * =======================================================
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité RGPD (Art. 12-13 transparence) et Loi 25 (Art. 8.3).
 *
 * Structure 11 sections (MVP, version produit) :
 *   1. Préambule
 *   2. Données collectées
 *   3. Utilisation des données
 *   4. Géolocalisation
 *   5. Cookies
 *   6. Conservation des données
 *   7. Vos droits (RGPD + Loi 25)
 *   8. Sécurité
 *   9. Transfert de données
 *   10. Contact
 *   11. Utilisateurs du Québec (Loi 25)
 *
 * Le contenu i18n vit dans `fr.json` / `en.json` sous `legal.privacy.*` —
 * jamais hardcodé, jamais inventé. Les valeurs juridiques inconnues
 * (responsable légal, hébergeur exact) sont explicitement marquées
 * "À COMPLÉTER" en attendant la finalisation par le porteur de projet.
 *
 * Conformité :
 *   - RGPD Art. 12 transparence : information facilement accessible et claire
 *   - RGPD Art. 13 information à la collecte (finalités, durée, droits)
 *   - RGPD Art. 17 droit à l'effacement (suppression immédiate documentée)
 *   - RGPD Art. 20 portabilité (export JSON depuis Settings)
 *   - Loi 25 Art. 8.3 politique publique (section 11 dédiée)
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

  // 11 sections numérotées de la politique de confidentialité.
  // L'ordre suit la logique produit : qui sommes-nous → quoi collecté →
  // pourquoi → cas spéciaux (géo, cookies) → durée → droits → sécurité →
  // transferts → contact → spécificités juridictionnelles (Québec).
  const sections = Array.from({ length: 11 }, (_, i) => ({
    titleKey: `legal.privacy.section${i + 1}Title`,
    contentKey: `legal.privacy.section${i + 1}Content`,
  }))

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
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('legal.privacy.lastUpdated', {
                defaultValue: 'Dernière mise à jour : 02 mai 2026',
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
                {/*
                  whitespace-pre-line préserve les retours à la ligne du contenu i18n
                  (listes à puces "• " séparées par \n) — pas de Markdown rendu,
                  juste du texte brut avec mise en forme via les sauts de ligne.
                */}
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
