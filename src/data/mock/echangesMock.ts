/**
 * Echanges fictifs : jeu d'essai pour juger l'affichage
 * =============================================================================
 *
 * Sert UNIQUEMENT a visualiser le rendu en developpement. Aucune de ces lignes
 * ne va en base : la regle du projet interdit d'inventer des propos et de les
 * attribuer a de vraies personnes, qui les verraient sur leur propre compte.
 *
 * Le jeu couvre volontairement TOUS les etats, y compris les moins flatteurs :
 * message tres long, pseudo a rallonge, message sans aucune reaction. C'est en
 * regardant les cas penibles qu'on voit si une interface tient.
 *
 * Les messages sont ordonnes du PLUS ANCIEN au plus recent, comme les renvoie
 * le service, et etales sur plusieurs jours pour exercer les separateurs de
 * date ("Il y a 3 jours", "Hier", "Aujourd'hui").
 */

import type { Echange, TypeReactionEchange } from '@/services/echangeService'

/** Raccourci : compteurs de reactions, tout a zero sauf ce qu'on precise. */
const reacs = (
  p: Partial<Record<TypeReactionEchange, number>> = {},
): Record<TypeReactionEchange, number> => ({
  coeur: 0,
  accord: 0,
  confirme: 0,
  ...p,
})

const ilYAMinutes = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

/** Meme heure un jour donne dans le passe, pour tomber franchement dans un jour civil. */
const ilYAJours = (jours: number, heure = 14) => {
  const d = new Date()
  d.setDate(d.getDate() - jours)
  d.setHours(heure, 30, 0, 0)
  return d.toISOString()
}

/** Auteur de la publication fictive, pour tester le badge "Auteur". */
export const AUTEUR_PUBLICATION_MOCK = 'auteur-publication'

