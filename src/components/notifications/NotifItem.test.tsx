/**
 * Tests des helpers partages du centre de notifications (NG-046).
 *
 * Pourquoi ces tests existent : ces deux regles etaient appliquees dans le
 * panneau de la cloche mais PAS dans la page plein ecran, parce que chaque
 * surface avait sa propre copie des helpers. L'utilisateur voyait donc deux
 * centres de notifications differents selon l'endroit ou il regardait.
 *
 * Les copies ont ete fusionnees dans NotifItem. Ces tests verrouillent le
 * comportement attendu pour que la divergence ne puisse pas revenir en
 * silence, ce qui est exactement la facon dont elle etait passee inapercue.
 */

import { describe, it, expect } from 'vitest'
import { getMessage, getReactionLabel } from './NotifItem'

/** Faux `t` : renvoie la cle, et interpole {{count}} comme le ferait i18next. */
const t = (key: string, opts?: Record<string, unknown>): string =>
  opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key

describe('getMessage, regroupement des publications', () => {
  it('reste au singulier pour une seule publication', () => {
    expect(getMessage('post', t, 1)).toBe('home.notifications.messagePost')
  })

  it('reste au singulier quand le compte est omis', () => {
    expect(getMessage('post', t)).toBe('home.notifications.messagePost')
  })

  it('annonce le total quand plusieurs publications sont regroupees', () => {
    // Le defaut historique : la page affichait "a publie" au singulier sous
    // une ligne qui annoncait pourtant plusieurs publications.
    expect(getMessage('post', t, 3)).toBe('home.notifications.messagePostGrouped:3')
  })

  it('ne regroupe que les publications, pas les autres types', () => {
    expect(getMessage('reaction', t, 5)).toBe('home.notifications.messageReaction')
    expect(getMessage('follow', t, 5)).toBe('home.notifications.messageFollow')
  })
})

describe('getReactionLabel, traduction des reactions', () => {
  it('traduit une cle connue en emoji + libelle', () => {
    // Le trigger SQL stocke la cle anglaise brute ("love") dans body :
    // sans traduction, l'utilisateur francophone lisait "love".
    expect(getReactionLabel('love', t)).toBe('❤️ home.post.reactions.love')
  })

  it('affiche l emoji seul pour une reaction legacy retiree du Figma', () => {
    expect(getReactionLabel('disappointed', t)).toBe('😕')
  })

  it('retourne null sur une reaction inconnue, pour ne rien afficher', () => {
    expect(getReactionLabel('inexistante', t)).toBeNull()
  })

  it('retourne null sur un body vide', () => {
    expect(getReactionLabel(null, t)).toBeNull()
    expect(getReactionLabel('', t)).toBeNull()
  })
})
