/**
 * Footer — Pied de page complet
 * ===============================
 * 4 colonnes desktop : logo/description + produit + à propos + CTA card.
 * Responsive : empilé sur mobile/tablet.
 * Liens sociaux (Instagram, Discord) + navigation interne + copyright.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Instagram } from 'lucide-react'
import logoSimplified from '@/assets/logos/logo-simplified-light.svg'
import hermineIcon from '@/assets/images/hermine-icon.png'

/** Icône Discord compacte */
function DiscordIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

/** Cœur animé (petit détail sympa) */
function HeartBeat() {
  return (
    <motion.span
      className="inline-block text-[var(--color-accent-mint)]"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      ♥
    </motion.span>
  )
}

interface FooterProps {
  onNavigate: (sectionId: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useTranslation()

  const socialLinks = {
    instagram: 'https://www.instagram.com/naturegraph.fr/?hl=fr',
    discord: 'https://discord.gg/WVFQw2Zh',
  }

  /** Liens produit (scroll vers sections) */
  const productLinks = [
    { label: t('footer.product.values'), id: 'values' },
    { label: t('footer.product.features'), id: 'discover' },
    { label: t('footer.product.mission'), id: 'mission' },
    { label: t('footer.product.community'), id: 'community' },
  ]

  /** Liens à propos (routes internes) */
  const aboutLinks = [
    { label: t('footer.about.contact'), to: '/contact' },
    { label: t('footer.about.privacy'), to: '/privacy' },
    { label: t('footer.about.legal'), to: '/legal' },
  ]

  return (
    <footer className="w-full bg-[var(--color-bg-primary)] flex justify-center p-0 md:p-6 lg:p-8">
      <div className="w-full max-w-[1728px] bg-[var(--color-highlight-primary)] rounded-none md:rounded-[32px] overflow-hidden">
        <div className="px-6 md:px-12 lg:p-16 pt-12 md:pt-16 pb-8">
          {/* ── Contenu principal (responsive unique) ──────────────── */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-16">
            {/* Col 1 : Logo + description + réseaux sociaux */}
            <div className="flex flex-col gap-6 lg:w-80 shrink-0">
              <img
                src={logoSimplified}
                alt={t('common.appName')}
                className="w-[204px] h-auto self-start"
                width={204}
                height={40}
              />
              <p className="text-[var(--color-text-white)]/85 line-clamp-3">
                {t('footer.tagline')}
              </p>
              <div className="flex gap-6 items-center">
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-text-white)] hover:opacity-80 transition-opacity"
                  aria-label="Instagram"
                >
                  <Instagram size={24} />
                </a>
                <a
                  href={socialLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-text-white)] hover:opacity-80 transition-opacity"
                  aria-label="Discord"
                >
                  <DiscordIcon />
                </a>
              </div>
            </div>

            {/* Col 2 + 3 : Liens produit + à propos (côte à côte sur mobile) */}
            <div className="flex gap-16">
              {/* Produit */}
              <div className="flex flex-col gap-4 text-[var(--color-text-white)]/85">
                <h5 className="text-[var(--color-text-white)] font-bold">
                  {t('footer.product.title')}
                </h5>
                {productLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className="text-left hover:underline bg-transparent border-none cursor-pointer text-[var(--color-text-white)]/85 p-0 font-[var(--font-body)]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {/* À propos */}
              <div className="flex flex-col gap-4 text-[var(--color-text-white)]/85">
                <h5 className="text-[var(--color-text-white)] font-bold">
                  {t('footer.about.title')}
                </h5>
                {aboutLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="hover:underline text-[var(--color-text-white)]/85"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 4 : CTA card */}
            <div className="bg-[var(--color-highlight-secondary)] rounded-[20px] p-6 flex flex-col gap-5 lg:max-w-[280px]">
              <div className="bg-[var(--color-bg-primary)] rounded-full size-14 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={hermineIcon}
                  alt="Hermine Naturegraph"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <h4 className="text-[var(--color-text-white)]">{t('footer.cta.title')}</h4>
              <Link
                to="/signup"
                className="btn-press btn-press-primary inline-flex items-center justify-center h-10 px-4 text-sm font-bold text-[var(--color-text-white)] bg-[var(--color-action-default)] rounded-full self-start font-[var(--font-body)]"
              >
                {t('footer.cta.button')}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Barre de copyright ──────────────────────────────────── */}
        <div className="border-t border-[var(--color-text-white)]/10 px-6 md:px-12 lg:px-16 py-8">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-6 text-[var(--color-text-white)]/70 text-sm">
            <p>{t('footer.copyright')}</p>
            <p className="flex items-center gap-1">
              {t('footer.madeWithLove')} <HeartBeat /> {t('footer.team')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
