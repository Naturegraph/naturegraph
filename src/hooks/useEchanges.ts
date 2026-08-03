/**
 * useEchanges : hooks React Query pour les Echanges d'une publication
 * =============================================================================
 *
 * Realtime SOBRE (decision Nicolas 2026-07-30, supersede le "pas de Realtime"
 * du 2026-07-22) : les echanges des AUTRES apparaissent en direct, sans refresh
 * ("je veux voir le compteur monter sans refresh"). Pour rester sobre, on
 * n'ouvre un canal QUE pendant qu'un fil est REELLEMENT ouvert (`useRealtimeEchanges`,
 * cf. bas de fichier), filtre par `post_id`, et on le ferme au demontage. Pas
 * d'abonnement pour chaque post du feed.
 *
 * Affichage optimiste a l'envoi : sur mobile en reseau lent, attendre l'aller
 * retour donne l'impression que le bouton n'a pas fonctionne, et pousse a
 * envoyer deux fois. On affiche donc l'echange tout de suite, et on repart de
 * la verite serveur ensuite.
 */

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  listerEchanges,
  publierEchange,
  supprimerEchange,
  modifierEchange,
  basculerEchangeUtile,
  basculerReactionEchange,
  phraseGenerique,
  type Echange,
  type IntentionEchange,
  type TypeReactionEchange,
  type SuggestionEspece,
} from '@/services/echangeService'

export const cleEchanges = (postId: string) => ['echanges', postId] as const

// Topic unique par abonnement : jamais de reutilisation d'un canal deja
// souscrit (meme garde-fou que useNotifications, sinon supabase-js jette).
let realtimeEchSeq = 0

/**
 * Abonnement Realtime au fil d'echanges D'UN post, actif seulement tant que le
 * composant appelant est monte (donc tant que le fil est ouvert). A tout
 * changement sur `comments` de ce post (nouvel echange, edition, suppression),
 * on invalide le fil ET les compteurs (post + feed) : le 💬 monte/descend en
 * direct, meme quand c'est un autre utilisateur.
 *
 * `comment_reactions` n'est pas dans la publication realtime : les reactions
 * d'echange ne sont donc pas live (l'optimistic couvre les siennes).
 */
export function useRealtimeEchanges(postId: string | undefined): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!postId || !isSupabaseConfigured || !supabase) return
    realtimeEchSeq += 1
    const channel = supabase
      .channel(`echanges:${postId}:${realtimeEchSeq}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => {
          qc.invalidateQueries({ queryKey: cleEchanges(postId) })
          qc.invalidateQueries({ queryKey: ['post', postId] })
          qc.invalidateQueries({ queryKey: ['feed'] })
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [postId, qc])
}

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
    mutationKey: ['echange', 'publier'],
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
        // Meme repli que le service (SOURCE UNIQUE phraseGenerique) : sans ce
        // texte, une suggestion sans mot afficherait une bulle vide pendant
        // l'aller-retour serveur, et avec un libelle DIFFERENT du serveur elle
        // "sauterait" au remplacement de l'optimistic.
        contenu: params.contenu.trim() || phraseGenerique(params.suggestion ?? null),
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
      // Le compteur du pied de publication (💬 N) vient du post. On rafraichit
      // TOUTES ses sources : le detail (`post`/`posts`) ET le FEED (`feed`).
      // Sans `feed`, le compteur ne montait pas quand on echangeait depuis le
      // fil d'actualite -> l'utilisateur devait refresh (retour Nicolas
      // 2026-07-30 "je veux voir le compteur monter sans refresh").
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
      qc.invalidateQueries({ queryKey: ['feed'] })
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
    mutationKey: ['echange', 'modifier'],
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
    mutationKey: ['echange', 'supprimer'],
    mutationFn: (echangeId: string) => supprimerEchange(echangeId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cleEchanges(postId) })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
      // Idem ajout : le compteur du feed doit redescendre sans refresh.
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/** Distingue un echange utile. Reserve a l'auteur de la publication. */
export function useBasculerEchangeUtile(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationKey: ['echange', 'utile'],
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
    mutationKey: ['echange', 'reaction'],
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
