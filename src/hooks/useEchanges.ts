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
  modifierEchange,
  basculerEchangeUtile,
  basculerReactionEchange,
  type Echange,
  type IntentionEchange,
  type TypeReactionEchange,
  type SuggestionEspece,
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
    mutationFn: (params: {
      contenu: string
      intention: IntentionEchange
      parentId?: string | null
      suggestion?: SuggestionEspece | null
    }) =>
      publierEchange({
        postId,
        contenu: params.contenu,
        intention: params.intention,
        parentId: params.parentId,
        suggestion: params.suggestion,
      }),

    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: cleEchanges(postId) })
      const precedent = qc.getQueryData<Echange[]>(cleEchanges(postId))

      // Identifiant temporaire : remplace par la vraie ligne au retour serveur.
      const provisoire: Echange = {
        id: `provisoire-${Date.now()}`,
        postId,
        auteurId: auteur.id,
        // Meme repli que le service : sans ce texte, une suggestion sans mot
        // afficherait une bulle vide pendant l'aller-retour serveur.
        contenu:
          params.contenu.trim() ||
          (params.suggestion ? `Je pense qu’il s’agit plutôt de : ${params.suggestion.label}` : ''),
        intention: params.intention,
        utile: false,
        creeLe: new Date().toISOString(),
        auteurPseudo: auteur.pseudo,
        auteurAvatar: auteur.avatar,
        parentId: params.parentId ?? null,
        reactions: { coeur: 0, accord: 0, confirme: 0 },
        maReaction: null,
        suggestion: params.suggestion ?? null,
        modifieLe: null,
        etatModeration: 'visible',
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

/**
 * Modifie le texte d'un echange (son auteur uniquement).
 *
 * Mise a jour OPTIMISTE : le texte corrige apparait immediatement. Attendre
 * l'aller-retour donnerait l'impression que la correction n'a pas ete prise,
 * et pousserait a cliquer deux fois.
 */
export function useModifierEchange(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ echangeId, contenu }: { echangeId: string; contenu: string }) =>
      modifierEchange(echangeId, contenu),

    onMutate: async ({ echangeId, contenu }) => {
      await qc.cancelQueries({ queryKey: cleEchanges(postId) })
      const precedent = qc.getQueryData<Echange[]>(cleEchanges(postId))
      qc.setQueryData<Echange[]>(cleEchanges(postId), (liste) =>
        (liste ?? []).map((e) =>
          e.id === echangeId
            ? { ...e, contenu: contenu.trim(), modifieLe: new Date().toISOString() }
            : e,
        ),
      )
      return { precedent }
    },

    onError: (_err, _params, contexte) => {
      if (contexte?.precedent) qc.setQueryData(cleEchanges(postId), contexte.precedent)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: cleEchanges(postId) }),
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

/**
 * Pose, change ou retire sa reaction sur un echange.
 *
 * Affichage optimiste : sur mobile, attendre l'aller retour pour voir un emoji
 * changer d'etat donne l'impression que le clic n'a pas pris.
 */
export function useBasculerReactionEchange(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: {
      echangeId: string
      type: TypeReactionEchange
      actuelle: TypeReactionEchange | null
    }) => basculerReactionEchange(p.echangeId, p.type, p.actuelle),

    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: cleEchanges(postId) })
      const precedent = qc.getQueryData<Echange[]>(cleEchanges(postId))

      qc.setQueryData<Echange[]>(cleEchanges(postId), (liste) =>
        (liste ?? []).map((e) => {
          if (e.id !== p.echangeId) return e
          const compte = { ...e.reactions }
          if (e.maReaction) compte[e.maReaction] = Math.max(0, compte[e.maReaction] - 1)
          const retire = e.maReaction === p.type
          if (!retire) compte[p.type] += 1
          return { ...e, reactions: compte, maReaction: retire ? null : p.type }
        }),
      )
      return { precedent }
    },

    onError: (_e, _p, ctx) => {
      if (ctx?.precedent) qc.setQueryData(cleEchanges(postId), ctx.precedent)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: cleEchanges(postId) }),
  })
}
