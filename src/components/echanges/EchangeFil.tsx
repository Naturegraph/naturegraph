/**
 * EchangeFil : un echange et ses reponses
 * =============================================================================
 *
 * Calque sur les maquettes (Figma 6819-12903) :
 *
 *   [message parent]
 *   1 réponse ⌃          <- repliable, en couleur d'action
 *   │  [reponse indentee, filet vertical a gauche]
 *
 * Le compteur "N réponse(s)" est REPLIABLE et ouvert par defaut. Replier plutot
 * que tronquer : on ne cache jamais une partie des reponses, on cache le bloc
 * entier, et le compteur dit toujours combien il y en a.
 *
 * Le champ de reponse s'ouvre EN LIGNE, sous le message concerne, plutot que
 * dans une fenetre ou en bas de page : on garde sous les yeux ce a quoi on
 * repond, ce qui evite les reponses a cote du sujet.
 *
 * Le decalage des reponses vaut 44px sur desktop (avatar 32 + gouttiere 12,
 * pour aligner sur la bulle du parent) mais tombe a 16px sous 640px : sur un
 * ecran etroit, 44px de marge gauche mangent une part visible de la largeur de
 * lecture, et le filet vertical suffit deja a marquer la hierarchie.
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { EchangeItem } from './EchangeItem'
import { EchangeComposer } from './EchangeComposer'
import { SuggestionEspecePanel } from './SuggestionEspecePanel'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

interface EchangeFilProps {
  parent: Echange
  reponses: Echange[]
  /** Identifiant de la personne connectee, `null` pour un visiteur. */
  moiId: string | null
  peutEcrire: boolean
  auteurPublicationId: string
  onRepondre: (
    contenu: string,
    intention: IntentionEchange,
    parentId: string,
    suggestion?: SuggestionEspece | null,
  ) => void
  onSupprimer: (echangeId: string) => void
  onModifier: (echangeId: string, contenu: string) => void
  onSignaler: (echange: Echange) => void
  onBasculerSuivi: (echange: Echange) => void
  onReagir: (echange: Echange) => void
  /** Especes deja proposees par la personne connectee, pour bloquer le doublon. */
  especesDejaProposees?: string[]
  /** `false` sur un Instant nature (paysage) : pas de proposition d'espèce. */
  especesAutorisees?: boolean
  /** Auteurs deja suivis, pour le libelle du menu. */
  auteursSuivis?: string[]
}

export function EchangeFil({
  parent,
  reponses,
  moiId,
  peutEcrire,
  auteurPublicationId,
  onRepondre,
  onSupprimer,
  onModifier,
  onSignaler,
  onBasculerSuivi,
  onReagir,
  especesDejaProposees,
  especesAutorisees = true,
  auteursSuivis = [],
}: EchangeFilProps) {
  // `null` = champ ferme. Sinon, l'intention du geste en cours.
  const [redaction, setRedaction] = useState<'reaction' | 'identification' | null>(null)
  const [replie, setReplie] = useState(false)

  const pseudoParent = parent.auteurPseudo ?? 'ce message'

  return (
    <li>
      <ul>
        <EchangeItem
          echange={parent}
          estLeMien={!!moiId && moiId === parent.auteurId}
          peutAgir={peutEcrire}
          suitAuteur={auteursSuivis.includes(parent.auteurId)}
          ecritParAuteurPublication={parent.auteurId === auteurPublicationId}
          especesAutorisees={especesAutorisees}
          onRepondre={(intention) => setRedaction((v) => (v === intention ? null : intention))}
          redactionOuverte={redaction}
          onSupprimer={() => onSupprimer(parent.id)}
          onModifier={(contenu) => onModifier(parent.id, contenu)}
          onSignaler={() => onSignaler(parent)}
          onBasculerSuivi={() => onBasculerSuivi(parent)}
          onReagir={() => onReagir(parent)}
        />
      </ul>

      {/* Repondre : champ simple. Proposer une espece : panneau de recherche.
          Les deux publient une REPONSE au meme message, seule la facon de la
          composer change. */}
      {redaction === 'reaction' && (
        <div className="mt-2 pl-4 sm:pl-11">
          <EchangeComposer
            peutEcrire={peutEcrire}
            enCours={false}
            compact
            invite={`Répondre à ${pseudoParent}…`}
            onPublier={(contenu) => {
              onRepondre(contenu, 'reaction', parent.id, null)
              setRedaction(null)
            }}
          />
        </div>
      )}

      {redaction === 'identification' && (
        <div className="mt-2 pl-4 sm:pl-11">
          <SuggestionEspecePanel
            especesDejaProposees={especesDejaProposees}
            onAnnuler={() => setRedaction(null)}
            onSuggerer={(suggestion, commentaire) => {
              onRepondre(commentaire, 'identification', parent.id, suggestion)
              setRedaction(null)
            }}
          />
        </div>
      )}

      {reponses.length > 0 && (
        <div className="mt-2 pl-4 sm:pl-11">
          <button
            type="button"
            onClick={() => setReplie((v) => !v)}
            aria-expanded={!replie}
            // h-6 : cible tactile de 24px minimum (WCAG 2.2), le texte seul
            // n'en ferait que 16.
            className="inline-flex h-6 items-center gap-1.5 rounded text-xs font-medium text-[var(--color-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {reponses.length} réponse{reponses.length > 1 ? 's' : ''}
            {replie ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-4" aria-hidden="true" />
            )}
          </button>

          {!replie && (
            // Filet vertical continu a gauche : le lien avec le message parent
            // se lit d'un coup d'oeil, sans repeter "en reponse a".
            <ul className="mt-2 flex flex-col gap-3 border-l border-border pl-3 sm:pl-5">
              {reponses.map((r) => (
                <EchangeItem
                  key={r.id}
                  echange={r}
                  estLeMien={!!moiId && moiId === r.auteurId}
                  peutAgir={peutEcrire}
                  suitAuteur={auteursSuivis.includes(r.auteurId)}
                  ecritParAuteurPublication={r.auteurId === auteurPublicationId}
                  estUneReponse
                  // Pas de "Répondre" sur une reponse : un seul niveau, la regle
                  // est aussi appliquee en base par un trigger.
                  onSupprimer={() => onSupprimer(r.id)}
                  onModifier={(contenu) => onModifier(r.id, contenu)}
                  onSignaler={() => onSignaler(r)}
                  onBasculerSuivi={() => onBasculerSuivi(r)}
                  onReagir={() => onReagir(r)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
