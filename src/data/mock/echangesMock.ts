/**
 * Echanges fictifs : jeu d'essai pour juger l'affichage
 * =============================================================================
 *
 * Sert UNIQUEMENT a visualiser le rendu en developpement. Aucune de ces lignes
 * ne va en base : la regle du projet interdit d'inventer des propos et de les
 * attribuer a de vraies personnes, qui les verraient sur leur propre compte.
 *
 * Le jeu couvre volontairement TOUS les etats, y compris les moins flatteurs :
 * message tres long, pseudo a rallonge, echange sans intention. C'est en
 * regardant les cas penibles qu'on voit si une interface tient.
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

const ilYA = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

/** Auteur de la publication fictive, pour tester le badge "Auteur". */
export const AUTEUR_PUBLICATION_MOCK = 'auteur-publication'

export const ECHANGES_MOCK: Echange[] = [
  {
    id: 'e1',
    postId: 'demo',
    auteurId: 'u-claire',
    contenu:
      'Le bec est trop massif pour un héron cendré juvénile, et la calotte est bien noire. Je pencherais pour un bihoreau gris adulte. La photo 2 montre bien l’œil rouge, qui est le meilleur indice.',
    intention: 'identification',
    utile: true,
    creeLe: ilYA(38),
    auteurPseudo: 'Claire_obs',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ confirme: 3, coeur: 1 }),
    maReaction: 'confirme',
  },
  {
    id: 'e2',
    postId: 'demo',
    auteurId: 'u-marie',
    contenu: 'Quelle lumière ! On dirait une peinture.',
    intention: 'reaction',
    utile: false,
    creeLe: ilYA(180),
    auteurPseudo: 'Marie_Nature',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ coeur: 2 }),
    maReaction: null,
  },
  {
    id: 'e3',
    postId: 'demo',
    auteurId: 'u-luc',
    contenu:
      'Il y a une petite colonie installée dans la roselière juste en amont du pont. Le meilleur moment pour les voir est tôt le matin, avant que les kayaks ne passent.',
    intention: 'info_locale',
    utile: false,
    creeLe: ilYA(300),
    auteurPseudo: 'LucDesMarais',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ accord: 1 }),
    maReaction: null,
  },
  {
    id: 'e4',
    postId: 'demo',
    auteurId: AUTEUR_PUBLICATION_MOCK,
    contenu: 'Merci Claire, je n’avais pas pensé au bihoreau. Je corrige l’identification !',
    intention: 'reaction',
    utile: false,
    creeLe: ilYA(20),
    auteurPseudo: 'Papidou',
    auteurAvatar: null,
    parentId: 'e1',
    reactions: reacs({ coeur: 1 }),
    maReaction: null,
  },
  {
    id: 'e5',
    postId: 'demo',
    auteurId: 'u-tom',
    contenu: 'Bravo pour la patience, ces oiseaux ne se laissent pas approcher facilement.',
    intention: 'encouragement',
    utile: false,
    creeLe: ilYA(8),
    auteurPseudo: 'Tom',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs(),
    maReaction: null,
  },
  {
    id: 'e6',
    postId: 'demo',
    auteurId: 'u-long',
    contenu:
      'Petite précision pour celles et ceux que ça intéresse : le bihoreau gris est surtout actif au crépuscule et la nuit, ce qui explique qu’on le voie rarement en pleine journée. En période de nidification il devient plus diurne, car il doit nourrir les jeunes plus souvent. Sa population a beaucoup souffert de l’assèchement des zones humides, et il fait aujourd’hui l’objet d’un suivi particulier dans plusieurs régions. Si tu retournes sur le site, note l’heure et le nombre d’individus : ce sont des données précieuses.',
    intention: 'info_locale',
    utile: false,
    creeLe: ilYA(2),
    auteurPseudo: 'Jean_Philippe_Ornitho_Bretagne',
    auteurAvatar: null,
    parentId: null,
    reactions: reacs({ accord: 4, coeur: 2 }),
    maReaction: null,
  },
  {
    id: 'e7',
    postId: 'demo',
    auteurId: 'u-tom',
    contenu: 'Je confirme aussi, le bihoreau a ce port trapu tres reconnaissable.',
    intention: 'identification',
    utile: false,
    creeLe: ilYA(15),
    auteurPseudo: 'Tom',
    auteurAvatar: null,
    parentId: 'e1',
    reactions: reacs({ confirme: 1 }),
    maReaction: null,
  },
]
