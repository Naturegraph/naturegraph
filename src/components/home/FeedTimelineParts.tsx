/**
 * FeedTimelineParts : petits reperes visuels du fil "oriente decouverte".
 * =============================================================================
 *  - FeedDaySeparator : entete de jour ("Aujourd'hui", "Hier", date).
 *  - FeedMissedBanner : "X nouveaux moments depuis ta derniere visite".
 *  - FeedSeenDivider  : "Tu t'etais arrete ici" entre nouveaux moments et anciens.
 *
 * Wording Naturegraph : terme generique = "moment" (englobe Rencontres + Instants).
 * Ton decouverte (jamais "rattraper" / "deja vu" / "contenu"), tutoiement partout.
 * Sobres et 100% tokens DS (aucune couleur en dur), coherents light/dark.
 */

import { useTranslation } from 'react-i18next'
import { Sparkles, Leaf } from 'lucide-react'

/**
 * Meme geometrie horizontale que la CARTE FeedPost.
 *  - Mobile : la carte est pleine largeur, on inset de px-5 (20px) pour aligner
 *    sur le CONTENU du post (et ne pas coller aux bords).
 *  - Desktop : la carte est `md:max-w-[704px] md:mx-auto`. On reprend la MEME
 *    largeur/centrage, SANS padding horizontal (md:px-0), pour que bandeau,
 *    boite "arrete ici" et separateurs s'alignent exactement sur la carte du
 *    post (et les tabs au-dessus), pas plus etroit.
 */
const FEED_ALIGN = 'w-full md:max-w-[704px] md:mx-auto px-5 md:px-0'

/** Entete de jour : libelle + filet. `role="separator"` annonce la coupure. */
export function FeedDaySeparator({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      // Espacement SYMETRIQUE (autant en haut qu'en bas) : c'est le seul ecart
      // entre deux posts de jours differents (les posts eux-memes sont colles).
      className={`flex items-center gap-3 py-4 ${FEED_ALIGN}`}
    >
      <span className="text-sm font-bold text-[var(--color-text-secondary)]">{label}</span>
      <span className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
    </div>
  )
}

/**
 * Bandeau des nouveaux moments : "X nouveaux moments depuis ta derniere visite".
 * "Moment" = terme generique (Rencontre OU Instant). Ton decouverte, une ligne.
 * Masque par l'appelant si count = 0 ou premiere visite.
 */
export function FeedMissedBanner({ count }: { count: number }) {
  const { t } = useTranslation()
  return (
    <div className={`mb-3 ${FEED_ALIGN}`}>
      <div
        role="status"
        className="flex items-center gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-default)]/12 text-[var(--color-action-default)]">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <p className="min-w-0 text-sm font-bold text-[var(--color-text-primary)]">
          {t('home.feed.missed.count', {
            count,
            defaultValue: '{{count}} nouveaux moments depuis ta dernière visite',
          })}
        </p>
      </div>
    </div>
  )
}

/**
 * Frontiere "Tu t'etais arrete ici" : repere ou l'utilisateur s'etait arrete a sa
 * derniere visite, entre les nouveaux moments et les moments deja parcourus.
 * Formulation positive (pas de "rattrapage"), independante du type de contenu.
 */
export function FeedSeenDivider() {
  const { t } = useTranslation()
  return (
    // Meme structure que le bandeau des nouveaux moments : icone a gauche + texte.
    <div className={`mt-6 mb-3 ${FEED_ALIGN}`}>
      <div
        role="separator"
        className="flex items-center gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-default)]/12 text-[var(--color-action-default)]">
          <Leaf className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            {t('home.feed.stoppedHere.title', { defaultValue: "Tu t'étais arrêté ici" })}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('home.feed.stoppedHere.subtitle', {
              defaultValue: 'Tu as découvert les derniers moments.',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
