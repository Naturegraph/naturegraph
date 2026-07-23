/**
 * EchangesSection : le fil d'Echanges sous une publication
 * =============================================================================
 *
 * "Echanges" et non "commentaires" (decision Nicolas 2026-07-22) : le mot
 * commentaire est connote et souvent mal vecu. Le vocabulaire suit celui du
 * produit, qui dit deja Migrateurs et Rencontre Nature.
 *
 * Ordre de lecture : chronologique, comme une vraie conversation. Les reponses
 * sont regroupees sous le message auquel elles repondent, sur UN SEUL niveau
 * (regle appliquee aussi en base par un trigger) : au-dela, un fil devient
 * illisible sur mobile, chaque niveau divisant la largeur utile.
 *
 * Lecture ouverte a tous, y compris aux visiteurs sans compte : suite logique
 * de NG-054. Ecrire demande un compte, et l'invitation vient au premier geste,
 * sans banniere.
 */

import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
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
import { EchangeFiltres } from './EchangeFiltres'
import type { Echange, IntentionEchange, TypeReactionEchange } from '@/services/echangeService'

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

  const [filtre, setFiltre] = useState<IntentionEchange | null>(null)

  /**
   * Regroupe chaque message de premier niveau avec ses reponses.
   *
   * Le filtre ne s'applique QU'AUX messages de premier niveau : masquer une
   * reponse parce que son intention differe de celle du parent couperait la
   * conversation en deux et la rendrait incomprehensible.
   */
  const fils = useMemo(() => {
    const racines = echanges.filter((e) => !e.parentId)
    const vues = filtre ? racines.filter((e) => e.intention === filtre) : racines
    return vues.map((parent) => ({
      parent,
      reponses: echanges.filter((e) => e.parentId === parent.id),
    }))
  }, [echanges, filtre])

  // "A ouvert la discussion" revient au plus ancien message de premier niveau.
  const idPremier = useMemo(() => {
    const racines = echanges.filter((e) => !e.parentId)
    if (racines.length === 0) return null
    return racines.reduce((a, b) => (a.creeLe <= b.creeLe ? a : b)).id
  }, [echanges])

  function envoyer(contenu: string, intention: IntentionEchange, parentId?: string) {
    if (!contenu.trim()) return
    publier.mutate(
      { contenu, intention, parentId: parentId ?? null },
      {
        onError: (e) =>
          toast.error(
            'Ton échange n’a pas pu être envoyé',
            e instanceof Error ? e.message : undefined,
          ),
      },
    )
  }

  function onReagir(echange: Echange, type: TypeReactionEchange) {
    if (!isAuthenticated) return
    reagir.mutate(
      { echangeId: echange.id, type, actuelle: echange.maReaction },
      { onError: () => toast.error('Ta réaction n’a pas pu être enregistrée') },
    )
  }

  const racinesCount = echanges.filter((e) => !e.parentId).length

  return (
    <section aria-labelledby="titre-echanges" className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" aria-hidden="true" />
        <h2 id="titre-echanges" className="font-title text-lg font-bold text-foreground">
          Échanges
        </h2>
        {echanges.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">{echanges.length}</span>
        )}
      </div>

      <div className="mb-4">
        <EchangeComposer
          peutEcrire={isAuthenticated}
          enCours={publier.isPending}
          onPublier={(contenu, intention) => envoyer(contenu, intention)}
        />
      </div>

      {isLoading && <LoadingState variant="skeleton" rows={2} label="Chargement des échanges" />}

      {/*
        Etat vide chaleureux et incitatif : "Aucun commentaire" constate un
        manque, ici on propose un geste, ce dont a besoin une communaute qui
        demarre.
      */}
      {!isLoading && echanges.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
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

      {!isLoading && racinesCount > 0 && (
        <EchangeFiltres
          echanges={echanges.filter((e) => !e.parentId)}
          actif={filtre}
          onChanger={setFiltre}
        />
      )}

      {fils.length > 0 && (
        <ul>
          {fils.map(({ parent, reponses }) => (
            <EchangeFil
              key={parent.id}
              parent={parent}
              reponses={reponses}
              moiId={profile?.id ?? null}
              peutEcrire={isAuthenticated}
              auteurPublicationId={auteurPublicationId}
              estPremier={parent.id === idPremier}
              onRepondre={(contenu, intention, parentId) => envoyer(contenu, intention, parentId)}
              onSupprimer={(id) =>
                supprimer.mutate(id, {
                  onError: () => toast.error('Suppression impossible pour le moment'),
                })
              }
              onReagir={onReagir}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
