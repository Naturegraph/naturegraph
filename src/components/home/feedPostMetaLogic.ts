/**
 * feedPostMetaLogic : construction de la rangée méta d'un post (habitat, météo,
 * moment, nuages, phénomène).
 *
 * Extrait de FeedPost.tsx (Lot 4) et isolé en fonction PURE pour être testable
 * sans providers (même approche que feedPostSpeciesChipsLogic). Le rendu vit dans
 * FeedPostMeta.tsx.
 *
 * Ordre demandé (Nicolas 2026-05-04, NG-055 2026-08-05) : phénomène (posts Instant)
 * en tête, puis habitat, météo, nuages, moment de la journée. Un champ absent est
 * simplement omis. Les emojis viennent des maps de feedPostConfig ; les libellés
 * traduits sont exposés sous forme de clé i18n (+ fallback), appliquée par le
 * composant, pour garder cette logique pure.
 */

import { WEATHER_EMOJI, HABITAT_EMOJI, PHENOMENON_EMOJI } from './feedPostConfig'

export interface FeedPostMetaInput {
  weather?: string | null
  clouds?: string | null
  timeOfDay?: string | null
  habitat?: string | null
  phenomenon?: string | null
}

export interface MetaItem {
  key: 'phenomenon' | 'habitat' | 'weather' | 'clouds' | 'time'
  /** Emoji à afficher devant le libellé, ou null. */
  emoji: string | null
  /** Clé i18n du libellé si traduit ; null si le libellé est brut. */
  labelKey: string | null
  /** Libellé brut (phénomène, nuages) OU valeur de repli de la clé i18n. */
  labelFallback: string
}

/**
 * Calcule, dans l'ordre d'affichage, les segments de la rangée méta présents.
 * Fonction pure : pas d'effet de bord, pas de dépendance au rendu ni à i18n.
 */
export function computeMetaItems(input: FeedPostMetaInput): MetaItem[] {
  const { weather, clouds, timeOfDay, habitat, phenomenon } = input
  const items: MetaItem[] = []

  if (phenomenon) {
    items.push({
      key: 'phenomenon',
      emoji: PHENOMENON_EMOJI[phenomenon] ?? null,
      labelKey: null,
      labelFallback: phenomenon,
    })
  }
  if (habitat) {
    items.push({
      key: 'habitat',
      emoji: HABITAT_EMOJI[habitat] ?? null,
      labelKey: `contribute.habitat.${habitat}`,
      labelFallback: habitat,
    })
  }
  if (weather) {
    items.push({
      key: 'weather',
      emoji: WEATHER_EMOJI[weather] ?? null,
      labelKey: `contribute.weather.${weather}`,
      labelFallback: weather,
    })
  }
  if (clouds) {
    items.push({ key: 'clouds', emoji: null, labelKey: null, labelFallback: clouds })
  }
  if (timeOfDay) {
    items.push({
      key: 'time',
      emoji: null,
      labelKey: `contribute.date.${timeOfDay}`,
      labelFallback: timeOfDay,
    })
  }

  return items
}
