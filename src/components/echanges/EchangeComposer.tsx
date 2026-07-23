/**
 * EchangeComposer : champ de saisie d'un Echange
 * =============================================================================
 *
 * Calque sur les maquettes (Figma 6819-12903) : un champ arrondi, invite
 * "Partage ce que cette rencontre t'inspire…", un bouton "Proposer une espèce"
 * DANS le champ a droite, puis le bouton "Envoyer" en couleur d'action.
 *
 * Le champ est un `textarea` d'une ligne qui grandit avec le texte, et non un
 * `input` : un message d'identification fait souvent trois lignes, et un champ
 * qui defile horizontalement empeche de se relire.
 *
 * L'INTENTION n'est plus choisie dans une barre de pastilles (absente des
 * maquettes) : elle decoule du geste. Ecrire librement vaut `reaction`, passer
 * par "Proposer une espèce" vaut `identification`. La colonne en base ne bouge
 * pas, seule la facon de la renseigner change.
 *
 * Ctrl/Cmd + Entree envoie. Entree seul insere un retour a la ligne : sur un
 * champ multiligne, envoyer a la moindre pression couperait les messages en
 * deux.
 *
 * COMPTEUR DE CARACTERES : meme motif que le formulaire de contribution
 * (compteur "n/max" aligne a droite, passage en rouge au depassement), pour que
 * l'etat se lise pareil partout dans l'app. Il n'apparait qu'a l'approche de la
 * limite : afficher "0 / 500" des le depart donne l'impression d'un devoir a
 * rendre, ce qui est exactement l'inverse de l'effet recherche.
 *
 * La frappe n'est PAS bloquee a 500 (`maxLength` volontairement absent). Un
 * champ qui cesse silencieusement d'accepter les touches laisse croire au
 * clavier casse ; ici on laisse depasser, on le dit, et on desactive l'envoi.
 *
 * Le visiteur non connecte voit le champ mais est redirige vers l'inscription
 * au premier geste, comme partout ailleurs dans l'app (regle Nicolas : pas de
 * banniere, l'invitation vient a l'action).
 */

import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, MessageSquarePlus } from 'lucide-react'
import { SuggestionEspecePanel } from './SuggestionEspecePanel'
import type { IntentionEchange, SuggestionEspece } from '@/services/echangeService'
import { LONGUEUR_MAX_ECHANGE } from '@/services/echangeService'

interface EchangeComposerProps {
  peutEcrire: boolean
  enCours: boolean
  onPublier: (
    contenu: string,
    intention: IntentionEchange,
    suggestion?: SuggestionEspece | null,
  ) => void
  /** Mode reponse : plus discret, sans bouton "Proposer une espèce". */
  compact?: boolean
  /** Invite du champ. Par defaut celle des maquettes. */
  invite?: string
  /** Especes deja proposees par la personne connectee, pour bloquer le doublon. */
  especesDejaProposees?: string[]
}

/** Seuil d'apparition du compteur : on ne stresse qu'a l'approche de la limite. */
const SEUIL_COMPTEUR = LONGUEUR_MAX_ECHANGE - 150

const INVITE_PAR_DEFAUT = 'Partage ce que cette rencontre t’inspire…'

