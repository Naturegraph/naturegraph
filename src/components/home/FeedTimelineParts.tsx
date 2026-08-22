/**
 * FeedTimelineParts : petits reperes visuels du fil "oriente decouverte".
 * =============================================================================
 *  - FeedDaySeparator : entete de jour ("Aujourd'hui", "Hier", date).
 *  - FeedMissedBanner : "depuis ta derniere visite, X nouvelles observations".
 *  - FeedSeenDivider  : frontiere "tu es a jour" entre nouveautes et deja vu.
 *
 * Volontairement sobres (ton Naturegraph, non anxiogene) et 100% tokens DS
 * (aucune couleur en dur), coherents light/dark.
 */

import { useTranslation } from 'react-i18next'
import { Sparkles, Leaf } from 'lucide-react'

/** Entete de jour : libelle + filet. `role="separator"` annonce la coupure. */
export function FeedDaySeparator({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-3 px-1 pt-4 pb-2 md:pt-2"
    >
      <span className="text-sm font-bold text-[var(--color-text-secondary)]">{label}</span>
      <span className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
    </div>
  )
}

/**
 * Bandeau "contenus manques" : cadre doux + compteur. Formulation orientee
 * DECOUVERTE (pas "rattrapage"). Masque par l'appelant si count = 0 ou 1ere visite.
 */
export function FeedMissedBanner({ count }: { count: number }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-default)]/12 text-[var(--color-action-default)]">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          {t('home.feed.missed.title', { defaultValue: 'Depuis ta dernière visite' })}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('home.feed.missed.count', {
            count,
            defaultValue: '{{count}} nouvelles observations à découvrir',
          })}
        </p>
      </div>
    </div>
  )
}

/**
 * Frontiere "tu es a jour" : point de fin identifiable entre les nouvelles
 * observations et les publications deja vues.
 */
export function FeedSeenDivider() {
  const { t } = useTranslation()
  return (
    <div role="separator" className="flex flex-col items-center gap-1 py-6 text-center">
      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-primary)]">
        <Leaf className="size-4 text-[var(--color-action-default)]" aria-hidden="true" />
        {t('home.feed.upToDate.title', { defaultValue: 'Tu es à jour' })}
      </p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {t('home.feed.upToDate.subtitle', {
          defaultValue: 'Tu as découvert toutes les nouvelles rencontres.',
        })}
      </p>
    </div>
  )
}
