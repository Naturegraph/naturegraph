/**
 * Partners — Section des partenaires
 * ====================================
 * Logos des partenaires cliquables (liens externes).
 * Grille 2x2 mobile, ligne horizontale desktop.
 */

import { useTranslation } from 'react-i18next'
import wazoom from '@/assets/partners/partner-wazoom.png'
import ehub from '@/assets/partners/partner-ehub.png'
import kreapulse from '@/assets/partners/partner-kreapulse.png'
import paloume from '@/assets/partners/partner-paloume.png'

/** Données des partenaires */
const PARTNERS = [
  {
    name: 'Paloume',
    url: 'https://www.paloume.fr/page/2020316-accueil',
    logo: paloume,
    wazoom: false,
  },
  {
    name: 'E-Hub Enerco',
    url: 'https://www.hubenerco.bzh/',
    logo: ehub,
    wazoom: false,
  },
  {
    name: "Kréa'Pulse",
    url: 'https://www.ploermelcommunaute.bzh/kreapulse/',
    logo: kreapulse,
    wazoom: false,
  },
  {
    name: 'Wazoom Studio',
    url: 'https://wazoom-studio.com/',
    logo: wazoom,
    wazoom: false,
  },
]

export function Partners() {
  const { t } = useTranslation()

  return (
    <section
      className="bg-[var(--color-bg-primary)] w-full flex justify-center"
      data-name="Section 9 : Partners"
    >
      <div className="w-full max-w-[1728px] px-6 md:px-10 lg:px-32 pb-16 md:pb-24 lg:pb-40">
        <div className="flex flex-col items-center gap-10">
          <h2 className="landing-section-title text-[var(--color-text-primary)] text-center">
            {t('landing.partners.title')}
          </h2>

          {/* Logos grid */}
          <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-8 lg:gap-16 w-full max-w-5xl">
            {PARTNERS.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-16 md:h-20 flex items-center justify-center transition-opacity hover:opacity-80 px-4"
                aria-label={`Visiter le site web de ${partner.name}`}
              >
                <img
                  src={partner.logo!}
                  alt={partner.name}
                  className="h-16 md:h-20 w-auto object-contain max-w-[220px]"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
