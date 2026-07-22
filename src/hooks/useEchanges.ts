/**
 * useEchanges : hooks React Query pour les Echanges d'une publication
 * =============================================================================
 *
 * Pas de Realtime ici (decision Nicolas 2026-07-22) : l'echange qu'on ecrit
 * apparait immediatement, ceux des autres au rechargement. Ouvrir un canal
 * permanent par lecteur de page ne se justifie pas au volume actuel, et la
 * sobriete fait partie des regles du projet.
 *
 * Affichage optimiste a l'envoi : sur mobile en reseau lent, attendre l'aller
 * retour donne l'impression que le bouton n'a pas fonctionne, et pousse a
 * envoyer deux fois. On affiche donc l'echange tout de suite, et on repart de
 * la verite serveur ensuite.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listerEchanges,
  publierEchange,
  supprimerEchange,
  basculerEchangeUtile,
  type Echange,
  type IntentionEchange,
} from '@/services/echangeService'

export const cleEchanges = (postId: string) => ['echanges', postId] as const

/** Liste des echanges d'une publication. */
export function useEchanges(postId: string | undefined) {
  return useQuery<Echange[], Error>({
    queryKey: cleEchanges(postId ?? ''),
    queryFn: () => listerEchanges(postId!),
    enabled: !!postId,
    staleTime: 30 * 1000,
  })
}

/**
 * Publie un echange, avec affichage optimiste.
 *
 * `auteur` ne sert QU'A l'affichage provisoire. L'identifiant reellement
 * enregistre est lu depuis la session dans le service : la policy RLS exige
 * `auth.uid() = user_id`, et se fier a une valeur passee par le composant
 * faisait echouer l'insertion quand elle etait vide ou perimee.
 */
export function usePublierEchange(
  postId: string,
  auteur: {
    id: string
    pseudo: string | null
    avatar: string | null
  },
) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: { contenu: string; intention: IntentionEchange }) =>
      publierEchange({
        postId,
        contenu: params.contenu,
        intention: params.intention,
      }),

    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: cleEchanges(postId) })
      const precedent = qc.getQueryData<Echange[]>(cleEchanges(postId))

      // Identifiant temporaire : remplace par la vraie ligne au retour serveur.
      const provisoire: Echange = {
        id: `provisoire-${Date.now()}`,
        postId,
        auteurId: auteur.id,
        contenu: params.contenu.trim(),
        intention: params.intention,
        utile: false,
        creeLe: new Date().toISOString(),
        auteurPseudo: auteur.pseudo,
        auteurAvatar: auteur.avatar,
      }
      qc.setQueryData<Echange[]>(cleEchanges(postId), [...(precedent ?? []), provisoire])
      return { precedent }
    },

    // En cas d'echec on remet exactement l'etat d'avant : sans ca, l'echange
    // resterait affiche alors qu'il n'existe pas en base.
    onError: (_err, _params, contexte) => {
      if (contexte?.precedent) qc.setQueryData(cleEchanges(postId), contexte.precedent)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: cleEchanges(postId) })
      // Le compteur du pied de publication vient des posts : on le rafraichit.
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/** Supprime un echange (son auteur, ou la moderation). */
export function useSupprimerEchange(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (echangeId: string) => supprimerEchange(echangeId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cleEchanges(postId) })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/** Distingue un echange utile. Reserve a l'auteur de la publication. */
export function useBasculerEchangeUtile(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (echangeId: string) => basculerEchangeUtile(echangeId),
    onSettled: () => qc.invalidateQueries({ queryKey: cleEchanges(postId) }),
  })
}
