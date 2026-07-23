/**
 * PAGE TEMPORAIRE DE DEMONSTRATION, A SUPPRIMER APRES RELECTURE.
 *
 * Montre le fil d'Echanges avec un jeu d'essai couvrant tous les cas, sans
 * ecrire une seule ligne en base : inventer des propos et les attribuer a de
 * vraies personnes, qui les verraient sur leur compte, n'est pas acceptable
 * (regle formelle Nicolas 2026-07-22).
 *
 * Utilise les VRAIS composants, donc ce qui s'affiche ici est exactement ce que
 * verront les utilisateurs.
 */

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { EchangeFil } from '@/components/echanges/EchangeFil'
import { EchangeFiltres } from '@/components/echanges/EchangeFiltres'
import { EchangeComposer } from '@/components/echanges/EchangeComposer'
import { ECHANGES_MOCK, AUTEUR_PUBLICATION_MOCK } from '@/data/mock/echangesMock'
import type { Echange, IntentionEchange, TypeReactionEchange } from '@/services/echangeService'

const MOI = 'moi'

export default function DevEchangesPreview() {
  const [echanges, setEchanges] = useState<Echange[]>(ECHANGES_MOCK)
  const [filtre, setFiltre] = useState<IntentionEchange | null>(null)

  const racines = echanges.filter((e) => !e.parentId)
  const vues = filtre ? racines.filter((e) => e.intention === filtre) : racines
  const idPremier = racines.length
    ? racines.reduce((a, b) => (a.creeLe <= b.creeLe ? a : b)).id
    : null

  function ajouter(contenu: string, intention: IntentionEchange, parentId: string | null) {
    if (!contenu.trim()) return
    setEchanges((liste) => [
      ...liste,
      {
        id: `local-${Date.now()}`,
        postId: 'demo',
        auteurId: MOI,
        contenu,
        intention,
        utile: false,
        creeLe: new Date().toISOString(),
        auteurPseudo: 'Toi',
        auteurAvatar: null,
        parentId,
        reactions: { coeur: 0, accord: 0, confirme: 0 },
        maReaction: null,
      },
    ])
  }

  function reagir(cible: Echange, type: TypeReactionEchange) {
    setEchanges((liste) =>
      liste.map((e) => {
        if (e.id !== cible.id) return e
        const compte = { ...e.reactions }
        if (e.maReaction) compte[e.maReaction] = Math.max(0, compte[e.maReaction] - 1)
        const retire = e.maReaction === type
        if (!retire) compte[type] += 1
        return { ...e, reactions: compte, maReaction: retire ? null : type }
      }),
    )
  }

  return (
    <div className="min-h-screen bg-off-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-title text-xl font-bold text-foreground">Échanges : démonstration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Page temporaire. Données fictives, aucune écriture en base. Composants réels.
        </p>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-title text-lg font-bold text-foreground">Échanges</h2>
            <span className="text-sm text-muted-foreground tabular-nums">{echanges.length}</span>
          </div>

          <div className="mb-4">
            <EchangeComposer
              peutEcrire
              enCours={false}
              onPublier={(contenu, intention) => ajouter(contenu, intention, null)}
            />
          </div>

          <EchangeFiltres echanges={racines} actif={filtre} onChanger={setFiltre} />

          <ul>
            {vues.map((parent) => (
              <EchangeFil
                key={parent.id}
                parent={parent}
                reponses={echanges.filter((e) => e.parentId === parent.id)}
                moiId={MOI}
                peutEcrire
                auteurPublicationId={AUTEUR_PUBLICATION_MOCK}
                estPremier={parent.id === idPremier}
                onRepondre={(contenu, intention, parentId) => ajouter(contenu, intention, parentId)}
                onSupprimer={(id) => setEchanges((l) => l.filter((x) => x.id !== id))}
                onReagir={reagir}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
