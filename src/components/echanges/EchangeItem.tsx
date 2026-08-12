/**
 * EchangeItem : un Echange dans le fil d'une publication
 * =============================================================================
 *
 * Rendu CALQUE SUR LES MAQUETTES (Figma node 6819-12903, Nicolas 2026-07-22) :
 *
 *   [avatar 32] [bulle grise, radius 8]
 *                 pseudo gras 14  [Auteur]  il y a 39 minutes
 *                 texte 14 / interligne 1.5
 *                 [Identification  Nom  nom scientifique   niveau]
 *   ♡ Réagir  •  ✎ Répondre  •  ⊞ Proposer une espèce
 *
 * La bulle porte le fond, pas la ligne : c'est ce qui distingue une
 * conversation d'une liste. Elle EPOUSE son contenu (`w-fit`) plutot que de
 * tirer sur toute la largeur : une phrase de six mots dans un bandeau pleine
 * largeur se lit comme un formulaire, alors qu'une bulle courte donne le rythme
 * d'une vraie conversation. `max-w-full` garde les messages longs dans la
 * colonne, qui redeviennent alors pleine largeur d'eux-memes.
 *
 * Les actions vivent SOUS la bulle, sur le fond de la publication : garder le
 * fond gris sous des boutons les ferait lire comme une barre d'outils rattachee
 * au texte, alors que ce sont des gestes du lecteur.
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

import { Heart, Pencil, MessageSquarePlus, Leaf, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EchangeMenu } from './EchangeMenu'
import { LONGUEUR_MAX_ECHANGE } from '@/services/echangeService'
import { joursCivilsEcoules } from './grouperParJour'
import type { Echange } from '@/services/echangeService'
import { libelleConfiance } from '@/services/echangeService'
import hermineIcon from '@/assets/images/hermine-icon.png'

interface EchangeItemProps {
  echange: Echange
  /** L'echange appartient a la personne connectee : elle peut le modifier. */
  estLeMien: boolean
  /** Personne connectee : sans compte, le menu d'actions n'a rien a proposer. */
  peutAgir: boolean
  /** Suit deja l'auteur ? `null` tant que l'information n'est pas connue. */
  suitAuteur?: boolean | null
  /** Auteur de l'echange = auteur de la publication. */
  ecritParAuteurPublication: boolean
  /** Une reponse : avatar et bulle legerement resserres. */
  estUneReponse?: boolean
  /** `false` sur un Instant nature (paysage) : pas d'action "Proposer une espèce". */
  especesAutorisees?: boolean
  /** Repondre, avec l'intention voulue. Absent = on ne repond pas ici. */
  onRepondre?: (intention: 'reaction' | 'identification') => void
  /** Panneau de redaction actuellement ouvert sous ce message, pour l'etat actif. */
  redactionOuverte?: 'reaction' | 'identification' | null
  onSupprimer: () => void
  /** Enregistre le texte corrige. */
  onModifier: (contenu: string) => void
  onSignaler: () => void
  onBasculerSuivi: () => void
  /** Bascule la reaction "coeur", seule reaction prevue par les maquettes. */
  onReagir: () => void
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

/**
 * "il y a 3 minutes", "hier"… Repli sur la date absolue au-dela d'une semaine.
 *
 * Au-dela de 24 heures, le calcul porte sur le JOUR CIVIL et non sur un ecart
 * arrondi en jours : un message d'hier 11h affichait "avant-hier" alors que son
 * separateur de groupe disait "Hier", parce que 29 heures s'arrondissaient a
 * deux jours. Les deux doivent toujours raconter la meme chose, sinon le fil se
 * contredit sous les yeux du lecteur.
 */
