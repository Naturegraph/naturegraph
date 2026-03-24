/**
 * Legal — Mentions légales
 * =========================
 * Page réglementaire avec 5 sections (éditeur, hébergement, PI, responsabilité, droit applicable).
 * Layout centré, light theme, responsive.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import logo from '@/assets/logos/logo-simplified-color.svg'

/** Clés des sections des mentions légales */
const SECTIONS = ['editor', 'hosting', 'ip', 'liability', 'law'] as const

export default function Legal() {
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
            {t('legal.terms.backHome')}
          </Link>
        </div>

        {/* Titre */}
        <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-title)] mb-12">
          {t('legal.terms.title')}
        </h1>

        {/* Sections */}
        <div className="flex flex-col gap-10">
          {SECTIONS.map((key) => (
            <article key={key} className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {t(`legal.terms.${key}Title`)}
              </h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">
                {t(`legal.terms.${key}Content`)}
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
            {t('legal.terms.backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
