/**
 * ProfileStats — Onglet "Statistiques" du profil
 *
 * État "Bientôt" : badge pill + illustration hermine + texte explicatif.
 * Cette section sera enrichie lors d'un sprint ultérieur avec des graphiques
 * d'observations, de diversité d'espèces, et de progression dans le temps.
 */

import { useTranslation } from 'react-i18next'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Placeholder "Bientôt disponible" pour l'onglet Statistiques.
 */
export function ProfileStats() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
      {/* Badge pill "Bientôt" */}
      <span className="px-3 py-1 rounded-full bg-teal-dark/10 text-teal-dark text-xs font-semibold">
        {t('profile.stats.comingSoon')}
      </span>

      {/* Illustration hermine */}
      <img
        src={hermineEmptyState}
        alt=""
        className="w-32 h-32 opacity-60"
        loading="lazy"
        width={128}
        height={128}
      />

      {/* Message */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {t('profile.stats.comingSoonDesc')}
      </p>
    </div>
  )
}
