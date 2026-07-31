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

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useEchanges,
  usePublierEchange,
  useSupprimerEchange,
  useModifierEchange,
  useBasculerReactionEchange,
  useRealtimeEchanges,
  cleEchanges,
} from '@/hooks/useEchanges'
import { useFollowing, useToggleFollow } from '@/hooks/useFollow'
import { ReportModal } from '@/components/home/ReportModal'
import { SectionErrorBoundary } from '@/components/layout/SectionErrorBoundary'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { LoadingState } from '@/components/ui'
import { FilEchanges } from './FilEchanges'
import { construireFils } from './grouperParJour'
import { cleEspece } from '@/services/echangeService'
import type { Echange, IntentionEchange, SuggestionEspece } from '@/services/echangeService'

interface EchangesSectionProps {
  postId: string
  auteurPublicationId: string
  /**
   * Autorise la proposition d'espece dans le fil. `false` sur un Instant nature
   * (paysage/phenomene) : on n'identifie pas une espece sur ce qui n'en montre
   * pas, mais les echanges classiques restent. Defaut `true`.
   */
  especesAutorisees?: boolean
}

export function EchangesSection({
  postId,
  auteurPublicationId,
  especesAutorisees = true,
}: EchangesSectionProps) {
  const { user, profile, isAuthenticated } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  // Temps reel SOBRE : tant que ce fil est ouvert, les echanges des autres et
  // le compteur se mettent a jour en direct, sans refresh (2026-07-30).
  useRealtimeEchanges(postId)

  const { data: echanges = [], isLoading } = useEchanges(postId)
  const publier = usePublierEchange(postId, {
    id: user?.id ?? '',
    pseudo: profile?.username ?? null,
    avatar: profile?.avatar_url ?? null,
  })
  const supprimer = useSupprimerEchange(postId)
  const modifier = useModifierEchange(postId)
  const reagir = useBasculerReactionEchange(postId)

  // Echange en cours de signalement : la fenetre est celle des publications,
  // seul le libelle de la cible change. Reutiliser le meme formulaire evite
  // d'inventer un second parcours de signalement.
  const [echangeSignale, setEchangeSignale] = useState<Echange | null>(null)

  /**
   * Personnes deja suivies, pour que le menu dise "Suivre" ou "Ne plus suivre"
   * plutot que de proposer un abonnement qui existe deja.
   *
   * On charge la liste UNE fois plutot qu'un `useIsFollowing` par message : un
   * fil de trente echanges declencherait trente requetes pour la meme
   * information.
   */
  const { data: suivis = [] } = useFollowing(profile?.id, isAuthenticated)
  const auteursSuivis = useMemo(() => suivis.map((p) => p.id), [suivis])
  const basculerSuivi = useToggleFollow()

  function onBasculerSuivi(echange: Echange) {
    if (!isAuthenticated) return
    basculerSuivi.mutate(
      {
        targetUserId: echange.auteurId,
        currentlyFollowing: auteursSuivis.includes(echange.auteurId),
      },
      { onError: () => toast.error('L’abonnement n’a pas pu être modifié') },
    )
  }

  // Groupes de jours, du plus recent au plus ancien. Voir `construireFils`
  // pour le detail des deux sens de lecture.
  const groupes = useMemo(() => construireFils(echanges), [echanges])

  /**
   * Especes que MOI j'ai deja proposees sur cette publication.
   *
   * Sert a bloquer le doublon des le choix de l'espece. Le calcul porte sur le
   * fil deja charge : c'est un confort d'interface, la garantie reelle revient
   * a l'index unique en base (voir la migration `echanges_une_espece_par
   * _personne`), sans quoi deux onglets ouverts contourneraient la regle.
   */
  const mesEspeces = useMemo(
    () =>
      echanges
        .filter((e) => e.suggestion && e.auteurId === profile?.id)
        .map((e) => cleEspece(e.suggestion!)),
    [echanges, profile?.id],
  )

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
    <section aria-label="Échanges">
      <SectionErrorBoundary
        label="echanges"
        onReset={() => qc.invalidateQueries({ queryKey: cleEchanges(postId) })}
        resetKeys={[postId]}
      >
        {isLoading && (
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <LoadingState variant="skeleton" rows={2} label="Chargement des échanges" />
          </div>
        )}

        {echangeSignale && (
          <ReportModal
            postId={postId}
            commentId={echangeSignale.id}
            onClose={() => setEchangeSignale(null)}
          />
        )}

        {!isLoading && (
          <FilEchanges
            groupes={groupes}
            moiId={profile?.id ?? null}
            peutEcrire={isAuthenticated}
            auteurPublicationId={auteurPublicationId}
            enCours={publier.isPending}
            especesDejaProposees={mesEspeces}
            especesAutorisees={especesAutorisees}
            etatVide={echanges.length === 0}
            onEnvoyer={envoyer}
            onSupprimer={(id) =>
              supprimer.mutate(id, {
                onError: () => toast.error('Suppression impossible pour le moment'),
              })
            }
            onModifier={(id, contenu) =>
              modifier.mutate(
                { echangeId: id, contenu },
                { onError: () => toast.error('Ta modification n’a pas pu être enregistrée') },
              )
            }
            onSignaler={setEchangeSignale}
            onBasculerSuivi={onBasculerSuivi}
            auteursSuivis={auteursSuivis}
            onReagir={onReagir}
          />
        )}
      </SectionErrorBoundary>
    </section>
  )
}
