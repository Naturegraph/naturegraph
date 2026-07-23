/**
 * FilEchanges : rendu du fil, sans aucun acces aux donnees
 * =============================================================================
 *
 * Separe DELIBEREMENT du branchement aux donnees (`EchangesSection`) : le meme
 * rendu sert au fil reel et a la page de demonstration, qui travaille sur un
 * jeu d'essai en memoire. Sans cette separation, la demonstration finit par
 * diverger de ce que voient les utilisateurs, et ne vaut plus rien comme
 * support de relecture.
 *
 * Ce composant ne sait ni charger, ni ecrire : il recoit des groupes deja
 * construits (`construireFils`) et remonte les gestes a son appelant.
 */

import { EchangeFil } from './EchangeFil'
import { EchangeComposer } from './EchangeComposer'
import type { FilGroupe } from './grouperParJour'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

interface FilEchangesProps {
  groupes: FilGroupe[]
  /** Identifiant de la personne connectee, `null` pour un visiteur. */
  moiId: string | null
  peutEcrire: boolean
  auteurPublicationId: string
  /** Envoi en cours : desactive le bouton du champ principal. */
  enCours?: boolean
  /** Especes deja proposees par la personne connectee, pour bloquer le doublon. */
  especesDejaProposees?: string[]
  onEnvoyer: (
    contenu: string,
    intention: IntentionEchange,
    parentId: string | null,
    suggestion?: SuggestionEspece | null,
  ) => void
  onSupprimer: (echangeId: string) => void
  onReagir: (echange: Echange) => void
  /** Affiche invitant, quand la publication n'a encore aucun echange. */
  etatVide?: boolean
}

export function FilEchanges({
  groupes,
  moiId,
  peutEcrire,
  auteurPublicationId,
  enCours = false,
  especesDejaProposees,
  onEnvoyer,
  onSupprimer,
  onReagir,
  etatVide = false,
}: FilEchangesProps) {
  return (
    <>
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        {/*
          Etat vide chaleureux et incitatif : "Aucun commentaire" constate un
          manque, ici on propose un geste, ce dont a besoin une communaute qui
          demarre.
        */}
        {etatVide && (
          <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-foreground">Personne n’a encore réagi à cette rencontre</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Une question, une piste d’identification, un encouragement : ouvre la discussion.
            </p>
          </div>
        )}

        {groupes.map((groupe) => (
          <div key={groupe.libelle} className="mb-6 last:mb-0">
            <p className="mb-3 text-xs text-muted-foreground">{groupe.libelle}</p>
            <ul className="flex flex-col gap-4">
              {groupe.fils.map(({ parent, reponses }) => (
                <EchangeFil
                  key={parent.id}
                  parent={parent}
                  reponses={reponses}
                  moiId={moiId}
                  peutEcrire={peutEcrire}
                  auteurPublicationId={auteurPublicationId}
                  especesDejaProposees={especesDejaProposees}
                  onRepondre={(contenu, intention, parentId, suggestion) =>
                    onEnvoyer(contenu, intention, parentId, suggestion)
                  }
                  onSupprimer={onSupprimer}
                  onReagir={onReagir}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/*
        Bandeau de saisie : fond distinct sur TOUTE la largeur de la carte, en
        pied (maquette 6822-39589). Le fond separe l'ecriture de la lecture sans
        tracer un trait de plus, et ancre le champ comme la barre de saisie
        d'une messagerie. Sans lui, le champ flottait a la suite du dernier
        message comme s'il en faisait partie.
      */}
      <div className="bg-surface-bubble px-4 py-4 md:rounded-b-card md:px-6 md:py-6">
        <EchangeComposer
          peutEcrire={peutEcrire}
          enCours={enCours}
          especesDejaProposees={especesDejaProposees}
          onPublier={(contenu, intention, suggestion) =>
            onEnvoyer(contenu, intention, null, suggestion)
          }
        />
      </div>
    </>
  )
}
