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
import { Button } from '@/components/ui'
import { SocialLink } from '@/components/ui/SocialLink'
import { Instagram } from 'lucide-react'
import { DiscordIcon } from '@/components/icons/DiscordIcon'
import logoSimplified from '@/assets/logos/logo-simplified-light.svg'
import hermineIcon from '@/assets/images/hermine-icon.png'

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
                <SocialLink
                  href={socialLinks.instagram}
                  label="Instagram"
                  icon={<Instagram size={24} />}
                />
                <SocialLink href={socialLinks.discord} label="Discord" icon={<DiscordIcon />} />
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
                  loading="lazy"
                />
              </div>
              <h4 className="text-[var(--color-text-white)]">{t('footer.cta.title')}</h4>
              <Button to="/signup" size="sm" className="self-start">
                {t('footer.cta.button')}
              </Button>
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
