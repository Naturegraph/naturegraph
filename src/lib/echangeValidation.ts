/**
 * echangeValidation : garde-fous sur le texte d'un Echange
 * =============================================================================
 *
 * Regle projet "securite des le depart" : une nouvelle surface d'ecriture
 * publique arrive avec ses garde-fous, pas apres le premier abus.
 *
 * Un echange est le SEUL endroit de l'app ou n'importe qui peut ecrire sous la
 * publication de quelqu'un d'autre. C'est donc la porte d'entree naturelle du
 * spam, et elle s'ouvre au moment ou la communaute est la plus petite, donc la
 * moins capable de s'auto-moderer.
 *
 * CE QU'ON REFUSE, ET POURQUOI
 *
 *   1. LES LIENS. Refuses en bloc. Un echange n'a aucun besoin legitime d'une
 *      URL : les references d'espece viennent de notre propre referentiel, et
 *      le partage d'une publication a son bouton dedie. En face, le lien est le
 *      vecteur numero un du spam et de l'hameconnage. Le cout d'un faux positif
 *      (quelqu'un voulait citer une source) est tres inferieur au cout d'un
 *      faux negatif.
 *
 *   2. LES CARACTERES INVISIBLES ET DE CONTROLE. Ils ne servent qu'a tromper :
 *      un espace de largeur nulle (U+200B) glisse au milieu d'un mot le coupe
 *      en deux pour l'oeil d'un filtre mais pas pour celui du lecteur, et
 *      U+202E INVERSE le sens d'affichage du texte, ce qui permet de faire lire
 *      autre chose que ce qui est reellement stocke. Ils sont RETIRES
 *      silencieusement plutot que refuses : personne ne les tape volontairement,
 *      un message d'erreur serait incomprehensible.
 *
 *   3. LA REPETITION EXCESSIVE. Vingt fois le meme caractere n'est pas un
 *      message, c'est une facon d'occuper l'ecran des autres. Le fil etant
 *      desormais dans la carte de publication, un pave de "aaaa..." pousse tout
 *      le reste hors de vue.
 *
 * CE QU'ON NE FAIT PAS. Aucun filtre de vocabulaire ici : la liste de mots
 * bannis sert aux PSEUDOS, qui sont permanents et publics. Sur un message, elle
 * produirait surtout des faux positifs (noms d'especes, termes naturalistes) et
 * donnerait une fausse impression de securite. L'insulte se traite par le
 * signalement et le masquage automatique, qui eux jugent sur contexte.
 *
 * DOUBLE BARRIERE : ces regles sont repetees dans le trigger
 * `validate_comment_content` cote base. Le controle client informe (message
 * clair, immediat), le controle serveur protege (personne ne passe a cote en
 * appelant l'API directement). Les deux doivent etre modifies ensemble.
 */

export type CodeRefusEchange = 'LIEN_INTERDIT' | 'REPETITION_EXCESSIVE' | 'VIDE'

export class EchangeInvalideError extends Error {
  // Champ declare puis assigne, comme `PostValidationError` : le projet compile
  // avec `erasableSyntaxOnly`, qui interdit les proprietes de constructeur.
  code: CodeRefusEchange
  constructor(code: CodeRefusEchange, message: string) {
    super(message)
    this.name = 'EchangeInvalideError'
    this.code = code
  }
}

/**
 * Caracteres invisibles ou de controle a retirer.
 *
 * Construite depuis les CODE POINTS et jamais depuis des caracteres litteraux :
 * un caractere invisible colle dans un fichier source y est invisible aussi,
 * donc impossible a relire ou a diagnostiquer. Chaque plage est annotee.
 * Retour a la ligne (U+000A) et tabulation (U+0009) sont volontairement
 * CONSERVES.
 */
const PLAGES_INVISIBLES: Array<[number, number]> = [
  [0x01, 0x08], // controle C0 (hors tab et saut de ligne)
  [0x0b, 0x0c], // tabulation verticale, saut de page
  [0x0e, 0x1f], // suite du controle C0
  [0x7f, 0x9f], // DEL et controle C1
  [0x200b, 0x200f], // espaces de largeur nulle et jointeurs
  [0x202a, 0x202e], // marques bidirectionnelles (inversent le sens de lecture)
  [0x2066, 0x2069], // isolants directionnels
  [0xfeff, 0xfeff], // BOM
]

const CARACTERES_INVISIBLES = new RegExp(
  '[' +
    PLAGES_INVISIBLES.map(([a, b]) =>
      a === b
        ? `\\u${a.toString(16).padStart(4, '0')}`
        : `\\u${a.toString(16).padStart(4, '0')}-\\u${b.toString(16).padStart(4, '0')}`,
    ).join('') +
    ']',
  'g',
)

/**
 * Detection de lien, volontairement LARGE.
 *
 * Couvre trois formes : le schema explicite (`https://`, mais aussi
 * `javascript:` ou `data:`), le prefixe `www.`, et le nom de domaine nu
 * (`exemple.com/page`). Cette derniere forme est la plus courante chez les
 * spammeurs, justement parce qu'elle ne ressemble pas a un lien.
 *
 * L'extension est prise dans une liste fermee de TLD courants : cela reconnait
 * `.com` comme `.shop` sans transformer une phrase mal ponctuee
 * ("bonjour.merci") en lien.
 */
const MOTIFS_LIEN: RegExp[] = [
  /[a-z][a-z0-9+.-]*:\/\//i,
  /\b(?:javascript|data|vbscript|file):/i,
  /\bwww\.[a-z0-9-]/i,
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|co|fr|ca|be|ch|eu|info|biz|xyz|top|shop|club|online|site|link|app|dev|me|ly|gl|to|cc|tv|ru|cn)\b/i,
]

/** Au-dela, une suite du meme caractere n'est plus un mot mais du remplissage. */
const REPETITION_MAX = 12

/**
 * Nettoie un texte d'echange sans jamais le refuser.
 *
 * Retire les caracteres invisibles, normalise les fins de ligne et plafonne les
 * lignes vides consecutives : trois retours a la ligne suffisent a separer deux
 * idees, trente servent a pousser le message suivant hors de l'ecran.
 */
export function nettoyerEchange(texte: string): string {
  return texte
    .replace(CARACTERES_INVISIBLES, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Le texte contient-il quelque chose qui ressemble a un lien ? */
export function contientUnLien(texte: string): boolean {
  return MOTIFS_LIEN.some((motif) => motif.test(texte))
}

/**
 * Valide un echange APRES nettoyage. Leve `EchangeInvalideError` au premier
 * probleme, avec un message affichable tel quel.
 *
 * Ne verifie PAS la longueur maximale : elle appartient au service, qui connait
 * `LONGUEUR_MAX_ECHANGE` et affiche un compteur en direct.
 */
export function validerEchange(texte: string): string {
  const propre = nettoyerEchange(texte)

  if (propre.length === 0) {
    throw new EchangeInvalideError('VIDE', 'Ton échange est vide.')
  }

  if (contientUnLien(propre)) {
    throw new EchangeInvalideError(
      'LIEN_INTERDIT',
      'Les liens ne sont pas autorisés dans les échanges. Décris ce que tu as observé, ça vaut mieux qu’une adresse.',
    )
  }

  if (new RegExp(`(.)\\1{${REPETITION_MAX},}`, 'u').test(propre)) {
    throw new EchangeInvalideError(
      'REPETITION_EXCESSIVE',
      'Ton message répète trop de fois le même caractère.',
    )
  }

  return propre
}
