/**
 * grouperParJour : separateurs de date du fil d'Echanges
 * =============================================================================
 *
 * Les maquettes affichent "Hier", "Il y a 3 jours" au-dessus de chaque groupe
 * de messages. Le calcul est isole ici pour etre testable sans monter un
 * composant React, et pour rester unique : deux implementations de "quel jour
 * sommes-nous" finissent toujours par diverger.
 *
 * La comparaison se fait sur le JOUR CIVIL local, pas sur un ecart de 24
 * heures : un message de 23h hier et un de 1h ce matin sont separes de deux
 * heures, mais ne sont pas du meme jour, et c'est bien ce que le lecteur
 * attend.
 */

import type { Echange } from '@/services/echangeService'

export interface GroupeJour {
  /** "Aujourd'hui", "Hier", "Il y a 3 jours", ou une date absolue. */
  libelle: string
  echanges: Echange[]
}

/** Minuit local du jour contenant `date`, pour comparer des jours civils. */
function debutDeJournee(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const MS_PAR_JOUR = 86_400_000

/**
 * Libelle du separateur pour une date donnee.
 *
 * Au-dela d'une semaine on bascule sur la date absolue : "il y a 34 jours" ne
 * dit rien a personne, alors qu'une date se situe immediatement.
 */
export function libelleJour(iso: string, maintenant: Date = new Date()): string {
  const jours = Math.round(
    (debutDeJournee(maintenant) - debutDeJournee(new Date(iso))) / MS_PAR_JOUR,
  )

  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return 'Hier'
  if (jours < 7) return `Il y a ${jours} jours`
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Repartit des echanges en groupes consecutifs partageant le meme jour.
 *
 * L'ordre d'entree est conserve : c'est l'appelant qui decide du tri, pas cette
 * fonction. Deux groupes portant le meme libelle ne peuvent donc pas etre
 * fusionnes a distance, ce qui est voulu, un fil desordonne doit se voir.
 */
export function grouperParJour(echanges: Echange[], maintenant: Date = new Date()): GroupeJour[] {
  const groupes: GroupeJour[] = []

  for (const echange of echanges) {
    const libelle = libelleJour(echange.creeLe, maintenant)
    const dernier = groupes[groupes.length - 1]

    if (dernier && dernier.libelle === libelle) {
      dernier.echanges.push(echange)
    } else {
      groupes.push({ libelle, echanges: [echange] })
    }
  }

  return groupes
}

export interface FilGroupe {
  libelle: string
  fils: { parent: Echange; reponses: Echange[] }[]
}

/**
 * Prepare le fil complet a afficher : groupes de jours, chacun contenant des
 * messages de premier niveau et leurs reponses.
 *
 * DEUX SENS DE LECTURE, volontairement :
 *
 *   - les messages de premier niveau vont du PLUS RECENT au plus ancien, pour
 *     que ce qui vient d'etre dit soit visible sans derouler ;
 *   - les reponses d'un meme message restent du plus ancien au plus recent,
 *     parce qu'une conversation se lit dans l'ordre ou elle s'est tenue.
 *
 * Une reponse n'a jamais son propre separateur de jour : elle appartient
 * visuellement a son parent, meme si elle a ete ecrite trois jours plus tard.
 *
 * @param echanges Liste telle que rendue par le service, du plus ancien au plus
 *                 recent (`order created_at ascending`).
 */
export function construireFils(echanges: Echange[], maintenant: Date = new Date()): FilGroupe[] {
  const racines = echanges.filter((e) => !e.parentId).reverse()

  return grouperParJour(racines, maintenant).map((groupe) => ({
    libelle: groupe.libelle,
    fils: groupe.echanges.map((parent) => ({
      parent,
      reponses: echanges.filter((e) => e.parentId === parent.id),
    })),
  }))
}
