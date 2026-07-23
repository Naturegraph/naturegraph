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
 *   - le serveur refuse un contenu vide ou de plus de 500 caracteres via un
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

/**
 * Longueur maximale d'un echange (decision Nicolas 2026-07-22).
 *
 * 500 et non 1000 : la limite haute autorisait des pavés qui deforment le fil,
 * alors que 500 laissent la place a une identification argumentee tout en
 * gardant des messages lisibles d'un coup d'oeil sur mobile.
 *
 * Valeur DUPLIQUEE volontairement cote base (trigger `validate_comment_content`)
 * : le controle client informe, le controle serveur protege. Les deux doivent
 * etre modifies ensemble.
 */
export const LONGUEUR_MAX_ECHANGE = 500

/**
 * Reactions possibles sur un echange.
 *
 * Jeu volontairement COURT, et different des 5 reactions des publications : sur
 * un message, trois choix suffisent et evitent la barre d'emojis a rallonge.
 * `confirme` a une vraie valeur naturaliste : confirmer une identification
 * proposee par quelqu'un d'autre est un acte de la communaute, pas un like.
 */
export type TypeReactionEchange = 'coeur' | 'accord' | 'confirme'

export const REACTIONS_ECHANGE: Array<{
  cle: TypeReactionEchange
  emoji: string
  libelle: string
}> = [
  { cle: 'coeur', emoji: '❤️', libelle: 'Merci' },
  { cle: 'accord', emoji: '👍', libelle: 'D’accord' },
  { cle: 'confirme', emoji: '✅', libelle: 'Je confirme' },
]

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
  /** `null` = echange de premier niveau ; sinon, reponse a cet echange. */
  parentId: string | null
  /** Nombre de reactions par type, pour l'affichage des compteurs. */
  reactions: Record<TypeReactionEchange, number>
  /** Reaction posee par la personne connectee, `null` si aucune. */
  maReaction: TypeReactionEchange | null
  /** Suggestion d'espece attachee au message, `null` si c'est un simple texte. */
  suggestion: SuggestionEspece | null
}

/**
 * Niveaux de confiance d'une suggestion d'identification.
 *
 * Quatre paliers et pas davantage : au-dela, personne ne sait plus choisir, et
 * la nuance devient du bruit. L'ordre va du plus prudent au plus affirme, ce
 * qui est aussi l'ordre dans lequel on ose s'exprimer quand on debute.
 *
 * L'entier est ce qui part en base ; il permet de trier et de comparer deux
 * suggestions sans dependre du libelle affiche.
 */
export const NIVEAUX_CONFIANCE = [
  { valeur: 1, libelle: 'Pas sûr' },
  { valeur: 2, libelle: 'Assez sûr' },
  { valeur: 3, libelle: 'Très sûr' },
  { valeur: 4, libelle: 'Certain' },
] as const

export type NiveauConfiance = (typeof NIVEAUX_CONFIANCE)[number]['valeur']

export function libelleConfiance(valeur: number): string {
  return NIVEAUX_CONFIANCE.find((n) => n.valeur === valeur)?.libelle ?? 'Pas sûr'
}

export interface SuggestionEspece {
  /** Nom affiche, tel que choisi au moment de la suggestion. */
  label: string
  /** Nom scientifique, affiche en second et en italique. */
  scientifique: string | null
  /** Lien vers le referentiel, `null` si le taxon a disparu depuis. */
  noeudId: string | null
  confiance: NiveauConfiance
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
  parent_id: string | null
  auteur: { username: string | null; avatar_url: string | null } | null
  reactions: Array<{ type: string; user_id: string }>
  species_label: string | null
  species_scientific: string | null
  taxonomy_node_id: string | null
  confidence: number | null
}

function versEchange(row: LigneEchange, moi: string | null): Echange {
  const compte: Record<TypeReactionEchange, number> = { coeur: 0, accord: 0, confirme: 0 }
  let maReaction: TypeReactionEchange | null = null
  for (const r of row.reactions ?? []) {
    if (r.type in compte) {
      compte[r.type as TypeReactionEchange] += 1
      if (moi && r.user_id === moi) maReaction = r.type as TypeReactionEchange
    }
  }

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
    parentId: row.parent_id,
    reactions: compte,
    maReaction,
    // La contrainte `comments_suggestion_complete` garantit que les deux champs
    // sont poses ensemble ; on reverifie ici pour ne pas dependre d'une regle
    // ecrite ailleurs, et pour rester robuste a une ligne ancienne.
    suggestion:
      row.species_label && row.confidence
        ? {
            label: row.species_label,
            scientifique: row.species_scientific,
            noeudId: row.taxonomy_node_id,
            confiance: Math.min(4, Math.max(1, row.confidence)) as NiveauConfiance,
          }
        : null,
  }
}