export function EchangeComposer({
  peutEcrire,
  enCours,
  onPublier,
  compact = false,
  invite,
  especesDejaProposees,
}: EchangeComposerProps) {
  const navigate = useNavigate()
  const champ = useRef<HTMLTextAreaElement>(null)
  const idChamp = useId()
  const [contenu, setContenu] = useState('')
  // Le panneau d'espece REMPLACE le champ au lieu de s'ouvrir a cote : les deux
  // aboutissent au meme message, en afficher deux laisserait croire a deux
  // envois possibles.
  const [panneauEspece, setPanneauEspece] = useState(false)

  const trop = contenu.length > LONGUEUR_MAX_ECHANGE
  const pret = contenu.trim().length > 0 && !trop && !enCours
  const placeholder = invite ?? INVITE_PAR_DEFAUT

  function auGeste() {
    if (!peutEcrire) navigate('/signup')
  }

  function proposerEspece() {
    if (!peutEcrire) return navigate('/signup')
    setPanneauEspece(true)
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!peutEcrire) return navigate('/signup')
    if (!pret) return
    onPublier(contenu, 'reaction', null)
    setContenu('')
  }

  if (panneauEspece) {
    return (
      <SuggestionEspecePanel
        especesDejaProposees={especesDejaProposees}
        onAnnuler={() => setPanneauEspece(false)}
        onSuggerer={(suggestion, commentaire) => {
          onPublier(commentaire, 'identification', suggestion)
          setPanneauEspece(false)
        }}
      />
    )
  }

  return (
    <form onSubmit={soumettre}>
      <div className="flex items-end gap-3">
        <div
          className={[
            'relative min-h-12 flex-1 rounded-3xl border bg-cream-lighter transition-colors',
            'focus-within:ring-2 focus-within:ring-primary',
            trop ? 'border-[var(--color-error)]' : 'border-border',
          ].join(' ')}
        >
          <label htmlFor={idChamp} className="sr-only">
            Ton échange
          </label>
          <textarea
            id={idChamp}
            ref={champ}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            onFocus={auGeste}
            placeholder={placeholder}
            rows={1}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                soumettre(e as unknown as React.FormEvent)
              }
            }}
            // maxLength volontairement absent : on prefere laisser depasser et
            // le dire clairement plutot que bloquer la frappe sans explication.
            className={[
              'max-h-40 w-full resize-none bg-transparent py-3.5 pl-4 text-base text-foreground',
              'placeholder:text-muted-foreground focus-visible:outline-none',
              compact ? 'pr-4' : 'pr-14',
            ].join(' ')}
          />

          {/* "Proposer une espèce" : dans le champ a droite, comme la maquette.
              Masque en mode reponse, ou l'action existe deja sur le message. */}
          {!compact && (
            <button
              type="button"
              onClick={proposerEspece}
              aria-label="Proposer une espèce"
              title="Proposer une espèce"
              className={[
                'absolute bottom-1 right-1 inline-flex size-10 items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'text-foreground hover:bg-muted/40',
              ].join(' ')}
            >
              <MessageSquarePlus className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sous 640px le libelle disparait et le bouton devient un rond de
            48px : a cette largeur, "Envoyer" ecrit en toutes lettres prend la
            place du champ lui-meme. La cible tactile reste a 48px, au-dessus du
            minimum WCAG, et le libelle reste lu par les lecteurs d'ecran. */}
        {/*
          Etat DESACTIVE du design system : fond lavande + texte grise
          (`--color-action-disabled`), et non une opacite. Une opacite delave
          aussi le fond et donne un bouton "sale" ; ici il reste net, seulement
          clairement indisponible.

          Sous 640px le libelle disparait et le bouton devient un rond de 48px :
          a cette largeur, "Envoyer" ecrit en toutes lettres prend la place du
          champ. La cible tactile reste a 48px et le libelle reste lu par les
          lecteurs d'ecran.
        */}
        <button
          type="submit"
          disabled={peutEcrire && !pret}
          aria-label={enCours ? 'Envoi en cours' : 'Envoyer'}
          className={[
            'inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-full text-base font-bold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'sm:size-auto sm:h-12 sm:px-4',
            peutEcrire && !pret
              ? 'cursor-not-allowed bg-primary-light text-[var(--color-action-disabled)]'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          ].join(' ')}
        >
          <Send className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">{enCours ? 'Envoi…' : 'Envoyer'}</span>
        </button>
      </div>

      {/* Compteur aligne a droite, comme dans le formulaire de contribution.
          Deux etats : orange a l'approche, rouge au depassement, avec en plus
          une phrase explicite quand l'envoi devient impossible : un bouton
          grise sans explication laisse chercher la cause. */}
      {contenu.length > SEUIL_COMPTEUR && (
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p role={trop ? 'alert' : undefined} className="text-xs text-[var(--color-error)]">
            {trop ? `Retire ${contenu.length - LONGUEUR_MAX_ECHANGE} caractères pour envoyer.` : ''}
          </p>
          <span
            aria-live="polite"
            className={[
              'shrink-0 text-xs tabular-nums',
              trop
                ? 'font-medium text-[var(--color-error)]'
                : 'font-medium text-[var(--color-warning)]',
            ].join(' ')}
          >
            {contenu.length}/{LONGUEUR_MAX_ECHANGE}
          </span>
        </div>
      )}
    </form>
  )
}
