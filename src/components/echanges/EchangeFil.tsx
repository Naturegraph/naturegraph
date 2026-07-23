/**
 * EchangeFil : un echange et ses reponses
 * =============================================================================
 *
 * Regroupe un message de premier niveau avec les reponses qui lui sont
 * rattachees, et gere l'ouverture du champ de reponse juste en dessous.
 *
 * Le champ de reponse s'ouvre EN LIGNE, sous le message concerne, plutot que
 * dans une fenetre ou en bas de page : on garde sous les yeux ce a quoi on
 * repond, ce qui evite les reponses a cote du sujet.
 */

import { useState } from 'react'
import { EchangeItem } from './EchangeItem'
import { EchangeComposer } from './EchangeComposer'
import type { Echange, IntentionEchange, TypeReactionEchange } from '@/services/echangeService'

interface EchangeFilProps {
  parent: Echange
  reponses: Echange[]
  /** Identifiant de la personne connectee, `null` pour un visiteur. */
  moiId: string | null
  peutEcrire: boolean
  auteurPublicationId: string
  estPremier: boolean
  onRepondre: (contenu: string, intention: IntentionEchange, parentId: string) => void
  onSupprimer: (echangeId: string) => void
  onReagir: (echange: Echange, type: TypeReactionEchange) => void
}

export function EchangeFil({
  parent,
  reponses,
  moiId,
  peutEcrire,
  auteurPublicationId,
  estPremier,
  onRepondre,
  onSupprimer,
  onReagir,
}: EchangeFilProps) {
  const [repondEnCours, setRepondEnCours] = useState(false)

  return (
    <li className="border-b border-border last:border-b-0">
      <ul>
        <EchangeItem
          echange={parent}
          peutSupprimer={!!moiId && moiId === parent.auteurId}
          estPremier={estPremier}
          ecritParAuteurPublication={parent.auteurId === auteurPublicationId}
          onRepondre={() =>
            peutEcrire ? setRepondEnCours((v) => !v) : onRepondre('', 'reaction', parent.id)
          }
          onSupprimer={() => onSupprimer(parent.id)}
          onReagir={(type) => onReagir(parent, type)}
        />

        {reponses.map((r) => (
          <EchangeItem
            key={r.id}
            echange={r}
            peutSupprimer={!!moiId && moiId === r.auteurId}
            estPremier={false}
            ecritParAuteurPublication={r.auteurId === auteurPublicationId}
            estUneReponse
            // Pas de bouton "Répondre" sur une reponse : un seul niveau, la
            // regle est aussi appliquee en base par un trigger.
            onSupprimer={() => onSupprimer(r.id)}
            onReagir={(type) => onReagir(r, type)}
          />
        ))}
      </ul>

      {repondEnCours && (
        <div className="ml-6 mb-3 border-l-2 border-l-border pl-3">
          <EchangeComposer
            peutEcrire={peutEcrire}
            enCours={false}
            compact
            invitePersonnalisee={`Répondre à ${parent.auteurPseudo ?? 'ce message'}…`}
            onPublier={(contenu, intention) => {
              onRepondre(contenu, intention, parent.id)
              setRepondEnCours(false)
            }}
          />
        </div>
      )}
    </li>
  )
}
