/**
 * EchangeItem : un Echange dans le fil d'une publication
 * =============================================================================
 *
 * Ce qui distingue cet affichage d'un commentaire de reseau social, sans en
 * casser les codes (structure avatar + pseudo + texte, familiere de tous) :
 *
 *   - une PASTILLE D'INTENTION quand l'echange apporte autre chose qu'une
 *     reaction (piste d'identification, info du coin, encouragement) ;
 *   - "a ouvert la discussion" sur le tout premier echange, parce que sur une
 *     communaute jeune le geste difficile n'est pas d'echanger, c'est d'oser
 *     etre le premier ;
 *   - trois REACTIONS courtes, dont "Je confirme" qui a une vraie valeur
 *     naturaliste : valider l'identification proposee par quelqu'un d'autre
 *     est un acte de la communaute, pas un like ;
 *   - des REPONSES sur un seul niveau, pour garder un fil lisible sur mobile.
 *
 * "Ca m'a aide" a ete ECARTE de l'interface (Nicolas 2026-07-22, juge peu
 * clair). La colonne reste en base, dormante.
 *
 * Date relative via `Intl.RelativeTimeFormat`, natif : aucune dependance
 * ajoutee pour formater une date (regle eco-conception).
 */

import { Trash2, CornerDownRight } from 'lucide-react'
import type { Echange, TypeReactionEchange } from '@/services/echangeService'
import { REACTIONS_ECHANGE } from '@/services/echangeService'
import { trouverIntention } from './intentions'
import hermineIcon from '@/assets/images/hermine-icon.png'

interface EchangeItemProps {
  echange: Echange
  /** Le lecteur peut-il supprimer cet echange (le sien, ou moderation) ? */
  peutSupprimer: boolean
  /** Premier echange de la publication : on salue celui qui a ouvert le fil. */
  estPremier: boolean
  /** Auteur de l'echange = auteur de la publication. */
  ecritParAuteurPublication: boolean
  /** Une reponse : rendu plus compact, decale sous son parent. */
  estUneReponse?: boolean
  /** Absent sur une reponse : on ne repond pas a une reponse (un seul niveau). */
  onRepondre?: () => void
  onSupprimer: () => void
  onReagir: (type: TypeReactionEchange) => void
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
  peutSupprimer,
  estPremier,
  ecritParAuteurPublication,
  estUneReponse = false,
  onRepondre,
  onSupprimer,
  onReagir,
}: EchangeItemProps) {
  const intention = trouverIntention(echange.intention)
  const pseudo = echange.auteurPseudo ?? 'Migrateur'
  const total = REACTIONS_ECHANGE.reduce((n, r) => n + echange.reactions[r.cle], 0)

  // Une reponse est decalee et surmontee d'un filet vertical : le lien avec le
  // message parent se lit d'un coup d'oeil, sans repeter "en reponse a".
  const decalage = estUneReponse ? 'ml-6 border-l-2 border-l-border pl-3' : ''
  const taille = estUneReponse ? 'size-7' : 'size-9'

  return (
    <li className={`flex gap-3 py-3 ${decalage}`}>
      <img
        src={echange.auteurAvatar || hermineIcon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={estUneReponse ? 28 : 36}
        height={estUneReponse ? 28 : 36}
        className={`${taille} shrink-0 rounded-full object-cover bg-primary-light`}
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

          {estPremier && !estUneReponse && (
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

        {/*
          Barre d'actions : reactions a gauche, repondre et supprimer a droite.
          Les reactions restent discretes tant que personne n'a reagi ; des
          qu'un compteur existe, il s'affiche, ce qui donne sa vie au fil.
        */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1">
            {REACTIONS_ECHANGE.map((r) => {
              const nombre = echange.reactions[r.cle]
              const actif = echange.maReaction === r.cle
              // On masque une reaction jamais utilisee, sauf si le fil est
              // encore vierge : sinon chaque message porterait trois emojis
              // gris, ce qui alourdit sans rien apporter.
              if (nombre === 0 && total > 0 && !actif) return null
              return (
                <button
                  key={r.cle}
                  type="button"
                  onClick={() => onReagir(r.cle)}
                  aria-pressed={actif}
                  aria-label={`${r.libelle}${nombre > 0 ? ` : ${nombre}` : ''}`}
                  className={[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    actif
                      ? 'bg-primary-light text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/40',
                  ].join(' ')}
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  {nombre > 0 && <span className="tabular-nums">{nombre}</span>}
                </button>
              )
            })}
          </div>

          {onRepondre && (
            <button
              type="button"
              onClick={onRepondre}
              className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CornerDownRight className="size-3.5" aria-hidden="true" />
              Répondre
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
      </div>
    </li>
  )
}
