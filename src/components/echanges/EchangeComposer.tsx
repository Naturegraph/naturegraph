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

import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui'
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
  /**
   * Texte pre-rempli a l'ouverture (ex. "@Nathalie " quand on repond a une
   * reponse). Quand il est fourni, le champ prend le focus et le curseur se
   * place en fin de texte, pret a ecrire apres la mention.
   */
  valeurInitiale?: string
  /** Especes deja proposees par la personne connectee, pour bloquer le doublon. */
  especesDejaProposees?: string[]
  /** `false` sur un Instant nature (paysage) : pas de bouton "Proposer une espèce". */
  especesAutorisees?: boolean
}

/** Seuil d'apparition du compteur : on ne stresse qu'a l'approche de la limite. */
const SEUIL_COMPTEUR = LONGUEUR_MAX_ECHANGE - 150

// Invite volontairement COURTE : la version longue ("Partage ce que cette
// rencontre t'inspire…") debordait du champ sur mobile et se faisait couper en
// plein milieu, ce qui donne l'inverse de l'accueil recherche.
const INVITE_PAR_DEFAUT = 'Partage ton ressenti…'

export function EchangeComposer({
  peutEcrire,
  enCours,
  onPublier,
  compact = false,
  invite,
  valeurInitiale,
  especesDejaProposees,
  especesAutorisees = true,
}: EchangeComposerProps) {
  const navigate = useNavigate()
  const champ = useRef<HTMLTextAreaElement>(null)
  const idChamp = useId()
  const [contenu, setContenu] = useState(valeurInitiale ?? '')

  // Champ ouvert avec une mention pre-remplie : on donne le focus et on place le
  // curseur APRES le "@pseudo " pour ecrire directement. On ne le fait que dans
  // ce cas (reponse a une reponse) pour ne pas voler le focus ailleurs. Le
  // composant est remonte a chaque cible (voir EchangeFil), l'effet rejoue donc
  // a chaque ouverture sans dependance supplementaire.
  useEffect(() => {
    if (!valeurInitiale || !champ.current) return
    const el = champ.current
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
        {/* Fond BLANC (`bg-card` = --color-surface) et non creme : sur la carte,
            elle aussi creme, le champ disparaissait et ne tenait que par sa
            bordure (retour Nicolas 2026-07-23). */}
        <div
          className={[
            'relative min-h-12 flex-1 rounded-[24px] border bg-card transition-colors',
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
              // py-[11px] + interligne 24 + bordure 1 = 48 exactement, la
              // hauteur de champ du design system.
              // `block` retire l'espace de descente que laisse un textarea en
              // inline-block : sans lui le champ mesurait 54 au lieu de 48.
              'block max-h-40 w-full resize-none bg-transparent py-[11px] pl-4 text-base leading-6 text-foreground',
              'placeholder:text-muted-foreground focus-visible:outline-none',
              compact || !especesAutorisees ? 'pr-4' : 'pr-14',
            ].join(' ')}
          />

          {/* "Proposer une espèce" : dans le champ a droite, comme la maquette.
              Masque en mode reponse (action deja sur le message) ET sur un
              Instant nature (paysage : rien a identifier). */}
          {!compact && especesAutorisees && (
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

        {/*
          Envoi : deux rendus selon la largeur (decision Nicolas 2026-07-29),
          CHACUN dans un conteneur qui gere seul l'affichage responsive.

          Pourquoi des <div> d'enrobage et pas `hidden`/`sm:hidden` poses
          directement sur les boutons : le `Button` du design system force
          `inline-flex` dans ses classes de base, ce qui l'emportait sur un
          `hidden` ajoute par-dessus (ordre des utilitaires Tailwind) -> les DEUX
          boutons s'affichaient en meme temps. Un conteneur neutre (display block
          par defaut) n'a pas ce conflit : exactement un bouton par palier.

          MOBILE (< 640px) : un vrai bouton ROND de 40px, icone centree, jumeau
          visuel du bouton "Proposer une espece" (meme `size-10`, memes tokens).
          On ne detourne PAS le `Button` du design system : sa taille md est un
          pill de 48px avec une marge d'icone qui decale le picto une fois le
          libelle masque. DESKTOP (>= 640px) : `Button` du design system, icone +
          libelle. Les deux sont `type="submit"` mais un seul est dans le flux.
        */}
        <div className="shrink-0 sm:hidden">
          <button
            type="submit"
            disabled={peutEcrire && !pret}
            aria-label={enCours ? 'Envoi en cours' : 'Envoyer'}
            // size-12 (48px) = MEME hauteur que le champ (`min-h-12`) : le rond
            // et le champ font la meme taille et s'alignent exactement (avant :
            // 40px, plus petit et decale vers le bas). Aligne aussi sur le DS
            // Button desktop (taille md = 48px).
            className={[
              'inline-flex size-12 items-center justify-center rounded-full',
              'bg-[var(--color-action-default)] text-[var(--color-text-white)] transition-all',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={peutEcrire && !pret}
            icon={<Send className="size-5" aria-hidden="true" />}
          >
            {enCours ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
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
