/**
 * FeedPostMeta : rangée méta d'une carte de publication (habitat, météo, moment,
 * nuages, phénomène), sur une seule ligne avec ellipsis.
 *
 * Extrait de FeedPost.tsx (Lot 4). La logique (ordre + présence + emoji + clé i18n)
 * vit dans `feedPostMetaLogic.ts` (pure, testée) ; ce composant ne fait que rendre,
 * avec exactement le même markup qu'avant.
 *
 * NG-055 (Nicolas 2026-08-05) : la rangée tient TOUJOURS sur une seule ligne. Le
 * conteneur est un bloc `whitespace-nowrap overflow-hidden text-ellipsis` (pas un
 * flex, sinon l'ellipsis « … » ne s'applique pas) ; seul l'excédent est coupé, en
 * commençant par la fin (le moment de la journée, le moins critique).
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { computeMetaItems, type FeedPostMetaInput } from './feedPostMetaLogic'

export function FeedPostMeta(props: FeedPostMetaInput) {
  const { t } = useTranslation()
  const items = computeMetaItems(props)

  if (items.length === 0) return null

  return (
    <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground">
      {items.map((item, i) => {
        const label = item.labelKey
          ? t(item.labelKey, { defaultValue: item.labelFallback })
          : item.labelFallback
        return (
          <React.Fragment key={item.key}>
            {i > 0 && (
              <span aria-hidden="true" className="mx-1 text-xs text-muted-foreground">
                •
              </span>
            )}
            <span>
              {item.emoji && (
                <span aria-hidden="true" className="mr-1">
                  {item.emoji}
                </span>
              )}
              {label}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}
