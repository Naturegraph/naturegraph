/**
 * EchangesSection : le fil d'Echanges sous une publication
 * =============================================================================
 *
 * "Echanges" et non "commentaires" (decision Nicolas 2026-07-22) : le mot
 * commentaire est connote et souvent mal vecu. Le vocabulaire suit celui du
 * produit, qui dit deja Migrateurs et Rencontre Nature.
 *
 * Rendu calque sur les maquettes (Figma 6819-12903) : le fil est DANS la carte
 * de la publication, sans titre repete, groupe par jour ("Hier", "Il y a 3
 * jours"), et le champ de saisie ferme la carte en bas.
 *
 * Les separateurs de jour remplacent le tri par pertinence : sur une
 * conversation naturaliste, savoir QUAND une identification a ete proposee
 * compte plus que savoir laquelle a recu le plus de reactions.
 *
 * Ordre de lecture chronologique, comme une vraie conversation. Les reponses
 * sont regroupees sous le message auquel elles repondent, sur UN SEUL niveau
 * (regle appliquee aussi en base par un trigger) : au-dela, un fil devient
 * illisible sur mobile, chaque niveau divisant la largeur utile.
 *
 * Lecture ouverte a tous, y compris aux visiteurs sans compte : suite logique
 * de NG-054. Ecrire demande un compte, et l'invitation vient au premier geste,
 * sans banniere.
 */

import { useMemo } from 'react'
import {
  useEchanges,
  usePublierEchange,
  useSupprimerEchange,
  useBasculerReactionEchange,
} from '@/hooks/useEchanges'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { LoadingState } from '@/components/ui'
import { EchangeComposer } from './EchangeComposer'
import { EchangeFil } from './EchangeFil'
import { construireFils } from './grouperParJour'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

interface EchangesSectionProps {
  postId: string
  auteurPublicationId: string
}

export function EchangesSection({ postId, auteurPublicationId }: EchangesSectionProps) {
  const { user, profile, isAuthenticated } = useAuth()
  const toast = useToast()

  const { data: echanges = [], isLoading } = useEchanges(postId)
  const publier = usePublierEchange(postId, {
    id: user?.id ?? '',
    pseudo: profile?.username ?? null,
    avatar: profile?.avatar_url ?? null,
  })
  const supprimer = useSupprimerEchange(postId)
  const reagir = useBasculerReactionEchange(postId)

  // Groupes de jours, du plus recent au plus ancien. Voir `construireFils`
  // pour le detail des deux sens de lecture.
  const groupes = useMemo(() => construireFils(echanges), [echanges])

  function envoyer(
    contenu: string,
    intention: IntentionEchange,
    parentId?: string | null,
    suggestion?: SuggestionEspece | null,
  ) {
    // Un message vide est refuse, SAUF s'il porte une suggestion d'espece : le
    // service pose alors une phrase generique a la place (`phraseGenerique`).
    if (!contenu.trim() && !suggestion) return
    publier.mutate(
      { contenu, intention, parentId: parentId ?? null, suggestion: suggestion ?? null },
      {
        onError: (e) =>
          toast.error(
            'Ton échange n’a pas pu être envoyé',
            e instanceof Error ? e.message : undefined,
          ),
      },
    )
  }

  function onReagir(echange: Echange) {
    if (!isAuthenticated) return
    reagir.mutate(
      { echangeId: echange.id, type: 'coeur', actuelle: echange.maReaction },
      { onError: () => toast.error('Ta réaction n’a pas pu être enregistrée') },
    )
  }

  return (
    <section aria-label="Échanges" className="px-4 pb-4 md:px-6 md:pb-6">
      {isLoading && <LoadingState variant="skeleton" rows={2} label="Chargement des échanges" />}

      {/*
        Etat vide chaleureux et incitatif : "Aucun commentaire" constate un
        manque, ici on propose un geste, ce dont a besoin une communaute qui
        demarre.
      */}
      {!isLoading && echanges.length === 0 && (
        <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
          <p className="text-2xl" aria-hidden="true">
            🌱
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Personne n’a encore réagi à cette rencontre
          </p>
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
                moiId={profile?.id ?? null}
                peutEcrire={isAuthenticated}
                auteurPublicationId={auteurPublicationId}
                onRepondre={(contenu, intention, parentId, suggestion) =>
                  envoyer(contenu, intention, parentId, suggestion)
                }
                onSupprimer={(id) =>
                  supprimer.mutate(id, {
                    onError: () => toast.error('Suppression impossible pour le moment'),
                  })
                }
                onReagir={onReagir}
              />
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-6">
        <EchangeComposer
          peutEcrire={isAuthenticated}
          enCours={publier.isPending}
          onPublier={(contenu, intention, suggestion) =>
            envoyer(contenu, intention, null, suggestion)
          }
        />
      </div>
    </section>
  )
}
