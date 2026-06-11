/**
 * postValidation — Source de verite unique des regles de contenu d'un post
 * =========================================================================
 *
 * Retour testeur (naelm_photo, 2026-06-11) : on pouvait
 *   1. saisir un titre > 160 caracteres -> erreur SQL brute exposee a l'user
 *      (« value too long for type character varying(160) »),
 *   2. publier une Rencontre totalement vide (ni photo, ni espece, ni texte).
 *
 * Principe « defense en profondeur » :
 *   - FRONT  : le formulaire borne la saisie (maxLength) + bloque le bouton
 *              Publier tant que le contenu minimum n'est pas la (UX claire).
 *   - SERVICE: createPost() appelle validatePostContent() AVANT l'INSERT, donc
 *              on ne « ping » jamais la DB avec un payload invalide (et on ne
 *              laisse JAMAIS fuiter un message d'erreur technique cote client).
 *   - DB     : la colonne posts.title reste varchar(160) = dernier rempart.
 *
 * Ce module est volontairement « pur » (aucune dependance React/i18n) pour
 * etre reutilisable cote service comme cote composant. Les messages par defaut
 * sont en francais (langue primaire de l'app) ; le formulaire peut surcharger
 * avec ses propres libelles i18n via les memes constantes POST_LIMITS.
 */

/** Bornes de contenu, alignees sur le schema DB (posts.title = varchar(160)). */
export const POST_LIMITS = {
  /** Longueur max du titre. DOIT rester <= a la colonne varchar DB (160). */
  TITLE_MAX: 160,
  /** Longueur max de la description. Cap applicatif (UX + sobriete). */
  DESCRIPTION_MAX: 1500,
} as const

/**
 * Codes de validation stables (pour mapping i18n cote UI si besoin). Le
 * `message` porte un libelle FR par defaut, sur, jamais technique.
 */
export type PostValidationCode = 'TITLE_TOO_LONG' | 'DESCRIPTION_TOO_LONG' | 'EMPTY_POST'

/**
 * Erreur de validation « metier » : son message est ECRIT PAR NOUS, donc sur
 * a afficher tel quel (contrairement a une erreur SQL/PostgREST brute). Le
 * pipeline de submit la reconnait via `instanceof` pour la laisser passer
 * sans la remplacer par un message generique.
 */
export class PostValidationError extends Error {
  code: PostValidationCode
  constructor(code: PostValidationCode, message: string) {
    super(message)
    this.name = 'PostValidationError'
    this.code = code
  }
}

/** Champs minimaux a evaluer pour decider si un post a du contenu reel. */
export interface PostContentFlags {
  title?: string | null
  description?: string | null
  /** true si au moins une photo sera attachee (connue du caller, pas de la DB). */
  hasMedia?: boolean
  /** true si au moins une espece est renseignee (post.species_name). */
  hasSpecies?: boolean
  /**
   * Active la regle « contenu minimum » (defaut: true). Le service createPost
   * la met a `false` : il ne connait pas les photos (uploadees apres l'INSERT)
   * donc ne peut pas juger du vide de maniere fiable. Le rempart « non vide »
   * vit dans le hook de submit + le formulaire, qui eux connaissent `files`.
   * Le service garde quand meme les controles de LONGUEUR (titre/description).
   */
  enforceNonEmpty?: boolean
}

/**
 * Valide le contenu d'un post AVANT l'ecriture. Leve `PostValidationError`
 * (message FR sur) au premier probleme rencontre. Ne touche jamais le reseau.
 *
 * Regles :
 *   - titre        : <= POST_LIMITS.TITLE_MAX caracteres (apres trim).
 *   - description  : <= POST_LIMITS.DESCRIPTION_MAX caracteres (apres trim).
 *   - contenu mini : au moins UN parmi { photo, espece, titre, description }.
 *                    Un post strictement vide n'a aucun interet et polluerait
 *                    le feed (retour testeur : post 995db867 publie vide).
 */
export function validatePostContent(flags: PostContentFlags): void {
  const title = (flags.title ?? '').trim()
  const description = (flags.description ?? '').trim()

  if (title.length > POST_LIMITS.TITLE_MAX) {
    throw new PostValidationError(
      'TITLE_TOO_LONG',
      `Le titre ne peut pas depasser ${POST_LIMITS.TITLE_MAX} caracteres.`,
    )
  }

  if (description.length > POST_LIMITS.DESCRIPTION_MAX) {
    throw new PostValidationError(
      'DESCRIPTION_TOO_LONG',
      `La description ne peut pas depasser ${POST_LIMITS.DESCRIPTION_MAX} caracteres.`,
    )
  }

  const enforceNonEmpty = flags.enforceNonEmpty !== false
  const hasContent =
    !!flags.hasMedia || !!flags.hasSpecies || title.length > 0 || description.length > 0
  if (enforceNonEmpty && !hasContent) {
    throw new PostValidationError(
      'EMPTY_POST',
      'Ajoute au moins une photo, une espece ou une description avant de publier.',
    )
  }
}