export const ECHANGES_MOCK: Echange[] = [
  // ── Il y a 3 jours ──
  {
    id: 'e3',
    postId: 'demo',
    auteurId: 'u-luc',
    contenu:
      'Il y a une petite colonie installée dans la roselière juste en amont du pont. Le meilleur moment pour les voir est tôt le matin, avant que les kayaks ne passent.',
    intention: 'info_locale',
    utile: false,
    creeLe: ilYAJours(3, 9),
    auteurPseudo: 'LucDesMarais',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 1 }),
    maReaction: null,
    suggestion: null,
  },

  // ── Hier ──
  {
    id: 'e6',
    postId: 'demo',
    auteurId: 'u-long',
    contenu:
      // Volontairement proche de la limite (475 / 500) : c'est le cas qui
      // montre si une bulle tient encore sur un ecran de 375px.
      'Petite précision pour celles et ceux que ça intéresse : le bihoreau gris est surtout actif au crépuscule et la nuit, ce qui explique qu’on le voie rarement en pleine journée. En période de nidification il devient plus diurne. Sa population a beaucoup souffert de l’assèchement des zones humides, et il fait aujourd’hui l’objet d’un suivi particulier dans plusieurs régions. Si tu retournes sur le site, note l’heure et le nombre d’individus : ce sont des données précieuses.',
    intention: 'info_locale',
    utile: false,
    creeLe: ilYAJours(1, 11),
    auteurPseudo: 'Jean_Philippe_Ornitho_Bretagne',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 6 }),
    maReaction: 'coeur',
    suggestion: null,
  },
  {
    // Message court et sans aucune reaction : verifie que la bulle tient sur
    // une seule ligne sans paraitre vide.
    id: 'e2',
    postId: 'demo',
    auteurId: 'u-marie',
    contenu: 'Quelle lumière ! On dirait une peinture.',
    intention: 'reaction',
    utile: false,
    creeLe: ilYAJours(1, 19),
    auteurPseudo: 'Marie_Nature',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs(),
    maReaction: null,
    suggestion: null,
  },

  // ── Aujourd'hui ──
  {
    id: 'e1',
    postId: 'demo',
    auteurId: 'u-claire',
    contenu:
      'Le bec est trop massif pour un héron cendré juvénile, et la calotte est bien noire. Je pencherais pour un bihoreau gris adulte. La photo 2 montre bien l’œil rouge, qui est le meilleur indice.',
    intention: 'identification',
    utile: false,
    creeLe: ilYAMinutes(38),
    auteurPseudo: 'Claire_obs',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 4 }),
    maReaction: null,
    suggestion: null,
  },
  {
    id: 'e4',
    postId: 'demo',
    auteurId: AUTEUR_PUBLICATION_MOCK,
    contenu: 'Merci Claire, je n’avais pas pensé au bihoreau. Je corrige l’identification !',
    intention: 'reaction',
    utile: false,
    creeLe: ilYAMinutes(20),
    auteurPseudo: 'Papidou',
    auteurAvatar: null,
    parentId: 'e1',
    reactions: reacs({ coeur: 1 }),
    maReaction: null,
    suggestion: null,
  },
  {
    // Suggestion d'espece AVEC un mot de la personne : le cas complet.
    id: 'e7',
    postId: 'demo',
    auteurId: 'u-tom',
    contenu: 'Je confirme aussi, le bihoreau a ce port trapu très reconnaissable.',
    intention: 'identification',
    utile: false,
    creeLe: ilYAMinutes(15),
    auteurPseudo: 'Tom',
    auteurAvatar: null,
    parentId: 'e1',
    reactions: reacs(),
    maReaction: null,
    suggestion: {
      label: 'Bihoreau gris',
      scientifique: 'Nycticorax nycticorax',
      noeudId: null,
      confiance: 4,
    },
  },
  {
    id: 'e5',
    postId: 'demo',
    auteurId: 'u-tom',
    contenu: 'Bravo pour la patience, ces oiseaux ne se laissent pas approcher facilement.',
    intention: 'encouragement',
    utile: false,
    creeLe: ilYAMinutes(8),
    auteurPseudo: 'Tom',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 2 }),
    maReaction: null,
    suggestion: null,
  },
  {
    // Suggestion SANS commentaire : le texte est la phrase generique posee par
    // le service. Verifie que le message se lit tout seul.
    id: 'e8',
    postId: 'demo',
    auteurId: 'u-claire',
    contenu: 'Je pense qu’il s’agit plutôt de : Héron cendré',
    intention: 'identification',
    utile: false,
    creeLe: ilYAMinutes(4),
    auteurPseudo: 'Claire_obs',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs(),
    maReaction: null,
    suggestion: {
      label: 'Héron cendré',
      scientifique: 'Ardea cinerea',
      noeudId: null,
      confiance: 1,
    },
  },
  {
    // Les quatre niveaux de confiance doivent etre visibles cote a cote pour
    // juger la gamme de couleurs : voici "Assez sûr" et "Très sûr".
    id: 'e9',
    postId: 'demo',
    auteurId: 'u-marie',
    contenu: 'La silhouette au repos me fait plutôt penser à celui-ci.',
    intention: 'identification',
    utile: false,
    creeLe: ilYAMinutes(3),
    auteurPseudo: 'Marie_Nature',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 1 }),
    maReaction: null,
    suggestion: {
      label: 'Butor étoilé',
      scientifique: 'Botaurus stellaris',
      noeudId: null,
      confiance: 2,
    },
  },
  {
    id: 'e10',
    postId: 'demo',
    auteurId: 'u-luc',
    contenu: 'Je pense qu’il s’agit plutôt de : Blongios nain',
    intention: 'identification',
    utile: false,
    creeLe: ilYAMinutes(2),
    auteurPseudo: 'LucDesMarais',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs(),
    maReaction: null,
    suggestion: {
      label: 'Blongios nain',
      scientifique: 'Ixobrychus minutus',
      noeudId: null,
      confiance: 3,
    },
  },
]