function dateRelative(iso: string): string {
  const date = new Date(iso)
  const secondes = Math.round((Date.now() - date.getTime()) / 1000)
  if (secondes < 60) return 'à l’instant'
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const heures = Math.round(minutes / 60)
  if (heures < 24) return rtf.format(-heures, 'hour')

  const jours = joursCivilsEcoules(iso)
  if (jours < 7) return rtf.format(-jours, 'day')
  return date.toLocaleDateString('fr-FR')
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
  actif = false,
  danger = false,
}: {
  icone: typeof Heart
  children: React.ReactNode
  onClick: () => void
  /** Le panneau ouvert par cette action est visible : pastille lavande. */
  actif?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={actif || undefined}
      className={[
        'inline-flex h-6 items-center gap-1 rounded-full px-1.5 text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        danger
          ? 'text-muted-foreground hover:text-[var(--color-error)]'
          : actif
            ? 'bg-primary-light font-medium text-foreground'
            : 'text-foreground hover:text-[var(--color-link)]',
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
        'inline-flex h-6 items-center gap-1 rounded-full px-1.5 text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        actif ? 'font-semibold text-foreground' : 'text-foreground hover:text-[var(--color-link)]',
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

/**
 * Couleurs du niveau de confiance : ECHELLE DE TEMPERATURE, du froid au chaud
 * (decision Nicolas 2026-07-22). Uniquement des tokens semantiques du DS, qui
 * s'inversent seuls en dark.
 *
 *   1  Pas sûr    info     bleu     froid
 *   2  Assez sûr  success  vert     tiede
 *   3  Très sûr   warning  orange   chaud
 *   4  Certain    error    rouge    brulant
 *
 * Le froid-chaud dit une INTENSITE, pas un jugement, contrairement a une
 * echelle rouge-vers-vert qui se lirait "mauvais vers bon" et punirait la
 * prudence. Ici le rouge marque l'affirmation la plus forte, pas une faute, et
 * le bleu n'est pas une sanction : dire qu'on hesite reste exactement ce qu'on
 * veut encourager chez qui debute.
 *
 * Le niveau porte la couleur, PAS le bloc entier : c'est la seule information
 * qui varie d'une suggestion a l'autre, donc la seule qui merite d'attirer
 * l'oeil. Deux suggestions se comparent alors d'un coup d'oeil.
 */
const COULEURS_CONFIANCE: Record<number, string> = {
  1: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  2: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  3: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  4: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
}

/**
 * Bloc de suggestion d'espece, sous le texte du message.
 *
 * Rendu en carte CLAIRE plutot qu'en pastille lavande : sur la bulle grise, du
 * violet pale sur violet pale ne se lisait pratiquement pas (retour Nicolas
 * 2026-07-22). Le contraste de fond suffit a detacher le bloc et lui donne le
 * poids d'une donnee, pas d'une decoration.
 *
 * Pas de bordure (retour Nicolas) : elle ajoutait un trait sans information sur
 * une zone deja dense. L'icone reprise est celle de "Proposer une espèce", ce
 * qui relie visuellement le geste et son resultat.
 *
 * Le bloc EPOUSE son contenu, comme la bulle qui l'entoure : etale sur toute la
 * largeur, il redonnerait au fil l'allure de formulaire qu'on cherche a eviter.
 */
function BlocSuggestion({ suggestion }: { suggestion: NonNullable<Echange['suggestion']> }) {
  const scientifiqueUtile =
    suggestion.scientifique && suggestion.scientifique !== suggestion.label
      ? suggestion.scientifique
      : null

  return (
    <div className="mt-2 inline-flex max-w-full flex-wrap items-center gap-2 rounded-sm bg-background px-3 py-2">
      <MessageSquarePlus className="size-4 shrink-0 text-foreground" aria-hidden="true" />
      <span className="text-sm font-bold text-foreground">{suggestion.label}</span>
      {scientifiqueUtile && (
        <span className="text-sm text-muted-foreground">{scientifiqueUtile}</span>
      )}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          COULEURS_CONFIANCE[suggestion.confiance] ?? COULEURS_CONFIANCE[1]
        }`}
      >
        {libelleConfiance(suggestion.confiance)}
      </span>
    </div>
  )
}

export function EchangeItem({
  echange,
  estLeMien,
  peutAgir,
  suitAuteur = null,
  ecritParAuteurPublication,
  estUneReponse = false,
  especesAutorisees = true,
  onRepondre,
  redactionOuverte = null,
  onSupprimer,
  onModifier,
  onSignaler,
  onBasculerSuivi,
  onReagir,
}: EchangeItemProps) {
  const pseudo = echange.auteurPseudo ?? 'Migrateur'
  const jaimeCoeur = echange.maReaction === 'coeur'

  const [enEdition, setEnEdition] = useState(false)
  const [brouillon, setBrouillon] = useState(echange.contenu)
  const champEdition = useRef<HTMLTextAreaElement>(null)

  // Focus par effet plutot que par `autoFocus` : la regle d'accessibilite
  // interdit `autoFocus` parce qu'il vole le focus au chargement d'une page.
  // Ici l'ouverture suit un clic explicite sur "Modifier", donner le focus est
  // exactement ce qu'on attend, mais on le fait au bon moment.
  useEffect(() => {
    if (!enEdition) return
    const champ = champEdition.current
    if (!champ) return
    champ.focus()
    // Curseur en FIN de texte : on vient corriger, pas tout reecrire.
    champ.setSelectionRange(champ.value.length, champ.value.length)
  }, [enEdition])
  const editionTropLongue = brouillon.length > LONGUEUR_MAX_ECHANGE
  const editionPrete = brouillon.trim().length > 0 && !editionTropLongue

  function ouvrirEdition() {
    setBrouillon(echange.contenu)
    setEnEdition(true)
  }

  function enregistrer() {
    if (!editionPrete) return
    onModifier(brouillon)
    setEnEdition(false)
  }

  // Echange supprime par son auteur mais garde en tombstone (il portait des
  // reponses). On n'affiche ni identite, ni actions, ni suggestion : juste un
  // marqueur neutre, pour que les reponses conservees restent rattachees a
  // quelque chose sans exposer un message qui n'existe plus.
  if (echange.supprime) {
    return (
      <li className="flex gap-3">
        {/* Hermine par defaut (pas l'avatar reel) : le message est supprime,
            on n'expose plus son auteur. */}
        <img
          src={hermineIcon}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover bg-primary-light"
        />
        <div className="min-w-0 flex-1">
          <div className="w-fit max-w-full rounded-sm bg-surface-bubble p-3">
            <p className="text-sm italic text-muted-foreground">Échange supprimé</p>
          </div>
        </div>
      </li>
    )
  }

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
        {/*
          Echange masque par les signalements : SEUL son auteur (et la
          moderation) le voit encore, la RLS l'ecarte pour tout le monde. On le
          dit explicitement : sans ce bandeau, l'auteur croirait a un bug ou a
          une perte de donnee, et republierait le meme message.
        */}
        {echange.etatModeration === 'auto_hidden' && (
          <p className="mb-2 flex items-center gap-2 rounded-sm bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]">
            <EyeOff className="size-4 shrink-0" aria-hidden="true" />
            Cet échange a été signalé et n’est plus visible par les autres, le temps qu’il soit
            examiné.
          </p>
        )}

        {/* La bulle prend toute la largeur quand elle porte le menu : un bouton
            colle au texte d'une bulle courte se lirait comme une ponctuation.
            Elle epouse son contenu sinon, pour garder le rythme du fil. */}
        <div
          className={`max-w-full rounded-sm bg-surface-bubble p-3 ${peutAgir ? 'w-full' : 'w-fit'}`}
        >
          {/* Ligne d'identite : le menu ellipsis est ANCRE en haut a droite,
              hors du flux d'enroulement. L'identite (pseudo + badge + date)
              s'enroule dans l'espace restant a gauche : quand tout ne tient pas
              (typiquement avec le badge "Auteur"), c'est la DATE qui passe a la
              ligne, jamais le menu. Avant, le menu etait pousse par `ml-auto`
              DANS le meme flex : des qu'une ligne debordait, il partait seul sur
              une 2e ligne et laissait un decalage vide a droite (retour Nicolas). */}
          <div className="flex items-start gap-x-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold text-foreground">{pseudo}</span>

              {/* Badge NEUTRE et non vert (retour Nicolas 2026-07-22) : depuis que
                  le niveau de confiance porte une rampe de quatre couleurs, un
                  badge colore de plus ferait cinq teintes dans la meme bulle. Le
                  fond clair sur la bulle grise suffit a le detacher, et la
                  couleur ne signale plus qu'UNE chose : la confiance. */}
              {ecritParAuteurPublication && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                  <Leaf className="size-3" aria-hidden="true" />
                  Auteur
                </span>
              )}

              <span className="text-xs text-muted-foreground">
                {dateRelative(echange.creeLe)}
                {/* "modifié" plutot que la date de modification : la date de
                    publication reste le repere du fil, on signale seulement que
                    le texte n'est plus celui d'origine. */}
                {echange.modifieLe && <span className="ml-1">(modifié)</span>}
              </span>
            </div>

            {peutAgir && (
              <EchangeMenu
                estLeMien={estLeMien}
                peutAgir={peutAgir}
                suit={suitAuteur}
                pseudoAuteur={pseudo}
                onModifier={ouvrirEdition}
                onSupprimer={onSupprimer}
                onSignaler={onSignaler}
                onBasculerSuivi={onBasculerSuivi}
              />
            )}
          </div>

          {enEdition ? (
            <div className="mt-2">
              <label htmlFor={`edition-${echange.id}`} className="sr-only">
                Modifier ton échange
              </label>
              <textarea
                id={`edition-${echange.id}`}
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                ref={champEdition}
                rows={3}
                className={[
                  'block w-full resize-y rounded-sm border bg-card px-3 py-2 text-sm text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  editionTropLongue ? 'border-[var(--color-error)]' : 'border-border',
                ].join(' ')}
              />
              {editionTropLongue && (
                <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  Retire {brouillon.length - LONGUEUR_MAX_ECHANGE} caractères pour enregistrer.
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={enregistrer}
                  disabled={!editionPrete}
                  className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEnEdition(false)}
                  className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`mt-1 whitespace-pre-line text-sm text-foreground ${
                estUneReponse ? 'leading-normal' : 'leading-relaxed'
              }`}
            >
              {echange.contenu}
            </p>
          )}

          {/* La suggestion n'est PAS modifiable : changer l'espece apres coup
              rendrait incomprehensibles les reponses deja publiees dessous.
              Pour proposer autre chose, on supprime et on repropose. */}
          {echange.suggestion && <BlocSuggestion suggestion={echange.suggestion} />}
        </div>

        {/* Barre d'actions resserree pour tenir sur UNE ligne (retour Nicolas) :
            gap reduit (gap-x-1) et plus de puces de separation, qui mangeaient le
            plus de largeur et faisaient tomber "Proposer une espece" a la ligne.
            `flex-wrap` conserve en filet de securite sur les tres petits ecrans. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          <BoutonReagir nombre={echange.reactions.coeur} actif={jaimeCoeur} onClick={onReagir} />

          {onRepondre && (
            <>
              <Action
                icone={Pencil}
                actif={redactionOuverte === 'reaction'}
                onClick={() => onRepondre('reaction')}
              >
                Répondre
              </Action>
              {/* "Proposer une espèce" masque sur un Instant nature (paysage :
                  rien a identifier) ET sur une reponse : proposer une espece
                  reste un geste de premier niveau, une reponse dans le fil ne
                  fait que continuer la conversation. */}
              {especesAutorisees && !estUneReponse && (
                <Action
                  icone={MessageSquarePlus}
                  actif={redactionOuverte === 'identification'}
                  onClick={() => onRepondre('identification')}
                >
                  Proposer une espèce
                </Action>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  )
}
