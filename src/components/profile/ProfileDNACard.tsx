/**
 * ProfileDNACard : Carte "ADN de l'observateur"
 * ==============================================
 *
 * Design Figma 6385:74429 (desktop) / 6385:71694 (mobile, dans tab) :
 *  - Icône atome teal + titre "ADN de l'observateur"
 *  - Liste de catégories taxonomiques avec :
 *    · Emoji + label
 *    · Pourcentage à droite
 *    · Barre de progression teal
 *
 * Top 3 catégories affichées par défaut, triées par % décroissant.
 *
 * Backend (cf. second-agent/01) :
 *  - Hook `useObserverDNA(userId)` à brancher sur RPC `get_observer_dna`
 *  - Cache 1h (les % bougent peu intra-session)
 */

import { useTranslation } from 'react-i18next'
import { Dna } from 'lucide-react'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import type { ProfileDisplayData } from './ProfileHeader'

interface ProfileDNACardProps {
  /** Liste des catégories avec % : vient de profile.interests */
  interests: ProfileDisplayData['interests']
  /** Si true, padding réduit (utilisé dans le tab mobile) */
  compact?: boolean
  /** Nombre max de catégories à afficher (défaut 3) */
  maxItems?: number
}

/** Mapping label i18n par catégorie taxonomique */
const TAXONOMIC_LABEL_KEYS: Record<string, string> = {
  birds: 'taxonomy.birds',
  mammals: 'taxonomy.mammals',
  insects: 'taxonomy.insects',
  amphibians: 'taxonomy.amphibians',
  reptiles: 'taxonomy.reptiles',
  arachnids: 'taxonomy.arachnids',
  mollusks: 'taxonomy.mollusks',
  fish: 'taxonomy.fish',
  plants: 'taxonomy.plants',
  other: 'taxonomy.other',
}

export function ProfileDNACard({ interests, compact = false, maxItems = 3 }: ProfileDNACardProps) {
  const { t } = useTranslation()

  // Tri par % décroissant + cap au top N
  const top = [...interests]
    .filter((i) => i.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, maxItems)

  return (
    <section
      aria-labelledby="profile-dna-heading"
      // Tokens Figma : rounded-md = Radius/M (12px), border-[0.5px] = Stroke/XS,
      // p = Grid/sp-16 ou sp-20, gap = Grid/sp-12.
      className={`bg-background rounded-md border-[0.5px] border-border ${
        compact ? 'p-4' : 'p-5'
      } flex flex-col gap-3`}
    >
      {/* Header card : Paragraph/Base 16px Bold (Figma 6385:74488 ; var
          Body/Bold/Size = 16). Le titre tient sur 1 ligne dans la card 320px. */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-8 rounded-full bg-[var(--color-highlight-primary)] text-[var(--color-text-inverse)] flex items-center justify-center shrink-0"
        >
          <Dna className="size-5" />
        </span>
        <h2
          id="profile-dna-heading"
          className="font-body font-bold text-base text-foreground leading-tight"
        >
          {t('profile.dna.title', { defaultValue: "ADN de l'observateur" })}
        </h2>
      </div>

      {/* Liste catégories + barres : gap-3 = Grid/sp-12 */}
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {t('profile.dna.empty', {
            defaultValue: 'Aucune observation pour le moment.',
          })}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {top.map((item) => {
            const emoji = CATEGORY_EMOJIS[item.id as keyof typeof CATEGORY_EMOJIS] ?? '✨'
            const labelKey = TAXONOMIC_LABEL_KEYS[item.id] ?? 'taxonomy.other'
            return (
              <li key={item.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span aria-hidden="true">{emoji}</span>
                    <span>{t(labelKey)}</span>
                  </span>
                  <span className="font-bold text-foreground tabular-nums">{item.percent}%</span>
                </div>
                {/* Barre de progression : h-2 (Grid/sp-8). Track = blanc/cream
                    avec border discrète (Figma 6385:74495 Container neutre).
                    Fill = teal CLAIR Background/Highlight/Tertiary #33B6B6. */}
                <div
                  className="h-2 rounded-full bg-cream-lighter border-[0.5px] border-border overflow-hidden"
                  role="progressbar"
                  aria-valuenow={item.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(labelKey)}
                >
                  <div
                    className="h-full bg-[var(--color-highlight-tertiary)] rounded-full transition-[width] duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
