/**
 * FeedPostSpeciesChips : rangée « catégorie + espèce » d'une carte de publication.
 *
 * Extrait de FeedPost.tsx (Lot 4, factorisation). La logique de décision (les 3 cas)
 * vit dans `feedPostSpeciesChips.ts` (pure, testée) ; ce composant ne fait que rendre
 * le descripteur, avec exactement le même markup et les mêmes libellés a11y qu'avant.
 *
 * nowrap : catégorie + espèce restent sur UNE ligne (l'espèce se tronque pour tenir,
 * cf. RevealableText) au lieu de passer à la ligne sur mobile.
 */

import { useTranslation } from 'react-i18next'
import { useSpecies } from '@/contexts/SpeciesContext'
import { RevealableText } from '@/components/ui/RevealableText'
import { CHIP_BASE_CLASS, CHIP_INTERACTIVE_CLASS, CHIP_PASSIVE_CLASS } from './feedPostConfig'
import { computeSpeciesChips } from './feedPostSpeciesChipsLogic'

interface FeedPostSpeciesChipsProps {
  taxonomicGroup?: string | null
  species?: string | null
  scientificName?: string | null
  taxrefId?: string | null
  /** Rend catégorie ET espèce passives (post principal de PostDetail). */
  disableChipFilters?: boolean
  individualsCount?: number
  /** Clic sur la catégorie -> coche le filtre catégorie du feed (absent = passif). */
  onSelectCategory?: (group: string) => void
}

export function FeedPostSpeciesChips({
  taxonomicGroup,
  species,
  scientificName,
  taxrefId,
  disableChipFilters = false,
  individualsCount,
  onSelectCategory,
}: FeedPostSpeciesChipsProps) {
  const { t } = useTranslation()
  const { setActiveSpecies } = useSpecies()

  const {
    category,
    species: speciesChip,
    countSuffix,
  } = computeSpeciesChips({
    taxonomicGroup,
    species,
    scientificName,
    taxrefId,
    disableChipFilters,
    individualsCount,
    hasCategoryHandler: !!onSelectCategory,
  })

  const speciesName = species || scientificName || null
  const unknownLabel = t('home.post.unknownSpecies', { defaultValue: 'Espèce non déterminée' })

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {category &&
        (category.clickable ? (
          <button
            type="button"
            onClick={() => onSelectCategory!(taxonomicGroup!)}
            aria-label={t('home.post.filterByCategory', {
              defaultValue: 'Filtrer par {{category}}',
              category: category.label,
            })}
            className={`${CHIP_BASE_CLASS} ${CHIP_INTERACTIVE_CLASS} shrink-0`}
          >
            <span>{category.label}</span>
          </button>
        ) : (
          <span className={`${CHIP_BASE_CLASS} shrink-0`}>
            <span>{category.label}</span>
          </span>
        ))}

      {speciesChip.kind === 'named' ? (
        speciesChip.clickable ? (
          <button
            type="button"
            onClick={() => {
              setActiveSpecies({
                taxref_id: taxrefId!,
                scientific_name: scientificName ?? speciesName!,
                common_name: speciesName !== scientificName ? (speciesName ?? null) : null,
                group_label: taxonomicGroup ?? null,
              })
              // QA Nicolas : scroll up auto, cohérence avec le chip catégorie.
              window.scrollTo({ top: 0, behavior: 'auto' })
            }}
            aria-label={t('home.post.filterBySpecies', { species: speciesName ?? '' })}
            className={`${CHIP_BASE_CLASS} ${CHIP_INTERACTIVE_CLASS} min-w-0 max-w-full`}
          >
            <RevealableText text={`${speciesChip.text}${countSuffix}`} />
          </button>
        ) : (
          <span className={`${CHIP_BASE_CLASS} min-w-0 max-w-full`}>
            <RevealableText text={`${speciesChip.text}${countSuffix}`} />
          </span>
        )
      ) : (
        <span className={CHIP_PASSIVE_CLASS}>
          {unknownLabel}
          {countSuffix}
        </span>
      )}
    </div>
  )
}
