/**
 * EchangeItem : un Echange dans le fil d'une publication
 * =============================================================================
 *
 * Ce qui distingue cet affichage d'un commentaire de reseau social, sans en
 * casser les codes (structure avatar + pseudo + texte, familiere de tous) :
 *
 *   - une PASTILLE D'INTENTION quand l'echange apporte autre chose qu'une
 *     reaction (piste d'identification, info du coin, encouragement) ;
 *   - la distinction UTILE, posee par l'auteur de la publication, qui valorise
 *     la qualite et non le volume ;
 *   - "a ouvert la discussion" sur le tout premier echange, parce que sur une
 *     communaute jeune le geste difficile n'est pas de commenter, c'est d'oser
 *     etre le premier.
 *
 * Date relative via `Intl.RelativeTimeFormat`, natif : aucune dependance
 * ajoutee pour formater une date (regle eco-conception).
 */

import { Trash2, Sparkles } from 'lucide-react'
import type { Echange } from '@/services/echangeService'
import { trouverIntention } from './intentions'
import hermineIcon from '@/assets/images/hermine-icon.png'

interface EchangeItemProps {
  echange: Echange
  /** Le lecteur est-il l'auteur de la PUBLICATION (il peut distinguer un echange) ? */
  estAuteurPublication: boolean
  /** Le lecteur peut-il supprimer cet echange (le sien, ou moderation) ? */
  peutSupprimer: boolean
  /** Premier echange de la publication : on salue celui qui a ouvert le fil. */
  estPremier: boolean
  /** Auteur de l'echange = auteur de la publication. */
  ecritParAuteurPublication: boolean
  onSupprimer: () => void
  onBasculerUtile: () => void
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

/** "il y a 3 minutes", "hier"… Repli sur la date absolue au-dela d'une semaine. */
function dateRelative(iso: string): string {
  const secondes = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secondes < 60) return "a l'instant"
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const heures = Math.round(minutes / 60)
  if (heures < 24) return rtf.format(-heures, 'hour')
  const jours = Math.round(heures / 24)
  if (jours < 7) return rtf.format(-jours, 'day')
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function EchangeItem({
  echange,
  estAuteurPublication,
  peutSupprimer,
  estPremier,
  ecritParAuteurPublication,
  onSupprimer,
  onBasculerUtile,
}: EchangeItemProps) {
  const intention = trouverIntention(echange.intention)
  const pseudo = echange.auteurPseudo ?? 'Migrateur'
  // L'echange distingue prend un liseré vert : il se repere d'un coup d'oeil
  // sans crier, contrairement a un fond colore qui ecraserait le texte.
  const cadre = echange.utile
    ? 'border-l-2 border-l-[var(--color-success)] bg-[var(--color-success-bg)]/25'
    : 'border-l-2 border-l-transparent'

  return (
    <li className={`flex gap-3 rounded-r-xl py-3 pl-3 pr-1 transition-colors ${cadre}`}>
      <img
        src={echange.auteurAvatar || hermineIcon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full object-cover bg-primary-light"
      />

      <div className="min-w-0 flex-1">
        {/* Ligne d'identite : pseudo, qualites, date */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-bold text-foreground">{pseudo}</span>

          {ecritParAuteurPublication && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
              Auteur
            </span>
          )}

          {echange.utile && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
              <span aria-hidden="true">🌿</span> Échange utile
            </span>
          )}

          {estPremier && !echange.utile && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span aria-hidden="true">🌱</span> a ouvert la discussion
            </span>
          )}

          <span className="text-xs text-muted-foreground">{dateRelative(echange.creeLe)}</span>
        </div>

        {/* Pastille d'intention : absente sur une simple reaction */}
        {intention.pastille && (
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${intention.classes}`}
          >
            <span aria-hidden="true">{intention.emoji}</span> {intention.pastille}
          </span>
        )}

        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
          {echange.contenu}
        </p>

        {/* Actions : discretes, jamais en avant */}
        {(estAuteurPublication || peutSupprimer) && (
          <div className="mt-1.5 flex items-center gap-3">
            {estAuteurPublication && !ecritParAuteurPublication && (
              <button
                type="button"
                onClick={onBasculerUtile}
                className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-[var(--color-success)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                {echange.utile ? 'Retirer la distinction' : 'Ça m’a aidé'}
              </button>
            )}

            {peutSupprimer && (
              <button
                type="button"
                onClick={onSupprimer}
                className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
