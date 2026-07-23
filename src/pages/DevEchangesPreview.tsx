/**
 * PAGE TEMPORAIRE DE DEMONSTRATION, A SUPPRIMER APRES RELECTURE.
 *
 * Montre le fil d'Echanges avec un jeu d'essai couvrant tous les cas, sans
 * ecrire une seule ligne en base : inventer des propos et les attribuer a de
 * vraies personnes, qui les verraient sur leur compte, n'est pas acceptable
 * (regle formelle Nicolas 2026-07-22).
 *
 * Utilise les VRAIS composants, donc ce qui s'affiche ici est exactement ce que
 * verront les utilisateurs. La carte reprend la largeur et le fond de FeedPost
 * pour juger le fil dans son contexte reel.
 */

import { useState } from 'react'
import { EchangeFil } from '@/components/echanges/EchangeFil'
import { EchangeComposer } from '@/components/echanges/EchangeComposer'
import { construireFils } from '@/components/echanges/grouperParJour'
import { ECHANGES_MOCK, AUTEUR_PUBLICATION_MOCK } from '@/data/mock/echangesMock'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

const MOI = 'moi'

export default function DevEchangesPreview() {
  const [echanges, setEchanges] = useState<Echange[]>(ECHANGES_MOCK)

  const groupes = construireFils(echanges)

  function ajouter(
    contenu: string,
    intention: IntentionEchange,
    parentId: string | null,
    suggestion?: SuggestionEspece | null,
  ) {
    // Meme regle que le service : un message vide passe s'il porte une espece.
    if (!contenu.trim() && !suggestion) return
    setEchanges((liste) => [
      ...liste,
      {
        id: `local-${Date.now()}`,
        postId: 'demo',
        auteurId: MOI,
        contenu:
          contenu.trim() ||
          (suggestion ? `Je pense qu’il s’agit plutôt de : ${suggestion.label}` : ''),
        intention,
        utile: false,
        creeLe: new Date().toISOString(),
        auteurPseudo: 'Toi',
        auteurAvatar: null,
        parentId,
        reactions: { coeur: 0, accord: 0, confirme: 0 },
        maReaction: null,
        suggestion: suggestion ?? null,
      },
    ])
  }

  /** Bascule le coeur, seule reaction prevue par les maquettes. */
  function reagir(cible: Echange) {
    setEchanges((liste) =>
      liste.map((e) => {
        if (e.id !== cible.id) return e
        const actif = e.maReaction === 'coeur'
        return {
          ...e,
          reactions: { ...e.reactions, coeur: Math.max(0, e.reactions.coeur + (actif ? -1 : 1)) },
          maReaction: actif ? null : ('coeur' as const),
        }
      }),
    )
  }

  return (
    <div className="min-h-screen bg-cream-lighter py-0 md:py-8">
      <div className="mx-auto w-full md:max-w-[704px]">
        <p className="px-4 py-4 text-sm text-muted-foreground md:px-0 md:pt-0">
          Page temporaire. Données fictives, aucune écriture en base. Composants réels.
        </p>

        <div className="bg-background w-full md:rounded-card md:border-[0.5px] md:border-border">
          <section aria-label="Échanges">
            <div className="px-4 py-4 md:px-6 md:py-6">
              {groupes.map((groupe) => (
                <div key={groupe.libelle} className="mb-6 last:mb-0">
                  <p className="mb-3 text-xs text-muted-foreground">{groupe.libelle}</p>
                  <ul className="flex flex-col gap-4">
                    {groupe.fils.map(({ parent, reponses }) => (
                      <EchangeFil
                        key={parent.id}
                        parent={parent}
                        reponses={reponses}
                        moiId={MOI}
                        peutEcrire
                        auteurPublicationId={AUTEUR_PUBLICATION_MOCK}
                        onRepondre={(contenu, intention, parentId, suggestion) =>
                          ajouter(contenu, intention, parentId, suggestion)
                        }
                        onSupprimer={(id) => setEchanges((l) => l.filter((x) => x.id !== id))}
                        onReagir={reagir}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bandeau de saisie en pied de carte, cf. EchangesSection. */}
            <div className="rounded-b-card bg-surface-bubble px-4 py-4 md:px-6 md:py-6">
              <EchangeComposer
                peutEcrire
                enCours={false}
                onPublier={(contenu, intention, suggestion) =>
                  ajouter(contenu, intention, null, suggestion)
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
