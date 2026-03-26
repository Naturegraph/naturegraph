/**
 * Contact — Page de contact Naturegraph
 * =======================================
 * Formulaire de contact (visuel) + email + réseaux sociaux.
 * Layout centré, light theme, responsive.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Instagram, Mail, Send, CheckCircle2 } from 'lucide-react'
import logo from '@/assets/logos/logo-simplified-color.svg'

/** Icône Discord compacte */
function DiscordIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export default function Contact() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)

  /** Soumission simulée (pas de backend pour le moment) */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

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
            {t('contact.backHome')}
          </Link>
        </div>

        {/* Titre + description */}
        <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-title)] mb-4">
          {t('contact.title')}
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] mb-12">{t('contact.description')}</p>

        <div className="grid md:grid-cols-[1fr_280px] gap-12">
          {/* Formulaire */}
          <div>
            {sent ? (
              <div className="bg-[var(--color-surface-cream)] rounded-[24px] p-8 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 size={48} className="text-[var(--color-highlight-primary)]" />
                <p className="text-lg font-medium">{t('contact.form.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    {t('contact.form.name')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder={t('contact.form.namePlaceholder')}
                    className="h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-default)] transition-shadow"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t('contact.form.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder={t('contact.form.emailPlaceholder')}
                    className="h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-default)] transition-shadow"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder={t('contact.form.messagePlaceholder')}
                    className="px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-default)] transition-shadow resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-[var(--color-action-default)] text-[var(--color-text-white)] font-bold rounded-full self-start hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Send size={16} />
                  {t('contact.form.submit')}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar contact info */}
          <aside className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                {t('contact.emailLabel')}
              </h3>
              <a
                href="mailto:contact@naturegraph.fr"
                className="flex items-center gap-2 text-[var(--color-highlight-primary)] hover:underline"
              >
                <Mail size={18} />
                contact@naturegraph.fr
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                {t('contact.socialMedia')}
              </h3>
              <div className="flex gap-4">
                <a
                  href="https://www.instagram.com/naturegraph.fr/?hl=fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--color-text-primary)] hover:text-[var(--color-highlight-primary)] transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                  <span className="text-sm">Instagram</span>
                </a>
                <a
                  href="https://discord.gg/WVFQw2Zh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--color-text-primary)] hover:text-[var(--color-highlight-primary)] transition-colors"
                  aria-label="Discord"
                >
                  <DiscordIcon />
                  <span className="text-sm">Discord</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
