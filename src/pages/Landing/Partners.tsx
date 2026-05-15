/**
 * Partners — Section des partenaires de Naturegraph
 * ====================================================
 * Logos des partenaires officiels cliquables (liens externes).
 * Grille 2x2 mobile, ligne horizontale desktop.
 *
 * Liste à jour : Paloume, E-Hub Enerco, Kréa'Pulse.
 */

import { useTranslation } from 'react-i18next'
import ehub from '@/assets/partners/partner-ehub.png'
import kreapulse from '@/assets/partners/partner-kreapulse.png'
import paloume from '@/assets/partners/partner-paloume.png'

interface Partner {
  name: string
  url: string
  logo: string
}

/** Données des partenaires officiels Naturegraph */
const PARTNERS: Partner[] = [
  {
    name: 'Paloume',
    url: 'https://www.paloume.fr/page/2020316-accueil',
    logo: paloume,
  },
  {
    name: 'E-Hub Enerco',
    url: 'https://www.hubenerco.bzh/',
    logo: ehub,
  },
  {
    name: "Kréa'Pulse",
    url: 'https://www.ploermelcommunaute.bzh/kreapulse/',
    logo: kreapulse,
  },
]

export function Partners() {
  const { t } = useTranslation()

  if (PARTNERS.length === 0) return null

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

          {/* Logos grid — BATCH 71 : tailles reduites sur mobile pour ne pas deborder */}
          <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-6 md:gap-12 lg:gap-16 w-full max-w-5xl">
            {PARTNERS.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 md:h-16 lg:h-20 flex items-center justify-center transition-opacity hover:opacity-80 px-2 md:px-4"
                aria-label={`Visiter le site web de ${partner.name}`}
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-10 md:h-16 lg:h-20 w-auto object-contain max-w-[120px] md:max-w-[180px] lg:max-w-[220px]"
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