const SELECT_ECHANGE =
  'id, post_id, user_id, content, intention, helpful, created_at, parent_id, ' +
  'species_label, species_scientific, taxonomy_node_id, confidence, ' +
  'auteur:profiles!user_id(username, avatar_url), reactions:comment_reactions(type, user_id)'

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

  // Identifiant du lecteur : sert uniquement a savoir quelle reaction il a
  // deja posee. Un visiteur sans compte lit la conversation normalement.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('comments')
    .select(SELECT_ECHANGE)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as LigneEchange[]).map((r) => versEchange(r, user?.id ?? null))
}

// ─── Ecriture ─────────────────────────────────────────────────────────────────

/**
 * Phrase posee a la place du texte quand on suggere une espece sans rien
 * ecrire.
 *
 * Publier un message vide surmonte d'une pastille laisserait un blanc bizarre
 * dans le fil ; obliger a ecrire ajouterait un frein juste avant le geste
 * utile. La phrase generique tranche : le message se lit tout seul, et qui veut
 * argumenter le remplace par ses propres mots.
 */
function phraseGenerique(suggestion: SuggestionEspece | null): string {
  if (!suggestion) return ''
  return `Je pense qu’il s’agit plutôt de : ${suggestion.label}`
}

/**
 * Ajoute un echange. Le serveur revalide le contenu, quoi qu'envoie le client.
 *
 * L'auteur est lu depuis la SESSION au moment de l'envoi, jamais recu en
 * parametre. La policy RLS exige `auth.uid() = user_id` : passer l'identifiant
 * depuis le composant laissait la porte ouverte a une valeur vide ou perimee,
 * et l'insertion echouait avec "new row violates row-level security policy"
 * (constate en dev le 2026-07-22). Lire la session ici garantit que les deux
 * valeurs coincident toujours.
 */
export async function publierEchange(params: {
  postId: string
  contenu: string
  intention: IntentionEchange
  /** Renseigne pour une REPONSE. Un seul niveau, verifie par trigger. */
  parentId?: string | null
  /** Suggestion d'espece attachee, pour un echange d'identification. */
  suggestion?: SuggestionEspece | null
}): Promise<Echange> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configure')

  const suggestion = params.suggestion ?? null

  // Une suggestion sans un mot de la personne reste comprehensible grace a la
  // phrase generique : mieux vaut un message complet qu'un champ obligatoire de
  // plus a remplir avant de pouvoir aider.
  const contenu = (params.contenu.trim() || phraseGenerique(suggestion)).trim()

  if (contenu.length === 0) throw new Error('Ton echange est vide')
  if (contenu.length > LONGUEUR_MAX_ECHANGE) {
    throw new Error(`Ton echange depasse ${LONGUEUR_MAX_ECHANGE} caracteres`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Il faut etre connecte pour echanger')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.postId,
      user_id: user.id,
      content: contenu,
      intention: params.intention,
      parent_id: params.parentId ?? null,
      species_label: suggestion?.label ?? null,
      species_scientific: suggestion?.scientifique ?? null,
      taxonomy_node_id: suggestion?.noeudId ?? null,
      confidence: suggestion?.confiance ?? null,
    })
    .select(SELECT_ECHANGE)
    .single()

  if (error) throw new Error(error.message)
  return versEchange(data as unknown as LigneEchange, user.id)
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

/**
 * Pose, change ou retire sa reaction sur un echange.
 *
 * Une seule reaction par personne et par echange (cle primaire composee) :
 * on change d'avis, on n'empile pas. Recliquer sur la meme la retire.
 */
export async function basculerReactionEchange(
  echangeId: string,
  type: TypeReactionEchange,
  actuelle: TypeReactionEchange | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configure')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Il faut etre connecte pour reagir')

  if (actuelle === type) {
    const { error } = await supabase
      .from('comment_reactions')
      .delete()
      .eq('comment_id', echangeId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from('comment_reactions')
    .upsert({ comment_id: echangeId, user_id: user.id, type }, { onConflict: 'comment_id,user_id' })
  if (error) throw new Error(error.message)
}
