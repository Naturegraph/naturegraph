/**
 * EchangeItem : un Echange dans le fil d'une publication
 * =============================================================================
 *
 * Rendu CALQUE SUR LES MAQUETTES (Figma node 6819-12903, Nicolas 2026-07-22) :
 *
 *   [avatar 32] [bulle grise, radius 8]
 *                 pseudo gras 14  [Auteur]  il y a 39 minutes
 *                 texte 14 / interligne 1.5
 *                 [pastille espece · niveau de confiance]
 *   ♡ Réagir  •  ✎ Répondre  •  ⊞ Proposer une espèce
 *
 * La bulle porte le fond, pas la ligne : c'est ce qui distingue une
 * conversation d'une liste. Les actions vivent SOUS la bulle, sur le fond de la
 * publication : garder le fond gris sous des boutons les ferait lire comme une
 * barre d'outils rattachee au texte, alors que ce sont des gestes du lecteur.
 *
 * Les trois actions sont separees par des puces de 4px plutot que par des
 * cadres : a cette taille, trois boutons dessines cote a cote pesent plus que
 * le message lui-meme.
 *
 * "Proposer une espèce" ouvre une recherche dans notre referentiel
 * (`SuggestionEspecePanel`) et publie une reponse portant l'espece choisie et
 * un niveau de confiance, affiches ici en pastille.
 *
 * Date relative via `Intl.RelativeTimeFormat`, natif : aucune dependance
 * ajoutee pour formater une date (regle eco-conception).
 */

import { Heart, Pencil, MessageSquarePlus, Trash2, Leaf, Sprout } from 'lucide-react'
import type { Echange } from '@/services/echangeService'
import { libelleConfiance } from '@/services/echangeService'
import hermineIcon from '@/assets/images/hermine-icon.png'

interface EchangeItemProps {
  echange: Echange
  /** Le lecteur peut-il supprimer cet echange (le sien, ou moderation) ? */
  peutSupprimer: boolean
  /** Auteur de l'echange = auteur de la publication. */
  ecritParAuteurPublication: boolean
  /** Une reponse : avatar et bulle legerement resserres. */
  estUneReponse?: boolean
  /** Repondre, avec l'intention voulue. Absent = on ne repond pas ici. */
  onRepondre?: (intention: 'reaction' | 'identification') => void
  onSupprimer: () => void
  /** Bascule la reaction "coeur", seule reaction prevue par les maquettes. */
  onReagir: () => void
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

/** "il y a 3 minutes", "hier"… Repli sur la date absolue au-dela d'une semaine. */
function dateRelative(iso: string): string {
  const secondes = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secondes < 60) return 'à l’instant'
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const heures = Math.round(minutes / 60)
  if (heures < 24) return rtf.format(-heures, 'hour')
  const jours = Math.round(heures / 24)
  if (jours < 7) return rtf.format(-jours, 'day')
  return new Date(iso).toLocaleDateString('fr-FR')
}

/**
 * Puce de separation entre deux actions (ellipse 4px des maquettes).
 *
 * Masquee sous 640px : les trois actions passent alors sur deux lignes, et une
 * puce orpheline en debut de ligne se lit comme une erreur d'affichage. L'ecart
 * suffit a les separer.
 */
function Puce() {
  return (
    <span
      aria-hidden="true"
      className="hidden size-1 shrink-0 rounded-full bg-[var(--color-border-dark)] sm:block"
    />
  )
}

/**
 * Action d'un echange : icone 14px + libelle 12px, sans cadre.
 *
 * Hauteur forcee a 24px : c'est la taille des frames "Button" de la maquette,
 * et c'est aussi le minimum de cible tactile exige par WCAG 2.2 (2.5.8). Sans
 * ca le bouton ne fait que 16px, la hauteur du texte, et devient penible a
 * viser au pouce.
 */
function Action({
  icone: Icone,
  children,
  onClick,
  danger = false,
}: {
  icone: typeof Heart
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        danger
          ? 'text-muted-foreground hover:text-[var(--color-error)]'
          : 'text-foreground hover:text-primary',
      ].join(' ')}
    >
      <Icone className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </button>
  )
}

