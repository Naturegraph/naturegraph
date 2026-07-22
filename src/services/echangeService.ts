/**
 * echangeService : lecture et ecriture des Echanges sous une publication
 * =============================================================================
 *
 * "Echanges" et non "commentaires" : le mot commentaire est connote et souvent
 * mal vecu (decision Nicolas 2026-07-22). Le vocabulaire suit celui du produit,
 * qui dit deja Migrateurs plutot qu'abonnes et Rencontre Nature plutot que post.
 * La table reste `comments` en base : renommer une table en production pour du
 * vocabulaire ne vaut pas le risque.
 *
 * Securite (regle "securite des le depart") :
 *   - la RLS filtre deja la lecture (echanges visibles seulement sur une
 *     publication accessible, comptes internes exclus) ;
 *   - le serveur refuse un contenu vide ou de plus de 1000 caracteres via un
 *     trigger : les controles ci-dessous sont un confort d'interface, jamais
 *     la seule barriere ;
 *   - la distinction "utile" passe par une RPC, pas par un UPDATE direct : une
 *     policy UPDATE aurait laisse l'auteur d'une publication reecrire le texte
 *     des autres.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

/** A quoi sert l'echange. Guide la personne qui ne sait pas quoi ecrire. */
export type IntentionEchange = 'reaction' | 'identification' | 'info_locale' | 'encouragement'

export const LONGUEUR_MAX_ECHANGE = 1000

export interface Echange {
  id: string
  postId: string
  auteurId: string
  contenu: string
  intention: IntentionEchange
  utile: boolean
  creeLe: string
  auteurPseudo: string | null
  auteurAvatar: string | null
}

/** Ligne brute renvoyee par PostgREST, avec la jointure profil. */
interface LigneEchange {
  id: string
  post_id: string
  user_id: string
  content: string
  intention: string
  helpful: boolean
  created_at: string
  auteur: { username: string | null; avatar_url: string | null } | null
}

function versEchange(row: LigneEchange): Echange {
  return {
    id: row.id,
    postId: row.post_id,
    auteurId: row.user_id,
    contenu: row.content,
    // Une valeur inconnue (ajout futur d'intention, base plus recente que le
    // front) retombe sur 'reaction' plutot que de casser l'affichage.
    intention: (['reaction', 'identification', 'info_locale', 'encouragement'] as const).includes(
      row.intention as IntentionEchange,
    )
      ? (row.intention as IntentionEchange)
      : 'reaction',
    utile: row.helpful,
    creeLe: row.created_at,
    auteurPseudo: row.auteur?.username ?? null,
    auteurAvatar: row.auteur?.avatar_url ?? null,
  }
}

const SELECT_ECHANGE =
  'id, post_id, user_id, content, intention, helpful, created_at, auteur:profiles!user_id(username, avatar_url)'

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Liste les echanges d'une publication, du plus ancien au plus recent.
 *
 * Ordre chronologique volontaire : une discussion se lit dans le sens ou elle
 * s'est deroulee. L'echange distingue "utile" est remonte en tete cote
 * interface, pas ici, pour que la lecture reste comprehensible.
 *
 * Plafond a 200 : au-dela, la page deviendrait lourde. Aucune publication n'en
 * approche aujourd'hui ; le jour ou ca arrive, il faudra paginer.
 */
export async function listerEchanges(postId: string): Promise<Echange[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('comments')
    .select(SELECT_ECHANGE)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as LigneEchange[]).map(versEchange)
}

// ─── Ecriture ─────────────────────────────────────────────────────────────────

/** Ajoute un echange. Le serveur revalide le contenu, quoi qu'envoie le client. */
export async function publierEchange(params: {
  postId: string
  auteurId: string
  contenu: string
  intention: IntentionEchange
}): Promise<Echange> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configure')

  const contenu = params.contenu.trim()
  if (contenu.length === 0) throw new Error('Ton echange est vide')
  if (contenu.length > LONGUEUR_MAX_ECHANGE) {
    throw new Error(`Ton echange depasse ${LONGUEUR_MAX_ECHANGE} caracteres`)
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.postId,
      user_id: params.auteurId,
      content: contenu,
      intention: params.intention,
    })
    .select(SELECT_ECHANGE)
    .single()

  if (error) throw new Error(error.message)
  return versEchange(data as unknown as LigneEchange)
}

/** Supprime un echange. La RLS n'autorise que son auteur ou la moderation. */
export async function supprimerEchange(echangeId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configure')

  const { error } = await supabase.from('comments').delete().eq('id', echangeId)
  if (error) throw new Error(error.message)
}

/**
 * Distingue (ou retire la distinction) d'un echange utile.
 * Reserve a l'auteur de la publication, verifie cote serveur.
 * Retourne le nouvel etat.
 */
export async function basculerEchangeUtile(echangeId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configure')

  const { data, error } = await supabase.rpc('toggle_comment_helpful', {
    p_comment_id: echangeId,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}
