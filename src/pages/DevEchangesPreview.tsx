/**
 * PAGE TEMPORAIRE DE DEMONSTRATION, A SUPPRIMER APRES RELECTURE.
 *
 * Montre le fil d'Echanges avec un jeu d'essai couvrant tous les cas, sans
 * ecrire une seule ligne en base : inventer des propos et les attribuer a de
 * vraies personnes, qui les verraient sur leur compte, n'est pas acceptable
 * (regle formelle Nicolas 2026-07-22).
 *
 * Utilise le MEME composant de rendu que le fil reel (`FilEchanges`) : ce qui
 * s'affiche ici est donc exactement ce que verront les utilisateurs, et ne peut
 * pas deriver de son cote. Seule la source des donnees change.
 */

import { useState } from 'react'
import { FilEchanges } from '@/components/echanges/FilEchanges'
import { construireFils } from '@/components/echanges/grouperParJour'
import { ECHANGES_MOCK, AUTEUR_PUBLICATION_MOCK } from '@/data/mock/echangesMock'
import { cleEspece } from '@/services/echangeService'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

const MOI = 'moi'

export default function DevEchangesPreview() {
  const [echanges, setEchanges] = useState<Echange[]>(ECHANGES_MOCK)

  const groupes = construireFils(echanges)
  const mesEspeces = echanges
    .filter((e) => e.suggestion && e.auteurId === MOI)
    .map((e) => cleEspece(e.suggestion!))

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

        {/* Meme enveloppe que la carte de publication, pour juger le fil dans
            son contexte reel. */}
        <div className="bg-background w-full md:rounded-card md:border-[0.5px] md:border-border">
          <section aria-label="Échanges">
            <FilEchanges
              groupes={groupes}
              moiId={MOI}
              peutEcrire
              auteurPublicationId={AUTEUR_PUBLICATION_MOCK}
              especesDejaProposees={mesEspeces}
              etatVide={echanges.length === 0}
              onEnvoyer={ajouter}
              onSupprimer={(id) => setEchanges((l) => l.filter((x) => x.id !== id))}
              onReagir={reagir}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
