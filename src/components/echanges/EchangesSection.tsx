/**
 * EchangesSection : le fil d'Echanges sous une publication
 * =============================================================================
 *
 * "Echanges" et non "commentaires" (decision Nicolas 2026-07-22) : le mot
 * commentaire est connote et souvent mal vecu. Le vocabulaire suit celui du
 * produit, qui dit deja Migrateurs et Rencontre Nature.
 *
 * Ordre de lecture : chronologique, comme une vraie conversation. Seule
 * exception, l'echange distingue "utile" remonte en tete, parce que c'est
 * l'information que quelqu'un qui arrive sur la publication cherche en premier
 * (souvent l'identification de l'espece).
 *
 * Lecture ouverte a tous, y compris aux visiteurs sans compte : c'est la suite
 * logique de NG-054, qui a ouvert les publications. Ecrire demande un compte,
 * et l'invitation vient au premier geste, sans banniere.
 */

import { useMemo } from 'react'
import { MessageCircle } from 'lucide-react'
import {
  useEchanges,
  usePublierEchange,
  useSupprimerEchange,
  useBasculerEchangeUtile,
} from '@/hooks/useEchanges'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { LoadingState } from '@/components/ui'
import { EchangeComposer } from './EchangeComposer'
import { EchangeItem } from './EchangeItem'
import type { IntentionEchange } from '@/services/echangeService'

interface EchangesSectionProps {
  postId: string
  /** Auteur de la publication : lui seul peut distinguer un echange utile. */
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
  const basculerUtile = useBasculerEchangeUtile(postId)

  const estAuteurPublication = !!profile && profile.id === auteurPublicationId

  // L'echange distingue passe en tete, le reste garde l'ordre de la discussion.
  const ordonnes = useMemo(() => {
    const utile = echanges.filter((e) => e.utile)
    const autres = echanges.filter((e) => !e.utile)
    return [...utile, ...autres]
  }, [echanges])

  // "A ouvert la discussion" revient au plus ancien, quel que soit l'ordre
  // d'affichage : c'est une question de chronologie, pas de position.
  const idPremier = useMemo(() => {
    if (echanges.length === 0) return null
    return echanges.reduce((a, b) => (a.creeLe <= b.creeLe ? a : b)).id
  }, [echanges])

  function onPublier(contenu: string, intention: IntentionEchange) {
    publier.mutate(
      { contenu, intention },
      {
        onError: (e) =>
          toast.error(
            'Ton échange n’a pas pu être envoyé',
            e instanceof Error ? e.message : undefined,
          ),
      },
    )
  }

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
          onPublier={onPublier}
        />
      </div>

      {isLoading && <LoadingState variant="skeleton" rows={2} label="Chargement des échanges" />}

      {/*
        Etat vide volontairement chaleureux et incitatif. "Aucun commentaire"
        constate un manque ; ici on propose un geste, ce qui est exactement le
        besoin d'une communaute qui demarre.
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

      {ordonnes.length > 0 && (
        <ul className="divide-y divide-border">
          {ordonnes.map((e) => (
            <EchangeItem
              key={e.id}
              echange={e}
              estAuteurPublication={estAuteurPublication}
              // Son propre echange. La moderation supprime depuis le panel
              // admin, pas depuis le fil public.
              peutSupprimer={!!profile && profile.id === e.auteurId}
              estPremier={e.id === idPremier}
              ecritParAuteurPublication={e.auteurId === auteurPublicationId}
              onSupprimer={() =>
                supprimer.mutate(e.id, {
                  onError: () => toast.error('Suppression impossible pour le moment'),
                })
              }
              onBasculerUtile={() =>
                basculerUtile.mutate(e.id, {
                  onError: () => toast.error('Action impossible pour le moment'),
                })
              }
            />
          ))}
        </ul>
      )}
    </section>
  )
}