/**
 * Bouton de reaction : un seul coeur en phase 1 (decision Nicolas 2026-07-22).
 *
 * TROIS ETATS, et un seul visible a la fois :
 *
 *   1. personne n'a reagi      -> coeur vide + le mot "Réagir"
 *   2. des gens ont reagi      -> coeur vide + le nombre, sans libelle
 *   3. j'ai reagi              -> l'emoji ❤️ plein + le nombre
 *
 * Le libelle ne sert qu'a amorcer le geste. Des qu'un compteur existe il
 * devient du bruit : le chiffre dit deja de quoi il s'agit, et le retirer
 * raccourcit une barre d'actions qui doit tenir sur une ligne en mobile.
 *
 * L'etat "j'ai reagi" passe a l'emoji plutot qu'a une icone coloree, pour etre
 * reconnaissable d'un coup d'oeil et rester coherent avec les reactions des
 * publications, qui sont deja des emojis.
 */
function BoutonReagir({
  nombre,
  actif,
  onClick,
}: {
  nombre: number
  actif: boolean
  onClick: () => void
}) {
  const libelle = actif
    ? `Retirer ma réaction (${nombre})`
    : nombre > 0
      ? `Réagir (${nombre})`
      : 'Réagir'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      aria-label={libelle}
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        actif ? 'font-semibold text-foreground' : 'text-foreground hover:text-primary',
      ].join(' ')}
    >
      {actif ? (
        <span aria-hidden="true" className="text-sm leading-none">
          ❤️
        </span>
      ) : (
        <Heart className="size-3.5 shrink-0" aria-hidden="true" />
      )}

      {nombre > 0 ? (
        <span className="tabular-nums">{nombre}</span>
      ) : (
        <span aria-hidden="true">Réagir</span>
      )}
    </button>
  )
}

export function EchangeItem({
  echange,
  peutSupprimer,
  ecritParAuteurPublication,
  estUneReponse = false,
  onRepondre,
  onSupprimer,
  onReagir,
}: EchangeItemProps) {
  const pseudo = echange.auteurPseudo ?? 'Migrateur'
  const jaimeCoeur = echange.maReaction === 'coeur'

  return (
    <li className="flex gap-3">
      <img
        src={echange.auteurAvatar || hermineIcon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover bg-primary-light"
      />

      <div className="min-w-0 flex-1">
        {/* La bulle ne porte que l'identite et le message. Les actions vivent
            EN DESSOUS, sur le fond de la publication : garder le fond gris sous
            des boutons les ferait lire comme une barre d'outils rattachee au
            texte, alors que ce sont des gestes du lecteur. */}
        <div className="rounded-sm bg-surface-bubble px-3 py-2">
          {/* Ligne d'identite : pseudo, badge Auteur, date */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-foreground">{pseudo}</span>

            {ecritParAuteurPublication && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                <Leaf className="size-3" aria-hidden="true" />
                Auteur
              </span>
            )}

            <span className="text-xs text-muted-foreground">{dateRelative(echange.creeLe)}</span>
          </div>

          <p
            className={`mt-1 whitespace-pre-line text-sm text-foreground ${
              estUneReponse ? 'leading-normal' : 'leading-relaxed'
            }`}
          >
            {echange.contenu}
          </p>

          {/* Pastille de suggestion : l'espece proposee et le niveau de
              confiance, sous le texte. Separer les deux permet de lire d'un
              coup d'oeil CE QUI est propose sans avoir a decoder la phrase,
              et de comparer plusieurs suggestions entre elles. */}
          {echange.suggestion && (
            <p className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs">
              <Sprout className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-medium text-foreground">{echange.suggestion.label}</span>
              {echange.suggestion.scientifique &&
                echange.suggestion.scientifique !== echange.suggestion.label && (
                  <span className="italic text-muted-foreground">
                    {echange.suggestion.scientifique}
                  </span>
                )}
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="text-muted-foreground">
                {libelleConfiance(echange.suggestion.confiance)}
              </span>
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <BoutonReagir nombre={echange.reactions.coeur} actif={jaimeCoeur} onClick={onReagir} />

          {onRepondre && (
            <>
              <Puce />
              <Action icone={Pencil} onClick={() => onRepondre('reaction')}>
                Répondre
              </Action>
              <Puce />
              <Action icone={MessageSquarePlus} onClick={() => onRepondre('identification')}>
                Proposer une espèce
              </Action>
            </>
          )}

          {peutSupprimer && (
            <>
              <Puce />
              <Action icone={Trash2} onClick={onSupprimer} danger>
                Supprimer
              </Action>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
