/**
 * Privacy — Politique de confidentialité (RGPD + Loi 25)
 *
 * BATCH 68 : style aligné sur Welcome/Waitlist via <BetaInfoLayout>
 * (background teal-dark + pattern dots + orbes en md+, card cream centrée).
 *
 * Page publique accessible sans authentification — obligatoire pour la
 * conformité RGPD (Art. 12-13 transparence) et Loi 25 (Art. 8.3).
 *
 * Structure 11 sections (MVP) :
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
 * Le contenu i18n vit dans `fr.json` / `en.json` sous `legal.privacy.*`.
 * Les valeurs juridiques inconnues sont marquees `[À COMPLÉTER ...]` et
 * surlignees en jaune via <HighlightedText> pour reperage rapide.
 *
 * Accessibilité (WCAG AA) :
 *   - <main> + <article> + <section> sémantiques
 *   - <h1> unique, hiérarchie h2 logique
 *   - Lien "Retour" en début de page (Tab 1)
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BetaInfoLayout } from '@/components/auth/BetaInfoLayout'
import { HighlightedText } from '@/components/ui/HighlightedText'
import { BetaStatusCallout } from '@/components/ui/BetaStatusCallout'

export default function Privacy() {
  const { t } = useTranslation()

  // 12 sections (V1.1.0) : ajout section "Sources tierces et sous-traitants donnees"
  // pour declarer iNaturalist comme processor des donnees taxonomiques (RGPD/Loi 25).
  const sections = Array.from({ length: 12 }, (_, i) => ({
    titleKey: `legal.privacy.section${i + 1}Title`,
    contentKey: `legal.privacy.section${i + 1}Content`,
  }))

  return (
    <BetaInfoLayout>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-action-default)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 rounded mb-8"
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
              defaultValue: 'Dernière mise à jour : 21 mai 2026',
            })}
          </p>
        </header>

        {/* Statut beta privée — placé avant les sections numérotées pour
            informer immédiatement l'utilisateur du contexte expérimental. */}
        <BetaStatusCallout i18nNamespace="legal.privacy" id="privacy-beta-status" />

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
              <HighlightedText text={t(section.contentKey, { defaultValue: '' })} />
            </section>
          ))}
        </div>
      </article>
    </BetaInfoLayout>
  )
}
