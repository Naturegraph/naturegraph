/**
 * Privacy — Politique de confidentialité
 * ========================================
 * Page RGPD avec 6 sections de contenu légal.
 * Layout centré, light theme, responsive.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import logo from '@/assets/logos/logo-simplified-color.svg'

/** Clés des 6 sections de la politique de confidentialité */
const SECTIONS = [1, 2, 3, 4, 5, 6] as const

export default function Privacy() {
  const { t } = useTranslation()

  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
    >
      <div className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="Naturegraph" className="w-[160px] h-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={16} />
            {t('legal.privacy.backHome')}
          </Link>
        </div>

        {/* Titre */}
        <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-title)] mb-3">
          {t('legal.privacy.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-12">
          {t('legal.privacy.lastUpdated')}
        </p>

        {/* Introduction */}
        <p className="text-lg text-[var(--color-text-muted)] mb-12 leading-relaxed">
          {t('legal.privacy.intro')}
        </p>

        {/* Sections */}
        <div className="flex flex-col gap-10">
          {SECTIONS.map((num) => (
            <article key={num} className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {t(`legal.privacy.section${num}Title`)}
              </h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">
                {t(`legal.privacy.section${num}Content`)}
              </p>
            </article>
          ))}
        </div>

        {/* Retour */}
        <div className="mt-16 pt-8 border-t border-[var(--color-border)]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[var(--color-action-default)] hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            {t('legal.privacy.backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
