/**
 * Tests des metadonnees Open Graph des publications (NG-013).
 *
 * Pourquoi ces tests existent : `api/post-og.ts` construisait sa description de
 * repli avec `row.description ?? fallback`. Or `??` ne se declenche que sur
 * `null`, et EN BASE aucune description n'est nulle : les publications sans
 * texte portent une CHAINE VIDE. Le repli n'a donc jamais fonctionne, et 25 %
 * des liens partages (27 sur 106) affichaient une description vide sur WhatsApp
 * et iMessage.
 *
 * Le defaut etait invisible : la page s'affichait bien, seul l'apercu du lien
 * etait casse. C'est exactement le genre de bug qu'un test verrouille pour de
 * bon.
 *
 * Le module teste vit hors de `src/`, comme serverMediaMagic.test.ts le fait
 * deja pour une fonction Supabase.
 */

import { describe, it, expect } from 'vitest'
import { texte, descriptionDeRepli } from '../../api/post-og'

describe('texte, normalisation des champs absents', () => {
  it('traite la chaine vide comme une absence (le bug d origine)', () => {
    expect(texte('')).toBeNull()
  })

  it('traite une chaine d espaces comme une absence', () => {
    expect(texte('   ')).toBeNull()
    expect(texte('\n\t ')).toBeNull()
  })

  it('traite null et undefined comme une absence', () => {
    expect(texte(null)).toBeNull()
    expect(texte(undefined)).toBeNull()
  })

  it('conserve un texte reel, en le nettoyant', () => {
    expect(texte('  Un héron au bord du lac  ')).toBe('Un héron au bord du lac')
  })
})

describe('descriptionDeRepli, phrase quand l auteur n a rien ecrit', () => {
  const base = { species_name: 'Héron cendré', city: null, country: null, location_hidden: false }

  it('mentionne l espece et le lieu quand le lieu est visible', () => {
    expect(descriptionDeRepli({ ...base, city: 'La Roche-Bernard' }, 'Papidou')).toBe(
      'Héron cendré observé à La Roche-Bernard, partagé par @Papidou sur Naturegraph.',
    )
  })

  it('n utilise JAMAIS le pays, qui produirait du francais fautif', () => {
    // « à Paris » est correct, « à France » ne l'est pas : les pays exigent des
    // prepositions irregulieres (en France, au Canada). On s'abstient plutot
    // que d'ecrire une faute dans un apercu de lien public.
    expect(descriptionDeRepli({ ...base, country: 'France' }, 'Papidou')).toBe(
      'Héron cendré, une observation partagée par @Papidou sur Naturegraph.',
    )
  })

  it('NE REVELE PAS le lieu si l auteur l a masque', () => {
    // 97 publications sur 106 masquent leur lieu. Un apercu de lien ne doit
    // jamais exposer ce que la personne a volontairement cache dans l app.
    const cachee = { ...base, city: 'La Roche-Bernard', country: 'France', location_hidden: true }
    const resultat = descriptionDeRepli(cachee, 'Papidou')
    expect(resultat).not.toContain('La Roche-Bernard')
    expect(resultat).not.toContain('France')
    expect(resultat).toBe('Héron cendré, une observation partagée par @Papidou sur Naturegraph.')
  })

  it('ignore un lieu vide sans produire une phrase bancale', () => {
    expect(descriptionDeRepli({ ...base, city: '  ', country: '' }, 'Papidou')).toBe(
      'Héron cendré, une observation partagée par @Papidou sur Naturegraph.',
    )
  })

  it('reste correct sans espece identifiee', () => {
    expect(descriptionDeRepli({ ...base, species_name: null, city: 'Paris' }, 'Papidou')).toBe(
      'Découvre cette observation nature partagée par @Papidou sur Naturegraph.',
    )
  })

  it('ne renvoie jamais une phrase vide', () => {
    const vide = { species_name: '', city: '', country: '', location_hidden: null }
    expect(descriptionDeRepli(vide, 'Papidou').length).toBeGreaterThan(0)
  })
})
