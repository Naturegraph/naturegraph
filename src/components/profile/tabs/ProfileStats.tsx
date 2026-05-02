/**
 * ProfileStats — Onglet "Statistiques" du profil
 *
 * Placeholder "Bientôt disponible" — sera enrichi avec graphiques d'observations,
 * diversité d'espèces, progression dans le temps lors d'un sprint ultérieur.
 *
 * TODO [BACKEND] Phase 3 — RPC `get_profile_stats(profile_id)` (cf. note backend §4.2).
 */

import { useTranslation } from 'react-i18next'
import { ProfileEmptyState } from '../ProfileEmptyState'

export function ProfileStats() {
  const { t } = useTranslation()

  return (
    <ProfileEmptyState
      title={t('profile.stats.comingSoonTitle', {
        defaultValue: 'Statistiques arrivent bientôt',
      })}
      subtitle={t('profile.stats.comingSoonDesc', {
        defaultValue:
          'On prépare les graphiques de tes observations, espèces rencontrées et migrations dans le temps.',
      })}
      compact
    >
      {/* Badge "Bientôt" cohérent avec ProfileTabs (primary-light + uppercase). */}
      <span className="mt-2 inline-flex px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold uppercase tracking-wide">
        {t('profile.stats.comingSoon', { defaultValue: 'Bientôt' })}
      </span>
    </ProfileEmptyState>
  )
}
