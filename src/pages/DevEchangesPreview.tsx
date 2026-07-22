/**
 * PAGE TEMPORAIRE DE DEMONSTRATION, A SUPPRIMER APRES RELECTURE.
 *
 * Montre le fil d'Echanges avec un jeu d'essai couvrant tous les cas, sans
 * ecrire une seule ligne en base : inventer des propos et les attribuer a de
 * vraies personnes, qui les verraient sur leur compte, n'est pas acceptable.
 *
 * Utilise les VRAIS composants, donc ce qui s'affiche ici est exactement ce que
 * verront les utilisateurs.
 */

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { EchangeItem } from '@/components/echanges/EchangeItem'
import { EchangeFiltres } from '@/components/echanges/EchangeFiltres'
import { EchangeComposer } from '@/components/echanges/EchangeComposer'
import { ECHANGES_MOCK, AUTEUR_PUBLICATION_MOCK } from '@/data/mock/echangesMock'
import type { Echange, IntentionEchange } from '@/services/echangeService'

export default function DevEchangesPreview() {
  const [echanges, setEchanges] = useState<Echange[]>(ECHANGES_MOCK)
  const [filtre, setFiltre] = useState<IntentionEchange | null>(null)
  // On se met dans la peau de l'auteur de la publication : c'est lui qui peut
  // distinguer un echange utile, l'action la plus interessante a essayer.
  const [jeSuisAuteur, setJeSuisAuteur] = useState(true)

  const vus = filtre ? echanges.filter((e) => e.intention === filtre) : echanges
  const ordonnes = [...vus.filter((e) => e.utile), ...vus.filter((e) => !e.utile)]
  const idPremier = echanges.length
    ? echanges.reduce((a, b) => (a.creeLe <= b.creeLe ? a : b)).id
    : null

  return (
    <div className="min-h-screen bg-off-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-title text-xl font-bold text-foreground">Échanges : démonstration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Page temporaire. Données fictives, aucune écriture en base. Composants réels.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={jeSuisAuteur}
            onChange={(e) => setJeSuisAuteur(e.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
          Je suis l’auteur de la publication (permet de distinguer un échange)
        </label>

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
              onPublier={(contenu, intention) =>
                setEchanges((liste) => [
                  ...liste,
                  {
                    id: `local-${Date.now()}`,
                    postId: 'demo',
                    auteurId: 'moi',
                    contenu,
                    intention,
                    utile: false,
                    creeLe: new Date().toISOString(),
                    auteurPseudo: 'Toi',
                    auteurAvatar: null,
                  },
                ])
              }
            />
          </div>

          <EchangeFiltres echanges={echanges} actif={filtre} onChanger={setFiltre} />

          <ul className="divide-y divide-border">
            {ordonnes.map((e) => (
              <EchangeItem
                key={e.id}
                echange={e}
                estAuteurPublication={jeSuisAuteur}
                peutSupprimer={e.auteurId === 'moi'}
                estPremier={e.id === idPremier}
                ecritParAuteurPublication={e.auteurId === AUTEUR_PUBLICATION_MOCK}
                onSupprimer={() => setEchanges((l) => l.filter((x) => x.id !== e.id))}
                onBasculerUtile={() =>
                  setEchanges((l) =>
                    l.map((x) =>
                      x.id === e.id ? { ...x, utile: !x.utile } : { ...x, utile: false },
                    ),
                  )
                }
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
